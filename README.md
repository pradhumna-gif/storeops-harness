# StoreOps Harness — Node.js

Cognizant AI-Native Tech Architect Programme, Capstone Case Study 1, Build Track: a governed Claude Code development harness (Planner → Generator → Evaluator → Monitor) around the StoreOps retail-operations REST API.

## Stack
TypeScript 5.x strict · Express 4.x · Jest + Supertest · ESLint + @typescript-eslint · dependency-cruiser · Docker

## Quick start
```bash
npm ci
npm run verify          # typecheck, lint, arch:check, test:coverage
npm run dev             # http://localhost:3000/health
docker compose up --build
```

## Where to look
| Deliverable | Location |
|---|---|
| Orchestrator | `CLAUDE.md` |
| Agents | `.harness/agents/{planner,generator,evaluator,monitor}.agent.md` |
| Skills (8) | `.harness/skills/*/SKILL.md` (index: `.harness/skills/README.md`) |
| Evaluation framework | `.harness/skills/evaluation-criteria/SKILL.md`, `scripts/evaluate-harness.ts` |
| Escalation format | `.harness/templates/escalation.md` |
| Demonstration prompt | `PROMPT.md` |
| Run artefacts (audit trail) | `.harness/reviews/sprint-1-{spec,contract,generator-summary,evaluator-feedback,run-log}.md` |
| Harness self-audit | `.harness/reviews/post-sprint-1-harness-audit.md` |
| Generated feature | `src/activities/activities.{routes,service}.ts` (`PATCH /api/activities/bulk-status`) |
| Design Brief / Reflection / Deployment / Journal | `DESIGN_BRIEF.md`, `REFLECTION.md`, `DEPLOYMENT.md`, `JOURNAL.md` |
| Screenshots and logs | `evidence/` |

## Running the harness
In Claude Code, from the repository root, run `@planner <feature request>`. Review `.harness/output/spec.md`, then type `APPROVED`. The Generator/Evaluator loop and the Monitor then run on their own (up to 3 iterations, then escalation).
