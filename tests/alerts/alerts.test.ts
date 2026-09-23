import request from 'supertest';
import { createApp } from '../../src/app';

describe('Alerts and reports', () => {
  it('returns alerts and a region report', async () => {
    const app = createApp();
    const alerts = await request(app).get('/api/alerts').set('x-user-id', 'associate-1');
    expect(alerts.status).toBe(200);
    const report = await request(app).get('/api/reports/region/r1');
    expect(report.status).toBe(200);
    expect(report.body.regionId).toBe('r1');
    expect(report.body.totalTasks).toBe(3);
  });
});
