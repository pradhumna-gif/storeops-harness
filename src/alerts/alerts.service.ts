import { Notification } from '../shared/types/domain';
import { AlertsRepository } from './alerts.repository';
export class AlertsService {
  constructor(private readonly repo: AlertsRepository) {}
  list(userId: string): Notification[] { return this.repo.listForUser(userId); }
  create(notification: Omit<Notification, 'id'>): Notification { return this.repo.add({ id: `alert-${Date.now()}`, ...notification }); }
}
