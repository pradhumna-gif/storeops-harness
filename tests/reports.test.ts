import { ReportsService } from '../src/reports/reports.service';
import { ActivitiesService } from '../src/activities/activities.service';
import { InMemoryActivitiesRepository } from '../src/activities/activities.repository';
import { EventBus } from '../src/shared/events/EventBus';

describe('ReportsService', () => {
  const make = () => {
    const repo = new InMemoryActivitiesRepository([
      { id: '1', title: 'done', status: 'DONE', priority: 'LOW', category: 'GENERAL', assigneeId: 'u', ownerId: 'u', storeId: 's', updatedAt: new Date().toISOString() },
      { id: '2', title: 'blocked', status: 'BLOCKED', priority: 'HIGH', category: 'COMPLIANCE', assigneeId: 'u', ownerId: 'u', storeId: 's', dueDate: '2000-01-01T00:00:00.000Z', updatedAt: new Date().toISOString() }
    ]);
    return { repo, service: new ReportsService(new ActivitiesService(repo, new EventBus())) };
  };

  it('calculates a read-only summary', () => {
    const result = make().service.regionSummary('r1');
    expect(result.completionRate).toBe(50);
    expect(result.overdueCount).toBe(1);
    expect(result.blockedTasks).toHaveLength(1);
  });

  it('never mutates activities or audit records', () => {
    const { repo, service } = make();
    const before = JSON.stringify(repo.list());
    service.regionSummary('r1');
    expect(JSON.stringify(repo.list())).toBe(before);
    expect(repo.audits()).toHaveLength(0);
  });

  it('returns a zero completion rate when there are no activities', () => {
    const empty = new ReportsService({ list: () => [] });
    expect(empty.regionSummary('r2')).toEqual({ regionId: 'r2', totalTasks: 0, completionRate: 0, overdueCount: 0, blockedTasks: [] });
  });
});
