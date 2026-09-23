import { Router, Request, Response } from 'express';
import { AppError } from '../shared/errors/AppError';
import { ProgrammesService } from './programmes.service';
export function createProgrammesRouter(service: ProgrammesService): Router {
  const router = Router();
  const guard = (fn: (req: Request, res: Response) => void) => (req: Request, res: Response) => {
    try { fn(req, res); } catch (error) {
      if (error instanceof AppError) res.status(error.statusCode).json({ code: error.code, message: error.message });
      else res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  };
  router.get('/', guard((req, res) => res.json(service.list(String(req.header('x-store-id') ?? 'store-1')))));
  router.post('/', guard((req, res) => res.status(201).json(service.create({ name: req.body.name, storeId: String(req.header('x-store-id') ?? 'store-1') }))));
  router.post('/:id/members', guard((req, res) => res.status(201).json(service.addMember(req.params.id, req.body.userId))));
  return router;
}
