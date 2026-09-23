import express from 'express';
import { InMemoryActivitiesRepository } from './activities/activities.repository';
import { createActivitiesRouter } from './activities/activities.routes';
import { ActivitiesService } from './activities/activities.service';
import { InMemoryAlertsRepository } from './alerts/alerts.repository';
import { AlertsService } from './alerts/alerts.service';
import { createAlertsRouter } from './alerts/alerts.routes';
import { EventBus } from './shared/events/EventBus';
import { InMemoryProgrammesRepository } from './programmes/programmes.repository';
import { ProgrammesService } from './programmes/programmes.service';
import { createProgrammesRouter } from './programmes/programmes.routes';
import { ReportsService } from './reports/reports.service';
import { createReportsRouter } from './reports/reports.routes';
import { Task } from './shared/types/domain';

const seed: Task[] = [
  { id: 'task-1', title: 'Restock dairy', status: 'TODO', priority: 'HIGH', category: 'RESTOCKING', assigneeId: 'associate-1', ownerId: 'associate-1', storeId: 'store-1', dueDate: '2099-12-31T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: 'task-2', title: 'Planogram reset', status: 'IN_PROGRESS', priority: 'CRITICAL', category: 'PLANOGRAM', assigneeId: 'lead-1', ownerId: 'lead-1', storeId: 'store-1', dueDate: '2099-12-31T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: 'task-3', title: 'Compliance audit', status: 'BLOCKED', priority: 'MEDIUM', category: 'COMPLIANCE', assigneeId: 'associate-1', ownerId: 'associate-1', storeId: 'store-1', dueDate: '2099-12-31T00:00:00.000Z', updatedAt: new Date().toISOString() }
];

export function createApp() {
  const app = express();
  app.use(express.json());
  const eventBus = new EventBus();
  const activitiesRepo = new InMemoryActivitiesRepository(seed);
  const activitiesService = new ActivitiesService(activitiesRepo, eventBus);
  const programmesService = new ProgrammesService(new InMemoryProgrammesRepository());
  const alertsRepo = new InMemoryAlertsRepository();
  const alertsService = new AlertsService(alertsRepo);
  eventBus.subscribe('ACTIVITY_STATUS_CHANGED', event => {
    const status = String(event.payload.status);
    if (status === 'BLOCKED') {
      alertsService.create({ userId: 'lead-1', type: 'SHIFT_HANDOVER', message: `Activity ${String(event.payload.taskId)} is blocked`, status: 'UNREAD', channel: 'IN_APP' });
    }
  });
  const reportsService = new ReportsService(activitiesService);

  app.get('/health', (_req, res) => res.json({ status: 'UP', service: 'StoreOps' }));
  app.use('/api/activities', createActivitiesRouter(activitiesService));
  app.use('/api/programmes', createProgrammesRouter(programmesService));
  app.use('/api/alerts', createAlertsRouter(alertsService));
  app.use('/api/reports', createReportsRouter(reportsService));
  return app;
}
