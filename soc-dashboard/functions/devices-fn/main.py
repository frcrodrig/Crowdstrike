# sdk: crowdstrike-foundry-function==1.0.0
import json
import os
import urllib.request
import urllib.parse
import urllib.error
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

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


def _query_total(base_url, token, path, fql=None):
    """Return pagination.total for a GET query endpoint. Returns 0 on any error."""
    params = {'limit': 1}
    if fql:
        params['filter'] = fql
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    req = urllib.request.Request(
        f'{base_url}{path}?{qs}',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        return data.get('meta', {}).get('pagination', {}).get('total', 0)
    except Exception:
        return 0


def _query_hosts_breakdown(base_url, token, path, one_hour_ago, seven_days_ago):
    calls = [
        ('windows', path, "platform_name:'Windows'"),
        ('linux',   path, "platform_name:'Linux'"),
        ('mac',     path, "platform_name:'Mac'"),
        ('online',  path, f"last_seen:>='{one_hour_ago}'"),
        ('stale',   path, f"last_seen:>='{seven_days_ago}'+last_seen:<'{one_hour_ago}'"),
    ]
    results = {}
    with ThreadPoolExecutor(max_workers=5) as ex:
        futures = {ex.submit(_query_total, base_url, token, p, f): k
                   for k, p, f in calls}
        for future in as_completed(futures):
            results[futures[future]] = future.result()
    return results


def _query_host_ids(base_url, token, path, limit=500):
    """Return up to `limit` host IDs from a GET query endpoint. Returns [] on any error."""
    params = {'limit': limit}
    qs = urllib.parse.urlencode(params, quote_via=urllib.parse.quote)
    req = urllib.request.Request(
        f'{base_url}{path}?{qs}',
        headers={'Authorization': f'Bearer {token}'},
        method='GET'
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        return data.get('resources', []) or []
    except Exception:
        return []


def _query_device_versions(base_url, token, host_ids):
    """POST host IDs to /devices/entities/devices/v2 and return a list of agent_version strings.

    Returns ([], None) on any error. Max 500 IDs per batch (CrowdStrike limit).
    """
    if not host_ids:
        return []
    ids = host_ids[:500]
    body = json.dumps({'ids': ids}).encode('utf-8')
    req = urllib.request.Request(
        f'{base_url}/devices/entities/devices/v2',
        data=body,
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        versions = []
        for dev in data.get('resources', []) or []:
            ver = dev.get('agent_version') or ''
            versions.append(ver)
        return versions
    except Exception:
        return []


def _compute_version_stats(versions, total):
    """Compute version_distribution (top 5) and outdated_count from a list of agent_version strings."""
    if not versions:
        return {}, 0
    # Filter out empty strings for the distribution calculation
    non_empty = [v for v in versions if v]
    if not non_empty:
        return {}, 0
    counter = Counter(non_empty)
    top5 = counter.most_common(5)
    # Preserve insertion order (Python 3.7+)
    distribution = {ver: count for ver, count in top5}
    # Most common version is the "current" baseline
    most_common_count = top5[0][1] if top5 else 0
    outdated = max(0, total - most_common_count)
    return distribution, outdated


@func.handler(method='GET', path='/execute')
def handler(request: Request) -> Response:
    token = getattr(request, 'access_token', None)
    if not token:
        return Response(body={
            'windows': 0, 'linux': 0, 'mac': 0,
            'online': 0, 'stale': 0, 'offline': 0,
            'total': 0, 'source': 'error', 'error': 'no access_token in request',
            'version_distribution': {}, 'outdated_count': 0,
        }, code=200)

    base_url = _get_base_url()

    try:
        now            = datetime.now(timezone.utc)
        one_hour_ago   = (now - timedelta(hours=1)).strftime('%Y-%m-%dT%H:%M:%SZ')
        seven_days_ago = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')

        # Try Hosts API first — supports last_seen FQL for online/stale/offline breakdown
        hosts_total = _query_total(base_url, token, '/devices/queries/devices/v1')
        if hosts_total > 0:
            results = _query_hosts_breakdown(base_url, token, '/devices/queries/devices/v1', one_hour_ago, seven_days_ago)
            online  = results.get('online', 0)
            stale   = results.get('stale', 0)

            # Fetch agent_version for up to 500 devices for sensor hygiene metrics
            version_distribution = {}
            outdated_count = 0
            try:
                host_ids = _query_host_ids(base_url, token, '/devices/queries/devices/v1', limit=500)
                if host_ids:
                    versions = _query_device_versions(base_url, token, host_ids)
                    version_distribution, outdated_count = _compute_version_stats(versions, hosts_total)
            except Exception:
                version_distribution = {}
                outdated_count = 0

            return Response(body={
                'windows': results.get('windows', 0),
                'linux':   results.get('linux', 0),
                'mac':     results.get('mac', 0),
                'online':  online, 'stale': stale,
                'offline': max(0, hosts_total - online - stale),
                'total':   hosts_total, 'source': 'hosts-api',
                'version_distribution': version_distribution,
                'outdated_count': outdated_count,
            }, code=200)

        # Fallback: Discover API (managed + unmanaged assets, last_seen FQL may differ)
        discover_total = _query_total(base_url, token, '/discover/queries/hosts/v1')
        if discover_total > 0:
            results = _query_hosts_breakdown(base_url, token, '/discover/queries/hosts/v1', one_hour_ago, seven_days_ago)
            online  = results.get('online', 0)
            stale   = results.get('stale', 0)
            return Response(body={
                'windows': results.get('windows', 0),
                'linux':   results.get('linux', 0),
                'mac':     results.get('mac', 0),
                'online':  online, 'stale': stale,
                'offline': max(0, discover_total - online - stale),
                'total':   discover_total, 'source': 'discover-api',
                'version_distribution': {},
                'outdated_count': 0,
            }, code=200)

        return Response(body={
            'windows': 0, 'linux': 0, 'mac': 0,
            'online': 0, 'stale': 0, 'offline': 0,
            'total': 0, 'source': 'no-data',
            'version_distribution': {}, 'outdated_count': 0,
        }, code=200)

    except Exception as e:
        return Response(body={
            'windows': 0, 'linux': 0, 'mac': 0,
            'online': 0, 'stale': 0, 'offline': 0,
            'total': 0, 'source': 'error', 'error': str(e),
            'version_distribution': {}, 'outdated_count': 0,
        }, code=200)


if __name__ == '__main__':
    func.run()
