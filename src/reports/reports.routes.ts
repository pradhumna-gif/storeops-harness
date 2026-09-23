import { Router } from 'express';
import { ReportsService } from './reports.service';
export function createReportsRouter(service: ReportsService): Router {
  const router = Router();
  router.get('/region/:id', (req, res) => res.json(service.regionSummary(req.params.id)));
  return router;
}
