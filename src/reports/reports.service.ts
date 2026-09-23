import { Task } from '../shared/types/domain';
import { ActivitiesService } from '../activities/activities.service';

// Reports reads activities through the activities service layer only (read-only lookup, architecture rule 2 and 5).
export type ActivitiesReader = Pick<ActivitiesService, 'list'>;

export class ReportsService {
  constructor(private readonly activities: ActivitiesReader) {}
  regionSummary(regionId: string): { regionId: string; totalTasks: number; completionRate: number; overdueCount: number; blockedTasks: Task[] } {
    const tasks = this.activities.list({});
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < new Date().toISOString() && t.status !== 'DONE').length;
    return { regionId, totalTasks: total, completionRate: total ? Number(((done / total) * 100).toFixed(2)) : 0, overdueCount: overdue, blockedTasks: tasks.filter(t => t.status === 'BLOCKED') };
  }
}
