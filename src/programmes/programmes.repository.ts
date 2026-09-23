import { Project } from '../shared/types/domain';
export interface ProgrammesRepository { list(storeId: string): Project[]; save(project: Project): Project; find(id: string): Project | undefined; }
export class InMemoryProgrammesRepository implements ProgrammesRepository {
  private readonly projects = new Map<string, Project>();
  list(storeId: string): Project[] { return [...this.projects.values()].filter(p => p.storeId === storeId); }
  save(project: Project): Project { this.projects.set(project.id, project); return project; }
  find(id: string): Project | undefined { return this.projects.get(id); }
}
