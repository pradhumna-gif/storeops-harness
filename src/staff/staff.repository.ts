import { User } from '../shared/types/domain';
export interface StaffRepository { findById(id: string): User | undefined; }
export class InMemoryStaffRepository implements StaffRepository {
  private readonly users = new Map<string, User>([
    ['associate-1', { id: 'associate-1', name: 'Asha Associate', role: 'ASSOCIATE', storeId: 'store-1' }],
    ['lead-1', { id: 'lead-1', name: 'Ravi Lead', role: 'DEPARTMENT_LEAD', storeId: 'store-1' }],
    ['store-manager-1', { id: 'store-manager-1', name: 'Mina Manager', role: 'STORE_MANAGER', storeId: 'store-1' }]
  ]);
  findById(id: string): User | undefined { return this.users.get(id); }
}
