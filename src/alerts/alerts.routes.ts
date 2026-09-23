import { Router } from 'express';
import { AlertsService } from './alerts.service';
export function createAlertsRouter(service: AlertsService): Router {
  const router = Router();
  router.get('/', (req, res) => res.json(service.list(String(req.header('x-user-id') ?? 'associate-1'))));
  return router;
}
