import { AuditEntry, Task, TaskStatus } from '../shared/types/domain';

export interface ActivitiesRepository {
  list(filters?: { programmeId?: string; status?: TaskStatus }): Task[];
  findById(id: string): Task | undefined;
  save(task: Task): Task;
  delete(id: string): boolean;
  addAudit(entry: AuditEntry): void;
  audits(): AuditEntry[];
}

export class InMemoryActivitiesRepository implements ActivitiesRepository {
  private readonly tasks = new Map<string, Task>();
  private readonly auditEntries: AuditEntry[] = [];

  constructor(seed: Task[] = []) {
    seed.forEach(task => this.tasks.set(task.id, task));
  }

  list(filters: { programmeId?: string; status?: TaskStatus } = {}): Task[] {
    return [...this.tasks.values()].filter(task =>
      (!filters.programmeId || task.programmeId === filters.programmeId) &&
      (!filters.status || task.status === filters.status)
    );
  }

  findById(id: string): Task | undefined { return this.tasks.get(id); }
  save(task: Task): Task { this.tasks.set(task.id, task); return task; }
  delete(id: string): boolean { return this.tasks.delete(id); }
  addAudit(entry: AuditEntry): void { this.auditEntries.push(entry); }
  audits(): AuditEntry[] { return [...this.auditEntries]; }
}
