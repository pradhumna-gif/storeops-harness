export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskCategory = 'RESTOCKING' | 'PLANOGRAM' | 'AUDIT' | 'COMPLIANCE' | 'GENERAL';

export interface Task {
  id: string;
  programmeId?: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string;
  ownerId: string;
  storeId: string;
  dueDate?: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  storeId: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  memberIds: string[];
}

export interface User {
  id: string;
  name: string;
  role: 'REGIONAL_MANAGER' | 'STORE_MANAGER' | 'DEPARTMENT_LEAD' | 'ASSOCIATE';
  storeId: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'INVENTORY' | 'SLA_BREACH' | 'SHIFT_HANDOVER' | 'ESCALATION';
  message: string;
  status: 'UNREAD' | 'READ';
  channel: 'IN_APP' | 'EMAIL';
}

export interface AuditEntry {
  id: string;
  taskId: string;
  action: string;
  actorId: string;
  timestamp: string;
}
