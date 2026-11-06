# sdk: crowdstrike-foundry-function==1.0.0
import json
import os
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

from crowdstrike.foundry.function import Function, Request, Response

func = Function.instance()

CS_CLOUD_URLS = {
    'us-1':     'https://api.crowdstrike.com',
    'us-2':     'https://api.us-2.crowdstrike.com',
    'eu-1':     'https://api.eu-1.crowdstrike.com',
    'us-gov-1': 'https://api.laggar.gcw.crowdstrike.com',
}


def _get_base_url():
    cloud = os.environ.get('CS_CLOUD', 'us-1')
    return CS_CLOUD_URLS.get(cloud, 'https://api.crowdstrike.com')


def _get_buckets(data):
    return (data or {}).get('resources', [{}])[0].get('buckets', [])


def _estimate_from_workflows(base_url, token, month):
    """Fallback: estimate credits from AgenticSOC workflow executions."""
    try:
        qs = urllib.parse.urlencode({
            'filter': "definition_name:'*genticsoc*'",
            'limit':  500,
            'sort':   'start_timestamp.desc',
        }, quote_via=urllib.parse.quote)
        req = urllib.request.Request(
            f'{base_url}/workflows/combined/executions/v1?{qs}',
            headers={'Authorization': f'Bearer {token}'},
            method='GET'
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())

        executions = result.get('resources') or []
        total      = len(executions)
        credits_used = total * 15

        user_counts = {}
        for e in executions:
            user = e.get('triggered_by') or e.get('principal') or 'AgenticSOC'
            user_counts[user] = user_counts.get(user, 0) + 1

        top_users = [
            {'name': u, 'credits': c * 15}
            for u, c in sorted(user_counts.items(), key=lambda x: -x[1])[:10]
        ]

        return {
            'totalUsed':         credits_used,
            'totalLimit':        0,
            'creditsRemaining':  0,
            'percentage':        0.0,
            'topUsers':          top_users,
            'source':            'workflow-estimate',
            '_debug_executions': total,
        }
    except Exception:
        return None


@func.handler(method='POST', path='/execute')
def handler(request: Request) -> Response:
    token = getattr(request, 'access_token', None)
    base_url = _get_base_url()

    try:
        body       = request.body or {}
        month      = body.get('month') or datetime.utcnow().strftime('%Y-%m')
        filter_str = f"created_at:'{month}'"

        if not token:
            return Response(body={
                'totalUsed': 0, 'totalLimit': 0, 'creditsRemaining': 0,
                'percentage': 0.0, 'topUsers': [],
                'source': 'error', 'error': 'no access_token in request',
                '_debug_base_url': base_url,
            }, code=200)

        payload = json.dumps([
            {"field": "_id", "type": "cardinality", "name": "Usage", "filter": filter_str}
        ]).encode('utf-8')

        req = urllib.request.Request(
            f"{base_url}/api2/chat/aggregates/quota-usage/v3",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        raw_resources  = data.get('resources', [])
        first_resource = raw_resources[0] if raw_resources else {}

        buckets  = _get_buckets(data)
        total    = next((b.get('count', 0) for b in buckets if b.get('label') == 'total'),    0)
        used     = next((b.get('count', 0) for b in buckets if b.get('label') == 'used'),     0)
        reserved = next((b.get('count', 0) for b in buckets if b.get('label') == 'reserved'), 0)
        if total == 0 and used == 0:
            total    = first_resource.get('total',    first_resource.get('limit',    0))
            used     = first_resource.get('used',     first_resource.get('consumed', 0))
            reserved = first_resource.get('reserved', 0)

        top_users = []
        try:
            user_payload = json.dumps([
                {"field": "user", "type": "terms", "name": "ByUser", "filter": filter_str, "size": 10}
            ]).encode('utf-8')
            user_req = urllib.request.Request(
                f"{base_url}/api2/chat/aggregates/quota-usage/v3",
                data=user_payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(user_req, timeout=15) as user_resp:
                user_data = json.loads(user_resp.read())
            user_buckets = _get_buckets(user_data)
            top_users = [
                {'name': b['label'], 'credits': b['count']}
                for b in user_buckets if b.get('label')
            ]
        except Exception:
            top_users = []

        return Response(body={
            'totalUsed':             used,
            'totalLimit':            total,
            'creditsRemaining':      total - used - reserved,
            'percentage':            round(used / total * 100, 2) if total > 0 else 0.0,
            'topUsers':              top_users,
            'source':                'charlotte-api',
            '_debug_base_url':       base_url,
            '_debug_buckets':        buckets,
            '_debug_first_resource': first_resource,
        }, code=200)

    except urllib.error.HTTPError as e:
        month_safe = (request.body or {}).get('month') or datetime.utcnow().strftime('%Y-%m')
        est = _estimate_from_workflows(base_url, token or '', month_safe)
        if est:
            est['_debug_base_url']   = base_url
            est['_debug_http_error'] = e.code
            return Response(body=est, code=200)
        return Response(body={
            'totalUsed': 0, 'totalLimit': 0, 'creditsRemaining': 0,
            'percentage': 0.0, 'topUsers': [],
            'source': 'error',
            'error':  f"HTTP {e.code}: {e.reason}",
            '_debug_base_url':  base_url,
            '_debug_url_tried': f"{base_url}/api2/chat/aggregates/quota-usage/v3",
        }, code=200)

    except Exception as e:
        return Response(body={
            'totalUsed': 0, 'totalLimit': 0, 'creditsRemaining': 0,
            'percentage': 0.0, 'topUsers': [],
            'source': 'error',
            'error':  str(e),
            '_debug_base_url': base_url,
        }, code=200)


if __name__ == '__main__':
    func.run()
