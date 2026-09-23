# Governance Audit Trail

This is the permanent record of every AI-generated change that went through the harness. `.harness/output/` is transient working state and is gitignored. At each final verdict the orchestrator copies the handoffs here (see `CLAUDE.md`, step 6). These files are committed and go through normal PR review, so they can't be quietly rewritten.

## Chain of evidence per sprint
`PROMPT.md` → `sprint-N-spec.md` (Planner intent, developer-approved) → `sprint-N-contract.md` (scope and ACs) → `sprint-N-generator-summary.md` (Generator claims: AC self-check, files, command output) → `sprint-N-evaluator-feedback.md` (Evaluator verdict with re-verified file:line evidence) → `sprint-N-run-log.md` (Monitor: iterations, escalation, cost, trend)

Iterations that ended in FAIL are archived as `sprint-N-iter-K-evaluator-feedback.md`. Escalations are archived as `sprint-N-escalation.md`.

## Index
| Sprint | Feature | Verdict | Iterations | Escalation | Files |
|---|---|---|---|---|---|
| sprint-1 | Shift handover bulk update, `PATCH /api/activities/bulk-status` | **PASS** (96.75) | 1 of 3 | not triggered | `sprint-1-spec.md`, `sprint-1-contract.md`, `sprint-1-generator-summary.md`, `sprint-1-evaluator-feedback.md`, `sprint-1-run-log.md` |
| audit | Harness self-audit after sprint 1: type-only cross-module import missed by HG4 | corrective actions applied | — | — | `post-sprint-1-harness-audit.md` |

## Notes for readers
- The sprint-1 files are the **original** outputs of the run and are deliberately left unedited. Where later harness changes invalidated a claim in them, the correction lives in a separate dated audit file, not in an edit. For example, the evaluator feedback says hard gate 4 found no sibling-repository imports. The post-sprint-1 audit shows that `reports.service.ts` had one.
- The agent handoff formats were tightened after sprint 1: the `SPRINT:`/`ITERATION:` headers and the BLOCKING/NON-BLOCKING tag. Sprint-1 files use the earlier format.

## Surfacing recurring issues
The Monitor's trend rule: when the same architecture rule or Evaluator check ID fails in two consecutive sprints, the run log records `Skill-file action: review <skill>, rule N`. Skill files are only changed after a trigger like this or an audit, and `JOURNAL.md` records why.
