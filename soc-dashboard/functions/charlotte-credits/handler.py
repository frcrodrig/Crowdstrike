"""
Charlotte AI Credits Fetcher Function

Fetches Charlotte AI credits usage data from CrowdStrike Falcon API.
Returns structured data for dashboard widget consumption.
"""

import json
from typing import Dict, Any, List
from datetime import datetime, timedelta


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Fetch Charlotte AI credits data from Falcon API.

    Returns:
        Dict containing:
        - totalUsed: int
        - totalLimit: int
        - creditsRemaining: int
        - percentage: float
        - topUsers: List[Dict]
        - trend: List[Dict]
        - byFeature: List[Dict]
        - lastUpdated: str (ISO timestamp)
    """

    # Get Falcon API client from context
    falcon = context.falcon

    try:
        # Strategy 1: Try to get dashboard data directly
        # Dashboard ID: 4B9D0310-61D2-4EF0-8882-5E23C49F01A7
        dashboard_response = fetch_dashboard_data(falcon)

        if dashboard_response:
            return dashboard_response

        # Strategy 2: Fallback to individual API calls
        return fetch_credits_from_apis(falcon)

    except Exception as e:
        # Return mock data on error (graceful degradation)
        return {
            "totalUsed": 2400000,
            "totalLimit": 10000000,
            "creditsRemaining": 7600000,
            "percentage": 24.0,
            "topUsers": [
                {"name": "user1@company.com", "credits": 450000, "percentage": 18.75},
                {"name": "user2@company.com", "credits": 380000, "percentage": 15.83},
                {"name": "user3@company.com", "credits": 320000, "percentage": 13.33},
                {"name": "user4@company.com", "credits": 280000, "percentage": 11.67},
                {"name": "user5@company.com", "credits": 250000, "percentage": 10.42}
            ],
            "trend": generate_mock_trend(),
            "byFeature": [
                {"feature": "Triage", "credits": 980000},
                {"feature": "Investigation", "credits": 720000},
                {"feature": "Response", "credits": 450000},
                {"feature": "Analysis", "credits": 250000}
            ],
            "lastUpdated": datetime.utcnow().isoformat(),
            "source": "mock",
            "error": str(e)
        }


def fetch_dashboard_data(falcon) -> Dict[str, Any]:
    """
    Try to fetch data from Charlotte dashboard API.
    """
    try:
        # Attempt to use dashboard entities API
        response = falcon.command(
            action="POST",
            resource="/dashboards/v2/entities/dashboard-data/v1",
            body={
                "dashboard_id": "4B9D0310-61D2-4EF0-8882-5E23C49F01A7",
                "filter": "created_at:'Current month'"
            }
        )

        if response and response.get("body"):
            return parse_dashboard_response(response["body"])

    except Exception as e:
        print(f"Dashboard API failed: {e}")
        return None


def fetch_credits_from_apis(falcon) -> Dict[str, Any]:
    """
    Fetch Charlotte credits from individual API endpoints.
    Tries multiple strategies in parallel.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    results = {}

    # Strategy 1: Try standard Charlotte API endpoints
    charlotte_endpoints = [
        {
            "url": "/charlotte/v1/usage/summary",
            "method": "GET",
            "params": {"period": "current_month"},
            "key": "usage"
        },
        {
            "url": "/charlotte/v1/quota",
            "method": "GET",
            "params": {},
            "key": "quota"
        },
        {
            "url": "/charlotte/v1/usage/by-user",
            "method": "GET",
            "params": {"period": "current_month", "limit": 10, "sort": "desc"},
            "key": "users"
        },
        {
            "url": "/charlotte/v1/usage/trend",
            "method": "GET",
            "params": {"period": "current_month"},
            "key": "trend"
        }
    ]

    # Strategy 2: Try Foundry usage endpoints
    foundry_endpoints = [
        {
            "url": "/foundry/v1/usage/charlotte",
            "method": "GET",
            "params": {"period": "current_month"},
            "key": "usage_alt"
        },
        {
            "url": "/foundry/v1/usage/credits",
            "method": "GET",
            "params": {"service": "charlotte", "period": "current_month"},
            "key": "credits"
        }
    ]

    # Strategy 3: Try AI Platform endpoints
    ai_platform_endpoints = [
        {
            "url": "/ai-platform/v1/credits/usage",
            "method": "GET",
            "params": {"period": "current_month"},
            "key": "ai_usage"
        },
        {
            "url": "/ai-platform/v1/credits/quota",
            "method": "GET",
            "params": {},
            "key": "ai_quota"
        }
    ]

    all_endpoints = charlotte_endpoints + foundry_endpoints + ai_platform_endpoints

    def try_endpoint(config):
        """Try a single endpoint and return result"""
        try:
            print(f"[Charlotte API] Trying {config['method']} {config['url']}")
            response = falcon.command(
                action=config["method"],
                resource=config["url"],
                parameters=config["params"]
            )

            if response and response.get("body"):
                print(f"[Charlotte API] ✅ SUCCESS: {config['url']}")
                return (config["key"], response["body"])
            else:
                print(f"[Charlotte API] ❌ Empty response: {config['url']}")
                return None

        except Exception as e:
            print(f"[Charlotte API] ❌ Failed {config['url']}: {str(e)}")
            return None

    # Execute all endpoints in parallel (max 5 concurrent)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(try_endpoint, cfg): cfg for cfg in all_endpoints}

        for future in as_completed(futures):
            result = future.result()
            if result:
                key, data = result
                results[key] = data
                print(f"[Charlotte API] Stored result for key: {key}")

    print(f"[Charlotte API] Final results keys: {list(results.keys())}")

    # Transform results if we got any
    if results:
        return transform_api_results(results)

    return None


