import { InMemoryActivitiesRepository } from '../../src/activities/activities.repository';

describe('ActivitiesRepository', () => {
  it('supports filtering and audit storage', () => {
    const repo = new InMemoryActivitiesRepository([{ id: 't1', title: 'T', status: 'DONE', priority: 'HIGH', category: 'GENERAL', assigneeId: 'u1', ownerId: 'u1', storeId: 's1', programmeId: 'p1', updatedAt: new Date().toISOString() }]);
    expect(repo.list({ status: 'DONE', programmeId: 'p1' })).toHaveLength(1);
    expect(repo.findById('missing')).toBeUndefined();
    expect(repo.delete('t1')).toBe(true);
    repo.addAudit({ id: 'a', taskId: 't1', action: 'STATUS_DONE', actorId: 'u1', timestamp: new Date().toISOString() });
    expect(repo.audits()).toHaveLength(1);
  });
});
