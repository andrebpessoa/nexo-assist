# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Plan/Checks)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Test a read marker with the last message at the marker itself, not only with later messages
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `console` · harmful: 0
- features: console-analista
- evidence: packages/agent/src/console.ts:195 (console)
- last seen: 2026-10-29T00:31:39Z

### L-002 - Test a time-based state rule with each author as the last speaker, not only the author the rule expects
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `console` · harmful: 0
- features: console-analista
- evidence: packages/agent/src/console.ts:175 (console)
- last seen: 2026-10-29T00:31:39Z

### L-003 - Prove a control enabled by state in every state that disables it, not only where it is enabled
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: console-analista
- evidence: apps/web/src/features/console/conversation-view.tsx:321 (web)
- last seen: 2026-10-29T00:31:39Z

### L-004 - Implement every branch an approved assumption names before marking the rule done
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `agent` · harmful: 0
- features: console-analista
- evidence: packages/agent/src/console.ts:174 (agent)
- last seen: 2026-10-29T00:31:39Z

### L-005 - Count every actor of the service side (agent and analyst) when a rule speaks of the central answering
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `agent` · harmful: 0
- features: console-analista
- evidence: packages/agent/src/console.ts:175 (agent)
- last seen: 2026-10-29T00:31:39Z

### L-006 - Give every filter in a count test at least one matching item, or a filter that always returns false passes
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: console-analista
- evidence: apps/server/src/console.test.ts:165 (routes)
- last seen: 2026-10-29T00:31:39Z

### L-007 - Assert the default value of a timing bound a criterion fixes when tests override it
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: console-analista
- evidence: apps/web/src/features/console/console-screen.tsx:24 (web)
- last seen: 2026-10-29T00:31:39Z

### L-008 - Check list ordering, presence marks and header fields against the binding capture before approving the spec
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: console-analista
- evidence: captures/04-console-conversa-transferida.png (spec)
- last seen: 2026-10-29T00:31:39Z

### L-009 - Check each state's header against its capture when one criterion covers several states
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `spec` · harmful: 0
- features: console-analista
- evidence: captures/05-console-atendimento-assumido.png (spec)
- last seen: 2026-10-29T00:31:40Z

### L-010 - Make test fixtures use the exact block shapes the engine writes, never messages it never produces
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: console-analista
- evidence: captures/04-console-conversa-transferida.png (web)
- last seen: 2026-10-29T00:31:40Z

### L-011 - Assert the value a dependency is built with, not only the value a function returns about it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `server` · harmful: 0
- features: entrega
- evidence: apps/server/src/chat-agent.ts:37 (server)
- last seen: 2026-10-29T01:11:20Z

### L-012 - Test a reported average with nonzero inputs, not only the all-zero case
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `agent` · harmful: 0
- features: entrega
- evidence: packages/agent/eval/run.ts:114 (agent)
- last seen: 2026-10-29T01:11:20Z

### L-013 - When two failure paths share an outcome, assert the message that tells them apart
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: entrega
- evidence: scripts/dev.ts:25 (scripts)
- last seen: 2026-10-29T01:11:20Z

### L-014 - Accept every empty spelling of an env value (=, empty quotes, spaces, CRLF) before filling it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: entrega
- evidence: scripts/setup.ts:24 (scripts)
- last seen: 2026-10-29T01:11:20Z

### L-015 - Keep waiting for a service and acting on it in separate error paths
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: entrega
- evidence: scripts/dev.ts:18 (scripts)
- last seen: 2026-10-29T01:11:20Z

### L-016 - Prove a no-secrets-in-the-bundle rule by scanning a real build for secret values
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `scripts` · harmful: 0
- features: entrega
- evidence: scripts/secrets.test.ts:25 (scripts)
- last seen: 2026-10-29T01:11:20Z

### L-017 - Run every command the README documents, in the environment the README describes
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `docs` · harmful: 0
- features: entrega
- evidence: README.md:38 (docs)
- last seen: 2026-10-29T01:11:20Z

### L-018 - Quote counts in docs as approximate or generate them, never as hand-typed exact figures
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `docs` · harmful: 0
- features: entrega
- evidence: README.md:86 (docs)
- last seen: 2026-10-29T01:11:20Z

### L-019 - Cover every env schema in the repo with an example file and a test
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `config` · harmful: 0
- features: entrega
- evidence: packages/infra/.env.schema:1 (config)
- last seen: 2026-10-29T01:11:20Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
