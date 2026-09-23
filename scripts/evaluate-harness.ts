/* eslint-disable no-console */
// Deterministic half of the Evaluator: runs hard gates 1-9 and prints a routing marker.
// The LLM Evaluator runs this first, then adds the weighted review (see .harness/agents/evaluator.agent.md).
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const checks: Array<{ gate: string; command: string }> = [
  { gate: 'HG1 TypeScript strict (tsc --noEmit)', command: 'npm run typecheck' },
  { gate: 'HG2 ESLint zero errors', command: 'npm run lint' },
  { gate: 'HG4/HG6 Dependency boundaries (dependency-cruiser)', command: 'npm run arch:check' },
  { gate: 'HG3/HG7-9 Jest + coverage thresholds', command: 'npm run test:coverage' }
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const failures: string[] = [];
for (const check of checks) {
  try {
    execSync(check.command, { stdio: 'inherit' });
    console.log(`PASS: ${check.gate}`);
  } catch {
    failures.push(check.gate);
    console.error(`FAIL: ${check.gate}`);
  }
}

const sourceFiles = walk('src').filter(file => file.endsWith('.ts'));
const layerFiles = sourceFiles.filter(file => /\.(service|routes)\.ts$/.test(file));
const scans: Array<{ gate: string; files: string[]; pattern: RegExp }> = [
  { gate: 'HG5 No raw Error throws in routes/services', files: layerFiles, pattern: /throw new Error\(/ },
  { gate: 'HG6 No direct NotificationService/AlertsService/ReportService import outside src/app.ts', files: sourceFiles.filter(file => !/[\\/](alerts|reports)[\\/]/.test(file) && !file.endsWith('app.ts')), pattern: /(Notification|Alerts|Reports?)Service\b/ },
  { gate: 'Rule 5 Reports module performs no writes', files: sourceFiles.filter(file => /[\\/]reports[\\/]/.test(file)), pattern: /\.(save|add|addAudit|delete|update|create|bulkStatus)\(/ }
];
for (const scan of scans) {
  const hits: string[] = [];
  for (const file of scan.files) {
    readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
      if (scan.pattern.test(line)) hits.push(`${file}:${index + 1}`);
    });
  }
  if (hits.length) {
    failures.push(scan.gate);
    console.error(`FAIL: ${scan.gate} -> ${hits.join(', ')}`);
  } else {
    console.log(`PASS: ${scan.gate}`);
  }
}

console.log(`HARD-GATES: ${failures.length ? `FAIL (${failures.length})` : 'PASS'}`);
process.exitCode = failures.length ? 1 : 0;
