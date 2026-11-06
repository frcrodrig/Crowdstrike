# Queries Exploratorias para KPIs Faltantes

**Fecha**: 2026-07-29  
**Propósito**: Identificar campos disponibles para crear queries de MTTD, MTTR, MTTC y Credits

## ⚠️ IMPORTANTE

**NO AÑADIR ESTAS QUERIES AL MANIFEST** - Son solo para exploración manual

## 📋 Instrucciones de Prueba

### Paso 1: Acceder a LogScale

1. Ve a: https://falcon.us-2.crowdstrike.com/investigate/events
2. Selecciona el repository correcto (tenant)
3. Ajusta el time range (últimas 24h recomendado)

### Paso 2: Ejecutar Queries (Una por una)

#### Query 1: EXPLORE_detections_for_mttd.lql
**Propósito**: Ver campos disponibles para calcular MTTD

```lql
#event_simpleName=Event_*DetectionSummaryEvent
| head(5)
| table([@timestamp, DetectionIdExternalId, Severity, ProcessStartTime, *])
```

**Qué buscar**:
- ✅ ¿Existe el campo `ProcessStartTime`?
- ✅ ¿Existe el campo `DetectionIdExternalId`?
- ✅ ¿Hay otros campos de timestamp? (FirstSeen, LastSeen, etc.)
- ✅ ¿Los timestamps son números (epoch) o strings?

**Copiar y pegar resultados aquí**:
```
[Pega los campos que aparecen en la tabla]
```

---

#### Query 2: EXPLORE_incidents_for_mttc.lql
**Propósito**: Ver campos disponibles para calcular MTTC

```lql
#event_simpleName=IncidentSummaryEvent
| head(5)
| table([IncidentId, status, Severity, @timestamp, *])
```

**Qué buscar**:
- ✅ ¿Existe el campo `IncidentId`?
- ✅ ¿Qué valores tiene el campo `status`? (New, In Progress, Closed, etc.)
- ✅ ¿Hay campos de timestamp para creación y cierre? (CreatedTime, ClosedTime, etc.)
- ✅ ¿Hay campo de estado anterior? (PreviousStatus, StatusHistory, etc.)

**Copiar y pegar resultados aquí**:
```
[Pega los campos que aparecen en la tabla]
```

---

#### Query 3: EXPLORE_user_activity_for_mttr.lql
**Propósito**: Ver eventos de respuesta de analistas para MTTR

```lql
#event_simpleName=Event_UserActivityAuditEvent
| head(5)
| table([UserId, OperationName, TargetId, @timestamp, *])
```

**Qué buscar**:
- ✅ ¿Qué valores tiene `OperationName`? (detection_update, incident_assign, etc.)
- ✅ ¿Existe el campo `TargetId` o similar que referencie detecciones/incidentes?
- ✅ ¿Hay campo que indique tipo de acción? (ActionType, EventType, etc.)
- ✅ ¿Se pueden correlacionar estos eventos con detecciones?

**Copiar y pegar resultados aquí**:
```
[Pega los campos que aparecen en la tabla]
```

---

#### Query 4: EXPLORE_charlotte_credits.lql
**Propósito**: Buscar eventos de uso de Charlotte/AI

```lql
#event_simpleName=Event_ExternalApiActivityAuditEvent
| ApiServiceClass=* 
| head(100)
| table([ApiServiceClass, ServiceName, UserId, @timestamp, *])
```

**Qué buscar**:
- ✅ ¿Aparece algún `ApiServiceClass` o `ServiceName` relacionado con "charlotte", "ai", "llm"?
- ✅ ¿Hay campos de consumo? (Credits, Tokens, ResponseSize, etc.)
- ✅ ¿Qué servicios aparecen? (lista de ApiServiceClass únicos)

**Copiar y pegar resultados aquí**:
```
[Pega los campos que aparecen en la tabla]
```

---

## 📊 Reporte de Resultados

Una vez ejecutadas las 4 queries, completa esta tabla:

| Query | ✅/❌ | Campos Clave Encontrados | Notas |
|-------|------|-------------------------|-------|
| MTTD (Detections) | | | |
| MTTC (Incidents) | | | |
| MTTR (User Activity) | | | |
| Credits (Charlotte) | | | |

---

## 🎯 Próximos Pasos

Con los resultados de estas queries exploratorias, podré:

1. ✅ Ajustar las queries finales para usar **solo campos reales**
2. ✅ Crear cálculos correctos de MTTD/MTTR/MTTC basados en campos disponibles
3. ✅ Determinar si Charlotte Credits es posible o requiere alternativa
4. ✅ Crear los archivos .lql finales y añadirlos al manifest

---

**Nota**: Si alguna query no devuelve resultados, prueba ampliar el time range o verificar que haya datos en ese período.
