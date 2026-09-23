import { AppError } from '../shared/errors/AppError';
import { Project } from '../shared/types/domain';
import { ProgrammesRepository } from './programmes.repository';
export class ProgrammesService {
  constructor(private readonly repo: ProgrammesRepository) {}
  list(storeId: string): Project[] { return this.repo.list(storeId); }
  create(input: Pick<Project, 'name' | 'storeId'>): Project {
    if (!input.name?.trim()) throw new AppError('INVALID_NAME', 'Programme name is required', 400);
    return this.repo.save({ id: `programme-${Date.now()}`, name: input.name, storeId: input.storeId, status: 'PLANNED', memberIds: [] });
  }
  addMember(id: string, userId: string): Project {
    const project = this.repo.find(id);
    if (!project) throw new AppError('PROGRAMME_NOT_FOUND', `Programme ${id} was not found`, 404);
    if (!userId) throw new AppError('INVALID_MEMBER', 'userId is required', 400);
    if (!project.memberIds.includes(userId)) project.memberIds.push(userId);
    return this.repo.save(project);
  }
}
