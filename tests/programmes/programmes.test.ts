import request from 'supertest';
import { createApp } from '../../src/app';

describe('Programmes API', () => {
  it('creates, lists and adds a member', async () => {
    const app = createApp();
    const created = await request(app).post('/api/programmes').set('x-store-id', 'store-1').send({ name: 'Holiday rollout' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    expect((await request(app).get('/api/programmes').set('x-store-id', 'store-1')).body).toHaveLength(1);
    const member = await request(app).post(`/api/programmes/${id}/members`).send({ userId: 'lead-1' });
    expect(member.status).toBe(201);
    expect(member.body.memberIds).toContain('lead-1');
  });

  it('validates programme input', async () => {
    const response = await request(createApp()).post('/api/programmes').send({ name: '' });
    expect(response.status).toBe(400);
  });
});
