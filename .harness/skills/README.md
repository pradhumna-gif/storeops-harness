# Skill Files

Feedforward guides. Each agent reads its own set before acting (see the Agent registry in `CLAUDE.md`).

| Skill | Planner | Generator | Evaluator | Monitor | Governs |
|---|:-:|:-:|:-:|:-:|---|
| app-context | ✔ | ✔ | | ✔ | module ownership, stack, seed data, commands |
| architecture-principles | ✔ | ✔ | ✔ | | the six hard rules, the event registry, F1–F4 traceability |
| sprint-decomposition | ✔ | | | | sprint sizing, contract template, AC quality |
| coding-conventions | | ✔ | | | TypeScript/layer patterns, AppError catalogue |
| api-integration | | ✔ | | | HTTP contracts, error body, event payloads |
| how-to-test | | ✔ | | | test layout, business-rule assertions, coverage gates |
| how-to-review | | | ✔ | | review order, LLM check IDs, evidence standard |
| evaluation-criteria | | | ✔ | | weights, hard gates HG1–HG10, scoring, verdict algorithm |

**Change control:** a skill file is changed only when a Monitor run log records `Skill-file action: review <skill>`, or after a harness audit in `.harness/reviews/`. The reason is recorded in `JOURNAL.md`.
