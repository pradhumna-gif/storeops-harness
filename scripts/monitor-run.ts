/* eslint-disable no-console */
// Monitor helper: extracts the machine-readable fields from an archived sprint so the Monitor agent
// can fill in run-log.md. It never overwrites an existing run log.
// Usage: npm run harness:monitor -- sprint-2
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const sprint = process.argv[2] ?? 'sprint-1';
const reviews = '.harness/reviews';
const feedbackPath = `${reviews}/${sprint}-evaluator-feedback.md`;
const summaryPath = `${reviews}/${sprint}-generator-summary.md`;
const logPath = `${reviews}/${sprint}-run-log.md`;

for (const path of [feedbackPath, summaryPath]) {
  if (!existsSync(path)) {
    console.error(`Missing ${path}; archive the Generator and Evaluator handoffs first.`);
    process.exit(1);
  }
}
if (existsSync(logPath)) {
  console.log(`${logPath} already exists; not overwriting the audit trail.`);
  process.exit(0);
}

const feedback = readFileSync(feedbackPath, 'utf8');
const verdict = /^VERDICT:\s*(PASS|CONDITIONAL PASS|FAIL)/m.exec(feedback)?.[1] ?? 'AMBIGUOUS';
const score = /Weighted score:\s*\**\s*([\d.]+)/i.exec(feedback)?.[1] ?? 'n/a';
const failedGates = (feedback.match(/\|\s*FAIL\s*\|/g) ?? []).length;
const escalated = existsSync('.harness/output/escalation.md');

writeFileSync(logPath, `# ${sprint} Run Log

| Field | Value |
|---|---|
| Sprint ID | ${sprint} |
| Verdict | ${verdict} |
| Weighted score | ${score} |
| Failed hard-gate rows | ${failedGates} |
| Iterations used | TO FILL (Monitor agent: count evaluator-feedback iterations) |
| Escalation flag | ${escalated ? 'TRIGGERED' : 'NOT TRIGGERED'} |
| Estimated token cost | TO FILL (Monitor agent) |
| Quality trend | TO FILL (compare with previous sprint run logs) |
`);
console.log(`Wrote ${logPath}`);
