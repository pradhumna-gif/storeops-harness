import request from 'supertest';
import { createApp } from '../../src/app';

describe('Activities API', () => {
  it('lists activities', async () => {
    const response = await request(createApp()).get('/api/activities');
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
  });

  it('creates an activity', async () => {
    const response = await request(createApp()).post('/api/activities').send({ title: 'Cycle count', priority: 'MEDIUM', category: 'AUDIT', assigneeId: 'associate-1', ownerId: 'associate-1', storeId: 'store-1' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('TODO');
  });

  it('supports bulk status with partial failure', async () => {
    const response = await request(createApp()).patch('/api/activities/bulk-status').set('x-user-id', 'associate-1').send({ ids: ['task-1', 'missing'], status: 'DONE' });
    expect(response.status).toBe(200);
    expect(response.body.updated).toContain('task-1');
    expect(response.body.failed[0].id).toBe('missing');
  });

  it('updates every activity when the whole bulk batch is valid', async () => {
    const response = await request(createApp()).patch('/api/activities/bulk-status').set('x-user-id', 'associate-1').send({ ids: ['task-1', 'task-3'], status: 'DONE' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ updated: ['task-1', 'task-3'], failed: [] });
  });

  it('rejects a bulk request with an invalid target status', async () => {
    const response = await request(createApp()).patch('/api/activities/bulk-status').set('x-user-id', 'associate-1').send({ ids: ['task-1'], status: 'TODO' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_BULK_STATUS');
  });

  it('rejects a bulk request with an empty id list', async () => {
    const response = await request(createApp()).patch('/api/activities/bulk-status').set('x-user-id', 'associate-1').send({ ids: [], status: 'DONE' });
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_ACTIVITY_IDS');
  });

  it('returns 404 for missing activity', async () => {
    const response = await request(createApp()).get('/api/activities/nope');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('ACTIVITY_NOT_FOUND');
  });
});
