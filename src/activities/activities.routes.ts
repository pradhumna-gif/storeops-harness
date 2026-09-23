import { Router, Request, Response } from 'express';
import { TaskStatus } from '../shared/types/domain';
import { AppError } from '../shared/errors/AppError';
import { ActivitiesService } from './activities.service';

export function createActivitiesRouter(service: ActivitiesService): Router {
  const router = Router();
  const handle = (fn: (req: Request, res: Response) => void) => (req: Request, res: Response) => {
    try { fn(req, res); } catch (error) {
      if (error instanceof AppError) res.status(error.statusCode).json({ code: error.code, message: error.message });
      else res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  };

  router.get('/', handle((req, res) => res.json(service.list({ programmeId: req.query.programmeId as string | undefined, status: req.query.status as TaskStatus | undefined }))));
  router.post('/', handle((req, res) => res.status(201).json(service.create(req.body))));
  router.patch('/bulk-status', handle((req, res) => {
    const { ids, status } = req.body as { ids: string[]; status: 'DONE' | 'BLOCKED' };
    const actorId = String(req.header('x-user-id') ?? 'associate-1');
    res.json(service.bulkStatus(ids, status, actorId));
  }));
  router.get('/:id', handle((req, res) => res.json(service.get(req.params.id))));
  router.patch('/:id', handle((req, res) => res.json(service.update(req.params.id, req.body))));
  router.delete('/:id', handle((req, res) => { service.delete(req.params.id, String(req.header('x-user-id') ?? 'associate-1')); res.status(204).send(); }));
  return router;
}
