import { InMemoryAlertsRepository } from '../../src/alerts/alerts.repository';
describe('AlertsRepository', () => {
  it('stores and filters notifications', () => {
    const repo = new InMemoryAlertsRepository();
    repo.add({ id: 'a1', userId: 'u1', type: 'INVENTORY', message: 'm', status: 'UNREAD', channel: 'IN_APP' });
    repo.add({ id: 'a2', userId: 'u2', type: 'INVENTORY', message: 'm', status: 'UNREAD', channel: 'IN_APP' });
    expect(repo.listForUser('u1')).toHaveLength(1);
  });
});
