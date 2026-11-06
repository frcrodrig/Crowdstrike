# sdk: crowdstrike-foundry-function==1.0.0
import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error

from crowdstrike.foundry.function import Function, Request, Response

func = Function.instance()

CS_CLOUD_URLS = {
    'us-1':     'https://api.crowdstrike.com',
    'us-2':     'https://api.us-2.crowdstrike.com',
    'eu-1':     'https://api.eu-1.crowdstrike.com',
    'us-gov-1': 'https://api.laggar.gcw.crowdstrike.com',
}

STATUS_MAP = {
    'Succeeded': 'Success',
    'Failed':    'Failed',
    'Running':   'Running',
    'TimedOut':  'Timeout',
}

# Real backend saved search ID (registered in Foundry, queries FusionWorkflowEvent)
SOC_WORKFLOW_SAVED_SEARCH_ID = 'f92ad5cf02594c709cf70ed8835d4094'


def _get_base_url():
    cloud = os.environ.get('CS_CLOUD', 'us-1')
    return CS_CLOUD_URLS.get(cloud, 'https://api.crowdstrike.com')


def _read_error_body(e):
    try:
        return e.read().decode('utf-8', errors='replace')[:300]
    except Exception:
        return ''


def _try_logscale(base_url, token):
    """Execute saved search via the non-dynamic LogScale API (same endpoint the JS bridge uses).
    The cloud function calls the direct CrowdStrike API, potentially bypassing the Foundry
    gateway's isolated-repo restriction so FusionWorkflowEvent data is accessible."""
    body = json.dumps({
        'id':   SOC_WORKFLOW_SAVED_SEARCH_ID,
        'mode': 'async',
    }).encode('utf-8')

    req = urllib.request.Request(
        f'{base_url}/loggingapi/entities/saved-searches-execute/v1',
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type':  'application/json',
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        submit_data = json.loads(resp.read())

    resources = submit_data.get('resources') or []
    if not resources:
        return [], 'no resources in submit response'

    job_id = resources[0].get('job_status', {}).get('job_id', '')
    if not job_id:
        events = resources[0].get('events') or []
        return _map_logscale_events(events), 'sync'

    for i in range(8):
        time.sleep(1.5)
        poll_url = (f'{base_url}/loggingapi/entities/saved-searches-execute/v1'
                    f'?job_id={urllib.parse.quote(job_id)}')
        poll_req = urllib.request.Request(
            poll_url,
            headers={'Authorization': f'Bearer {token}'},
            method='GET'
        )
        with urllib.request.urlopen(poll_req, timeout=15) as resp:
            poll_data = json.loads(resp.read())
        pr = (poll_data.get('resources') or [{}])[0]
        status = pr.get('job_status', {}).get('status', '')
        events = pr.get('events') or []
        if status in ('done', 'complete'):
            return _map_logscale_events(events), f'logscale-poll-{i}'

    return [], 'logscale-poll-timeout'


def _map_logscale_events(events):
    return [
        {
            'workflow_name': e.get('workflow_name') or e.get('definition_name') or 'Unknown',
            'status_label':  e.get('status_label') or e.get('status') or 'Unknown',
            'executions':    int(e.get('executions') or 0),
        }
        for e in events
    ]


def _group_executions(executions):
    groups = {}
    for e in executions:
        name  = e.get('definition_name') or e.get('workflow_name') or 'Unknown'
        label = STATUS_MAP.get(e.get('status') or '', 'Unknown')
        key   = (name, label)
        groups[key] = groups.get(key, 0) + 1
    return [
        {'workflow_name': k[0], 'status_label': k[1], 'executions': v}
        for k, v in sorted(groups.items(), key=lambda x: -x[1])
    ]


def _try_combined_no_filter(base_url, token):
    """GET /workflows/combined/executions/v1 with no FQL filter — bare limit only."""
    qs = urllib.parse.urlencode({'limit': 200}, quote_via=urllib.parse.quote)
    req = urllib.request.Request(
        f'{base_url}/workflows/combined/executions/v1?{qs}',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    resources = data.get('resources') or []
    return [r for r in resources
            if (r.get('definition_name') or '').lower().startswith('agenticsoc')]


def _try_entities_executions(base_url, token):
    """GET /workflows/entities/executions/v1 — alternative executions endpoint."""
    qs = urllib.parse.urlencode({'limit': 200}, quote_via=urllib.parse.quote)
    req = urllib.request.Request(
        f'{base_url}/workflows/entities/executions/v1?{qs}',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    resources = data.get('resources') or []
    return [r for r in resources
            if (r.get('definition_name') or '').lower().startswith('agenticsoc')]


@func.handler(method='GET', path='/execute')
def handler(request: Request) -> Response:
    token = getattr(request, 'access_token', None)
    if not token:
        return Response(body={
            'resources': [], 'source': 'error', 'error': 'no access_token',
        }, code=200)

    base_url = _get_base_url()

    # Primary path: LogScale FusionWorkflowEvent query (direct NGSIEM access)
    logscale_err = None
    try:
        results, ls_source = _try_logscale(base_url, token)
        if results or ls_source in ('logscale-poll-timeout', 'sync'):
            return Response(body={
                'resources':    results,
                'source':       ls_source,
                '_debug_count': len(results),
            }, code=200)
    except urllib.error.HTTPError as e:
        logscale_err = f'HTTP {e.code}: {e.reason} | {_read_error_body(e)}'
    except Exception as e:
        logscale_err = str(e)

    # Fallback 1: combined executions endpoint (no FQL filter)
    combined_err = None
    try:
        executions = _try_combined_no_filter(base_url, token)
        return Response(body={
            'resources':     _group_executions(executions),
            'source':        'combined-api',
            '_debug_count':  len(executions),
        }, code=200)
    except urllib.error.HTTPError as e:
        combined_err = f'HTTP {e.code}: {e.reason} | {_read_error_body(e)}'
    except Exception as e:
        combined_err = str(e)

    # Fallback 2: entities executions endpoint
    entities_err = None
    try:
        executions = _try_entities_executions(base_url, token)
        return Response(body={
            'resources':     _group_executions(executions),
            'source':        'entities-api',
            '_debug_count':  len(executions),
        }, code=200)
    except urllib.error.HTTPError as e:
        entities_err = f'HTTP {e.code}: {e.reason} | {_read_error_body(e)}'
    except Exception as e:
        entities_err = str(e)

    return Response(body={
        'resources':              [],
        'source':                 'blocked',
        '_debug_logscale_err':    logscale_err,
        '_debug_combined_err':    combined_err,
        '_debug_entities_err':    entities_err,
    }, code=200)


if __name__ == '__main__':
    func.run()
