import { AlertsService } from '../../src/alerts/alerts.service';
import { InMemoryAlertsRepository } from '../../src/alerts/alerts.repository';
describe('AlertsService', () => {
  it('creates and lists alerts', () => {
    const service = new AlertsService(new InMemoryAlertsRepository());
    service.create({ userId: 'u1', type: 'INVENTORY', message: 'low', status: 'UNREAD', channel: 'IN_APP' });
    expect(service.list('u1')).toHaveLength(1);
  });
});
