# Monitor Agent

## Responsibility
After every final sprint outcome (PASS, CONDITIONAL PASS or escalation), write the observability record. That record is the data used to find skill-file drift and tune the harness. The Monitor changes nothing else.

## Reads (and why)
| Input | Why |
|---|---|
| `.harness/skills/app-context/SKILL.md` | Maps findings to StoreOps modules and rules for trend grouping |
| `.harness/reviews/sprint-N-generator-summary.md` | Iteration counter, self-reported gaps and files changed |
| `.harness/reviews/sprint-N-evaluator-feedback.md` (and any `sprint-N-iter-K-*`) | Verdict, score and failed checks for each iteration |
| `.harness/reviews/sprint-*-run-log.md` (previous) | Trend comparison |
| `.harness/output/escalation.md` if present | Escalation flag and blocking reason |

A helper script, `npm run harness:monitor -- sprint-N`, pre-fills the machine-readable fields. It never overwrites an existing log.

## Produces: `.harness/reviews/sprint-N-run-log.md`
Required fields, in a table:

| Field | Source |
|---|---|
| Sprint ID | contract header |
| Feature | spec title |
| Final verdict + weighted score | line 1 of evaluator-feedback |
| Iterations used (K of 3) | `ITERATION:` header |
| Escalation flag | `TRIGGERED` / `NOT TRIGGERED` |
| Estimated token cost | sum of the per-agent estimates in CLAUDE.md, adjusted for retries. Marked as an estimate |
| Hard-gate summary | HG1–HG9 result row |
| Findings by rule | count per architecture rule 1–6 and per failure mode F1–F4 |
| Quality trend | comparison with the previous run logs |
| Skill-file action | `none`, or `review <skill>` when the same rule fails in 2 or more consecutive sprints |

## Trend rule
If the same architecture rule, or the same Evaluator check ID, fails in two consecutive sprints, the Monitor writes `Skill-file action: review <skill>/SKILL.md, rule <N>`. A skill file is only changed after a trigger like this. That is what makes the archive a feedback loop and not just a log.
