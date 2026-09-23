import { ActivitiesService } from '../../src/activities/activities.service';
import { InMemoryActivitiesRepository } from '../../src/activities/activities.repository';
import { EventBus } from '../../src/shared/events/EventBus';

describe('ActivitiesService', () => {
  const make = () => {
    const repo = new InMemoryActivitiesRepository([{ id: 't1', title: 'Task', status: 'TODO', priority: 'HIGH', category: 'GENERAL', assigneeId: 'u1', ownerId: 'u1', storeId: 's1', updatedAt: new Date().toISOString() }]);
    const bus = new EventBus();
    const service = new ActivitiesService(repo, bus);
    return { repo, bus, service };
  };

  it('lists and gets activities', () => {
    const { service } = make();
    expect(service.list({})).toHaveLength(1);
    expect(service.get('t1').title).toBe('Task');
  });

  it('creates and validates activities', () => {
    const { service } = make();
    expect(service.create({ title: 'New', priority: 'LOW', category: 'AUDIT', assigneeId: 'u1', ownerId: 'u1', storeId: 's1' }).status).toBe('TODO');
    expect(() => service.create({ title: '', priority: 'LOW', category: 'AUDIT', assigneeId: 'u1', ownerId: 'u1', storeId: 's1' })).toThrow('title is required');
  });

  it('updates and emits status events', () => {
    const { service, bus } = make();
    const events: string[] = [];
    bus.subscribe('ACTIVITY_STATUS_CHANGED', event => events.push(String(event.payload.status)));
    expect(service.update('t1', { status: 'DONE' }).status).toBe('DONE');
    expect(events).toContain('DONE');
  });

  it('enforces delete ownership', () => {
    const { service } = make();
    expect(() => service.delete('t1', 'other')).toThrow('Only the owner');
    expect(() => service.delete('t1', 'u1')).not.toThrow();
  });

  it('performs bulk updates with partial failures and audits', () => {
    const { service, repo } = make();
    const result = service.bulkStatus(['t1', 'missing'], 'DONE', 'u1');
    expect(result.updated).toEqual(['t1']);
    expect(result.failed[0].code).toBe('ACTIVITY_NOT_FOUND');
    expect(repo.audits()).toHaveLength(1);
  });

  it('rejects invalid bulk input', () => {
    const { service } = make();
    expect(() => service.bulkStatus([], 'DONE', 'u1')).toThrow('At least one');
    expect(() => service.bulkStatus(undefined as unknown as string[], 'DONE', 'u1')).toThrow('At least one');
    expect(() => service.bulkStatus(['t1'], 'TODO' as 'DONE', 'u1')).toThrow('DONE or BLOCKED');
    expect(service.bulkStatus(['t1'], 'BLOCKED', 'store-manager-1').updated).toEqual(['t1']);
  });

  it('updates every id when all are valid and authorized', () => {
    const { service, repo } = make();
    repo.save({ id: 't2', title: 'Second', status: 'TODO', priority: 'LOW', category: 'GENERAL', assigneeId: 'u1', ownerId: 'u1', storeId: 's1', updatedAt: new Date().toISOString() });
    const result = service.bulkStatus(['t1', 't2'], 'DONE', 'u1');
    expect(result.updated).toEqual(['t1', 't2']);
    expect(result.failed).toHaveLength(0);
    expect(service.get('t1').status).toBe('DONE');
    expect(service.get('t2').status).toBe('DONE');
  });

  it('fails unauthorized items independently without blocking authorized ones', () => {
    const { service, repo } = make();
    repo.save({ id: 't2', title: 'Owned by other', status: 'TODO', priority: 'LOW', category: 'GENERAL', assigneeId: 'other', ownerId: 'other', storeId: 's1', updatedAt: new Date().toISOString() });
    const result = service.bulkStatus(['t1', 't2'], 'BLOCKED', 'u1');
    expect(result.updated).toEqual(['t1']);
    expect(result.failed).toEqual([{ id: 't2', code: 'FORBIDDEN', message: 'Actor cannot update activity t2' }]);
    expect(service.get('t2').status).toBe('TODO');
  });

  it('creates no audit entry for a failed item in a mixed batch', () => {
    const { service, repo } = make();
    service.bulkStatus(['t1', 'missing'], 'DONE', 'u1');
    const audits = repo.audits();
    expect(audits).toHaveLength(1);
    expect(audits[0].taskId).toBe('t1');
    expect(audits.some(a => a.taskId === 'missing')).toBe(false);
  });

  it('emits exactly one ACTIVITY_STATUS_CHANGED event per successful item', () => {
    const { service, bus, repo } = make();
    repo.save({ id: 't2', title: 'Second', status: 'TODO', priority: 'LOW', category: 'GENERAL', assigneeId: 'u1', ownerId: 'u1', storeId: 's1', updatedAt: new Date().toISOString() });
    const events: unknown[] = [];
    bus.subscribe('ACTIVITY_STATUS_CHANGED', event => events.push(event.payload));
    service.bulkStatus(['t1', 't2', 'missing'], 'DONE', 'u1');
    expect(events).toHaveLength(2);
  });
});