def parse_dashboard_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse dashboard API response into widget format.
    """
    # This structure depends on actual dashboard API response
    # Adjust based on real data structure
    return {
        "totalUsed": data.get("total_used", 0),
        "totalLimit": data.get("limit", 10000000),
        "creditsRemaining": data.get("remaining", 0),
        "percentage": data.get("usage_percentage", 0),
        "topUsers": data.get("top_users", [])[:5],
        "trend": data.get("daily_usage", []),
        "byFeature": data.get("by_feature", []),
        "lastUpdated": datetime.utcnow().isoformat(),
        "source": "dashboard_api"
    }


def transform_api_results(results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform individual API results into widget format.
    Handles multiple possible API response structures.
    """
    print(f"[Charlotte Transform] Input keys: {list(results.keys())}")

    # Try to extract usage data from various sources
    usage = (
        results.get("usage") or
        results.get("usage_alt") or
        results.get("credits") or
        results.get("ai_usage") or
        {}
    )

    # Try to extract quota data
    quota = (
        results.get("quota") or
        results.get("ai_quota") or
        usage.get("quota") or  # Sometimes embedded in usage response
        {}
    )

    # Try to extract users data
    users = (
        results.get("users") or
        usage.get("top_users") or
        usage.get("users") or
        {}
    )

    # Try to extract trend data
    trend = (
        results.get("trend") or
        usage.get("daily") or
        usage.get("trend") or
        []
    )

    # Extract total used - try multiple field names
    total_used = (
        usage.get("credits_used") or
        usage.get("total_used") or
        usage.get("total") or
        usage.get("usage") or
        usage.get("consumed") or
        0
    )

    # Extract total limit - try multiple field names
    total_limit = (
        quota.get("monthly_limit") or
        quota.get("limit") or
        quota.get("total_limit") or
        quota.get("quota") or
        usage.get("limit") or
        10000000  # Default fallback
    )

    print(f"[Charlotte Transform] Extracted - Used: {total_used}, Limit: {total_limit}")

    # Calculate percentage
    percentage = (total_used / total_limit * 100) if total_limit > 0 else 0

    # Transform result
    transformed = {
        "totalUsed": int(total_used),
        "totalLimit": int(total_limit),
        "creditsRemaining": int(total_limit - total_used),
        "percentage": round(percentage, 2),
        "topUsers": parse_top_users(users.get("items") if isinstance(users, dict) else users),
        "trend": parse_trend(trend),
        "byFeature": parse_by_feature(usage.get("by_feature") or usage.get("breakdown") or []),
        "lastUpdated": datetime.utcnow().isoformat(),
        "source": "api_endpoints",
        "debug": {
            "available_keys": list(results.keys()),
            "usage_keys": list(usage.keys()) if isinstance(usage, dict) else [],
            "quota_keys": list(quota.keys()) if isinstance(quota, dict) else []
        }
    }

    print(f"[Charlotte Transform] Output: {transformed}")
    return transformed


def parse_top_users(users: List[Dict]) -> List[Dict]:
    """
    Parse top users data from various API response formats.
    """
    if not users or not isinstance(users, list):
        return []

    parsed = []
    for user in users[:5]:  # Top 5
        # Try multiple field name variations
        name = (
            user.get("user_name") or
            user.get("user_email") or
            user.get("email") or
            user.get("user_id") or
            user.get("name") or
            "Unknown"
        )

        credits = (
            user.get("credits_used") or
            user.get("usage") or
            user.get("credits") or
            user.get("total") or
            0
        )

        percentage = user.get("percentage", 0)

        parsed.append({
            "name": name,
            "credits": int(credits),
            "percentage": round(percentage, 2)
        })

    return parsed


def parse_trend(daily_data: List[Dict]) -> List[Dict]:
    """Parse trend data."""
    return [
        {
            "date": item.get("date", ""),
            "credits": item.get("credits", item.get("usage", 0))
        }
        for item in daily_data
    ]


def parse_by_feature(features: List[Dict]) -> List[Dict]:
    """Parse by-feature data."""
    return [
        {
            "feature": item.get("feature", item.get("name", "Unknown")),
            "credits": item.get("credits", item.get("usage", 0))
        }
        for item in features
    ]


def generate_mock_trend() -> List[Dict]:
    """Generate mock 7-day trend."""
    base_date = datetime.utcnow() - timedelta(days=6)
    return [
        {
            "date": (base_date + timedelta(days=i)).strftime("%Y-%m-%d"),
            "credits": 320000 + (i * 15000) + ((i % 2) * 20000)
        }
        for i in range(7)
    ]
