# Employee + Company Performance Observability Blueprint

## Goal
Build micro monitoring and management for employee/company performance by extending existing Digital Twin flows, not replacing them.

## Core Design
- Event-first performance signals (`PerformanceSignalEvent`) captured from HR, task, revenue, CRM, support, and supply-chain modules.
- KPI contract catalog (`PerformanceMetricDefinition`) with thresholds, direction, scope, and source ownership.
- Twin trace enrichment: surface performance signals in `/api/digital-twin/traces` as activity events.
- Management loop: anomalies become triage items, then interventions.

## Data Model (Phase 1 implemented)
- `PerformanceMetricDefinition`
  - Scope: `EMPLOYEE | TEAM | COMPANY`
  - Key/name/unit/direction
  - Warning/critical thresholds
  - Company-specific override with global fallback
- `PerformanceSignalEvent`
  - Metric key/scope/value/baseline
  - Severity/source module
  - Source entity mapping
  - Company + optional employee linkage

## APIs (Phase 1 implemented)
- `GET /api/performance-observability/metrics`
  - Return active global/company KPI definitions.
- `POST /api/performance-observability/metrics`
  - Create company KPI definition.
  - `{"seedDefaults": true}` seeds baseline KPI catalog.
- `GET /api/performance-observability/events`
  - Query signals by `scope`, `metricKey`, `severity`, `limit`.
- `POST /api/performance-observability/events`
  - Ingest validated micro-performance signal event.
  - Writes audit event (`PERFORMANCE_SIGNAL_CAPTURED`).

## Worker Jobs (Phase 2 target)
- `performance_signal_rollup` (hourly)
  - Aggregate noisy events into compact trend windows.
- `performance_anomaly_detector` (15-min)
  - Baseline deviation + threshold breach checks.
- `performance_snapshot_writer` (daily)
  - Persist daily employee/team/company snapshots.
- `performance_intervention_suggester` (daily)
  - Recommend coaching/escalation/playbooks by anomaly type.

## Digital Twin Mapping
- Add `PERFORMANCE_SIGNAL` activity type in trace timeline.
- Signal mapping:
  - `metricKey` -> trace title.
  - `sourceModule` + `metricScope` + `value` -> trace description.
  - severity (`INFO/WARNING/CRITICAL`) -> trace severity lane.
- Next phase:
  - behavior impact propagation (risk up/down),
  - performance panel delta cards by metric family.

## UI Routes (implementation roadmap)
- `/dashboard/performance-observability`
  - Command center with KPI health, anomaly feed, SLA timers.
- `/dashboard/performance-observability/metrics`
  - KPI contract management and threshold tuning.
- `/dashboard/performance-observability/events`
  - Raw micro-signal stream with filters and replay.
- `/dashboard/digital-twin` (existing)
  - Keep as executive fused view; embed observability insights.

## Governance & Safety
- Keep score formulas versioned.
- Preserve explainability payload in signal `context`.
- RBAC:
  - config: `SUPER_ADMIN/ADMIN/HR_MANAGER/FINANCE_ADMIN`
  - ingestion: manager-class + automation services
  - read: manager + hr/finance admin.
