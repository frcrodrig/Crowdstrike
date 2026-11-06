# sdk: crowdstrike-foundry-function==1.0.0
# Open Cases widget — backs soc_open_cases.
# Calls Message Center API (/message-center/*), which is the public API that
# backs the Falcon XDR Cases page (https://.../xdr/cases).
import json
import os
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

# Message Center case statuses: New, In Progress, Reopened, Closed
OPEN_FILTER = "status:['New','In Progress','Reopened']"

SEVERITY_RANGES = [
    {'from': 80, 'to': 101, 'label': 'Critical'},
    {'from': 60, 'to': 80,  'label': 'High'},
    {'from': 40, 'to': 60,  'label': 'Medium'},
    {'from': 20, 'to': 40,  'label': 'Low'},
    {'from': 0,  'to': 20,  'label': 'Informational'},
]


def _get_base_url():
    cloud = os.environ.get('CS_CLOUD', 'us-1')
    return CS_CLOUD_URLS.get(cloud, 'https://api.crowdstrike.com')


def _case_query_total(base_url, token, fql=None):
    params = {'limit': 1}
    if fql:
        params['filter'] = fql
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    req = urllib.request.Request(
        f'{base_url}/message-center/queries/cases/v1?{qs}',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read())
    return data.get('meta', {}).get('pagination', {}).get('total', 0)


def _case_aggregate(base_url, token, body):
    req = urllib.request.Request(
        f'{base_url}/message-center/aggregates/cases/GET/v1',
        data=json.dumps(body).encode('utf-8'),
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        method='POST'
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


@func.handler(method='GET', path='/execute')
def handler(request: Request) -> Response:
    token = getattr(request, 'access_token', None)
    if not token:
        return Response(body={'rows': [], 'total': 0, 'error': 'no access_token in request'}, code=200)

    base_url = _get_base_url()

    try:
        total_all = _case_query_total(base_url, token)
        open_total = _case_query_total(base_url, token, OPEN_FILTER)

        agg_body = [{
            'type': 'range',
            'field': 'severity',
            'filter': OPEN_FILTER,
            'ranges': SEVERITY_RANGES,
            'name': 'severity_breakdown'
        }]
        rows = []
        try:
            agg_resp = _case_aggregate(base_url, token, agg_body)
            for res in agg_resp.get('resources', []):
                if res.get('name') == 'severity_breakdown':
                    for b in res.get('buckets', []):
                        frm = b.get('from')
                        to  = b.get('to')
                        label = next(
                            (r['label'] for r in SEVERITY_RANGES if r['from'] == frm and r['to'] == to),
                            None
                        )
                        if label and label != 'Informational':
                            rows.append({'severity_label': label, 'count': b.get('count', 0)})
        except urllib.error.HTTPError:
            # Aggregation may not be supported — fall through to open_total summary
            rows = []

        if not rows and open_total > 0:
            rows = [{'severity_label': 'Open', 'count': open_total}]

        return Response(
            body={'rows': rows, 'total': open_total, 'total_all': total_all},
            code=200
        )

    except urllib.error.HTTPError as e:
        err_body = ''
        try:
            err_body = e.read().decode('utf-8')[:400]
        except Exception:
            pass
        return Response(
            body={'rows': [], 'total': 0, 'error': f'HTTP {e.code}: {err_body}'},
            code=200
        )
    except Exception as e:
        return Response(body={'rows': [], 'total': 0, 'error': str(e)}, code=200)


if __name__ == '__main__':
    func.run()
