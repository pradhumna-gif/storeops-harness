const modules = ['activities', 'programmes', 'staff', 'alerts', 'reports'];
const forbidden = [];
for (const source of modules) {
  const others = modules.filter(target => target !== source).join('|');
  forbidden.push({
    name: `no-${source}-cross-module-repository-imports`,
    comment: 'Architecture rule 2: cross-module reads go through the target module service, never its repository.',
    severity: 'error',
    from: { path: `^src/${source}/` },
    to: { path: `^src/(${others})/.*repository` }
  });
}
forbidden.push(
  {
    name: 'no-direct-alerts-or-reports-service-coupling',
    comment: 'Architecture rule 3: cross-module side effects use EventBus.emit(); only the composition root (src/app.ts) wires alerts/reports.',
    severity: 'error',
    from: { path: '^src/(activities|programmes|staff)/' },
    to: { path: '^src/(alerts|reports)/' }
  },
  {
    name: 'reports-is-read-only',
    comment: 'Architecture rule 5: reports may only depend on sibling services for read-only lookups.',
    severity: 'error',
    from: { path: '^src/reports/' },
    to: { path: '^src/(activities|programmes|staff|alerts)/.*\\.(repository|routes)\\.ts$' }
  },
  { name: 'routes-do-not-import-repositories', severity: 'error', from: { path: 'src/.*/.*routes\\.ts$' }, to: { path: 'repository' } },
  { name: 'repositories-do-not-import-routes', severity: 'error', from: { path: 'repository' }, to: { path: 'routes' } },
  { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } }
);
module.exports = {
  forbidden,
  options: {
    doNotFollow: { path: 'node_modules' },
    // Type-only imports (`import { X }` used only as a type) are erased by tsc. Without this flag
    // dependency-cruiser ignores them, which let src/reports/reports.service.ts -> activities.repository pass
    // sprint-1 undetected. See REFLECTION.md.
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    includeOnly: '^src'
  }
};
