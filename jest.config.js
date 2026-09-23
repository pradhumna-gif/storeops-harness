// Coverage thresholds are StoreOps hard gates 7-9 (see .harness/skills/evaluation-criteria/SKILL.md).
// A glob threshold applies to every matching file individually, so one weak service fails the run.
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: { lines: 70 },
    './src/**/*.service.ts': { lines: 80 },
    './src/**/*.routes.ts': { lines: 70 },
    './src/shared/**/*.ts': { lines: 60 }
  }
};
