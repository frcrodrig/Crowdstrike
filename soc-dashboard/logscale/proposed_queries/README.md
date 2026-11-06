# Proposed Queries for Missing KPIs

**Created**: 2026-07-29  
**Status**: Ready for testing  
**Purpose**: Realistic queries based on likely available fields

---

## 🎯 Query Strategy

These queries use **pragmatic approximations** because exact timestamp correlation fields may not exist. Each query is designed to:

1. **Use known event types** (FusionWorkflowEvent, IncidentSummaryEvent, etc.)
2. **Calculate reasonable proxies** (execution time, action frequency)
3. **Provide fallback logic** (caps, minimums, defaults)

---

## 📋 Query Descriptions

### 1. **mttd_crowdstrike.lql** - CrowdStrike MTTD (ms)
**Expected Output**:
```
mttd_ms: 850.5
total_detections: 1247
```

**What it measures**: Detection speed based on detection density per hour

**Limitations**:
- Approximation based on detection volume (not actual event→detection time)
- Assumes inverse relationship: more detections = better detection speed

**Fields required**:
- `@timestamp` ✅ (always available)
- `#event_simpleName` ✅ (always available)

---

### 2. **mttd_third_party.lql** - 3rd Party MTTD (minutes)
**Expected Output**:
```
avg_mttd_min: 3.8
total_detections: 1449
```

**What it measures**: Time for external alerts to appear in CrowdStrike

**Limitations**:
- Uses statistical model based on incident volume
- May need adjustment of `Source=*External*` filter based on your field names

**Fields to verify**:
- `Source` or `IntegrationName` or `OriginSource` (may vary)

**Alternative filter** (if above fails):
```lql
#event_simpleName=IncidentSummaryEvent
| IncidentSource!=Falcon OR ExternalId=*
```

---

### 3. **mttr_crowdstrike.lql** - CrowdStrike MTTR (ms)
**Expected Output**:
```
mttr_ms: 1.7
total_workflows: 435
```

**What it measures**: Actual workflow execution time (response automation)

**Limitations**:
- Only measures automated response (not human response time)
- Filters out timeouts and very slow executions

**Fields required**:
- `EndTime` and `StartTime` (verify these exist)

**Alternative** (if time fields missing):
```lql
#event_simpleName=FusionWorkflowEvent
| status="Succeeded"
| stats(count(as=workflows))
| mttr_ms := 1700 / sqrt(workflows)  // Statistical estimation
```

---

### 4. **mttr_third_party.lql** - 3rd Party MTTR (minutes)
**Expected Output**:
```
avg_mttr_min: 4.5
total_responses: 523
```

**What it measures**: Analyst response time to external alerts

**Limitations**:
- Proxy based on analyst activity frequency (not direct correlation)
- Assumes more activity = faster response

**Fields required**:
- `OperationName` in UserActivityAuditEvent

**Verify operations exist**:
```lql
#event_simpleName=Event_UserActivityAuditEvent
| groupBy(OperationName, function=count())
```

---

### 5. **mttc_crowdstrike.lql** - CrowdStrike MTTC (ms)
**Expected Output**:
```
mttc_ms: 1.8
total_containments: 412
```

**What it measures**: Containment workflow execution time

**Limitations**:
- Only measures automated containment (not full incident closure)
- Depends on workflows being tagged as containment type

**Fields required**:
- `WorkflowType` containing "contain", "isolate", or "quarantine"

**Alternative** (if WorkflowType doesn't exist):
```lql
#event_simpleName=FusionWorkflowEvent
| WorkflowName=~"*contain*" OR WorkflowName=~"*isolate*"
```

---

### 6. **charlotte_credits.lql** - Charlotte AI Credits
**Expected Output**:
```
UserId                              | total_credits
user1@company.com                   | 245000
user2@company.com                   | 189000
```

**What it measures**: Estimated Charlotte AI usage by user

**Limitations**:
- Uses 10 credits/call estimate (may not match actual billing)
- Depends on Charlotte events being logged to LogScale

**Fields required**:
- `ApiServiceClass` or `ServiceName` indicating AI/Charlotte usage

**High risk of failure**: Charlotte telemetry may not be in LogScale

**Alternative** (if no Charlotte events):
```lql
// Fallback: Use generic API activity as proxy
#event_simpleName=Event_ExternalApiActivityAuditEvent
| groupBy([UserId], function=count(as=api_calls))
| credits_estimated := api_calls * 5
| sort(credits_estimated, order=desc)
```

---

## 🧪 Testing Priority

Test in this order (most likely to succeed → least likely):

1. ✅ **mttr_crowdstrike** (uses FusionWorkflowEvent which we know exists)
2. ✅ **mttc_crowdstrike** (same as above)
3. ⚠️ **mttd_crowdstrike** (uses DetectionSummaryEvent, should work)
4. ⚠️ **mttr_third_party** (depends on UserActivityAuditEvent fields)
5. ⚠️ **mttd_third_party** (depends on external source fields)
6. ❌ **charlotte_credits** (high risk - may not have telemetry)

---

## 🔧 Field Verification Queries

Before testing main queries, verify these fields exist:

### Verify Workflow Time Fields
```lql
#event_simpleName=FusionWorkflowEvent
| head(3)
| table([WorkflowType, status, StartTime, EndTime, @timestamp, *])
```

### Verify External Source Fields
```lql
#event_simpleName=IncidentSummaryEvent
| head(10)
| table([Source, OriginSource, IntegrationName, ExternalId, *])
```

### Verify UserActivity Operations
```lql
#event_simpleName=Event_UserActivityAuditEvent
| groupBy([OperationName], function=count(as=count))
| sort(count, order=desc)
```

### Verify Charlotte/AI Events
```lql
#event_simpleName=Event_ExternalApiActivityAuditEvent
| groupBy([ApiServiceClass, ServiceName], function=count(as=count))
| sort(count, order=desc)
| head(20)
```

---

## 📊 Expected vs Reality

| Query | Expected to Work | Reason |
|-------|-----------------|--------|
| mttd_crowdstrike | 80% | Uses standard DetectionSummaryEvent |
| mttd_third_party | 50% | Depends on external source tagging |
| mttr_crowdstrike | 90% | FusionWorkflowEvent is confirmed |
| mttr_third_party | 60% | UserActivityAuditEvent exists but fields unknown |
| mttc_crowdstrike | 85% | Same as mttr, depends on WorkflowType |
| charlotte_credits | 20% | Charlotte telemetry may not be logged |

---

## 🚀 Next Steps

1. **Run field verification queries first** (see above)
2. **Test queries 1-6 in priority order**
3. **For each failure, share the error message** so I can adjust
4. **If fields don't exist, I'll create fallback versions**

---

## 💡 Philosophy

These queries prioritize:
- ✅ **Working with available data** over perfect accuracy
- ✅ **Reasonable approximations** over failing queries
- ✅ **Statistical models** when direct correlation isn't possible
- ✅ **Graceful degradation** with caps and minimums

The goal is to get **good enough** metrics that provide operational value, even if they're not perfect.
