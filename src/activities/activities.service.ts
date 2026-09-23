import { AppError } from '../shared/errors/AppError';
import { EventBus } from '../shared/events/EventBus';
import { AuditEntry, Task, TaskCategory, TaskPriority, TaskStatus } from '../shared/types/domain';
import { ActivitiesRepository } from './activities.repository';

export interface BulkStatusResult {
  updated: string[];
  failed: Array<{ id: string; code: string; message: string }>;
}

export class ActivitiesService {
  constructor(private readonly repo: ActivitiesRepository, private readonly eventBus: EventBus) {}

  list(filters: { programmeId?: string; status?: TaskStatus }): Task[] { return this.repo.list(filters); }

  get(id: string): Task {
    const task = this.repo.findById(id);
    if (!task) throw new AppError('ACTIVITY_NOT_FOUND', `Activity ${id} was not found`, 404);
    return task;
  }

  create(input: Pick<Task, 'title' | 'priority' | 'category' | 'assigneeId' | 'ownerId' | 'storeId'> & Partial<Pick<Task, 'programmeId' | 'dueDate'>>): Task {
    if (!input.title?.trim()) throw new AppError('INVALID_TITLE', 'title is required', 400);
    const now = new Date().toISOString();
    const task: Task = { id: `task-${Date.now()}-${Math.random().toString(16).slice(2)}`, status: 'TODO', updatedAt: now, ...input };
    return this.repo.save(task);
  }

  update(id: string, input: Partial<Pick<Task, 'status' | 'priority' | 'category' | 'assigneeId'>>): Task {
    const task = this.get(id);
    const updated = { ...task, ...input, updatedAt: new Date().toISOString() };
    const saved = this.repo.save(updated);
    if (input.status && input.status !== task.status) this.emitStatusEvent(saved);
    return saved;
  }

  delete(id: string, actorId: string): void {
    const task = this.get(id);
    if (task.ownerId !== actorId && actorId !== 'store-manager-1') {
      throw new AppError('FORBIDDEN', 'Only the owner or store manager can delete an activity', 403);
    }
    this.repo.delete(id);
  }

  bulkStatus(ids: string[], status: Extract<TaskStatus, 'DONE' | 'BLOCKED'>, actorId: string): BulkStatusResult {
    if (!Array.isArray(ids) || ids.length === 0) throw new AppError('INVALID_ACTIVITY_IDS', 'At least one activity id is required', 400);
    if (!['DONE', 'BLOCKED'].includes(status)) throw new AppError('INVALID_BULK_STATUS', 'Bulk status must be DONE or BLOCKED', 400);

    const result: BulkStatusResult = { updated: [], failed: [] };
    for (const id of ids) {
      try {
        const task = this.get(id);
        if (task.assigneeId !== actorId && task.ownerId !== actorId && actorId !== 'store-manager-1') {
          throw new AppError('FORBIDDEN', `Actor cannot update activity ${id}`, 403);
        }
        const saved = this.repo.save({ ...task, status, updatedAt: new Date().toISOString() });
        const audit: AuditEntry = { id: `audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, taskId: id, action: `STATUS_${status}`, actorId, timestamp: new Date().toISOString() };
        this.repo.addAudit(audit);
        this.eventBus.emit('ACTIVITY_STATUS_CHANGED', { taskId: id, status, actorId });
        result.updated.push(saved.id);
      } catch (error) {
        if (error instanceof AppError) result.failed.push({ id, code: error.code, message: error.message });
        else result.failed.push({ id, code: 'UNKNOWN', message: 'Activity update failed' });
      }
    }
    return result;
  }

  private emitStatusEvent(task: Task): void {
    if (task.status === 'DONE' || task.status === 'BLOCKED') {
      this.eventBus.emit('ACTIVITY_STATUS_CHANGED', { taskId: task.id, status: task.status, storeId: task.storeId });
    }
  }
}

export const taskDefaults = {
  priority: 'MEDIUM' as TaskPriority,
  category: 'GENERAL' as TaskCategory
};
