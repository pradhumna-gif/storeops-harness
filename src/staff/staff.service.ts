import { AppError } from '../shared/errors/AppError';
import { User } from '../shared/types/domain';
import { StaffRepository } from './staff.repository';
export class StaffService {
  constructor(private readonly repo: StaffRepository) {}
  get(id: string): User {
    const user = this.repo.findById(id);
    if (!user) throw new AppError('USER_NOT_FOUND', `User ${id} was not found`, 404);
    return user;
  }
}
