import { Notification } from '../shared/types/domain';
export interface AlertsRepository { listForUser(userId: string): Notification[]; add(notification: Notification): Notification; }
export class InMemoryAlertsRepository implements AlertsRepository {
  private readonly notifications: Notification[] = [];
  listForUser(userId: string): Notification[] { return this.notifications.filter(n => n.userId === userId); }
  add(notification: Notification): Notification { this.notifications.push(notification); return notification; }
}
