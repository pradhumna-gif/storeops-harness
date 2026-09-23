import { StaffService } from '../src/staff/staff.service';
import { InMemoryStaffRepository } from '../src/staff/staff.repository';
describe('StaffService', () => {
  it('finds known users and rejects unknown users', () => {
    const service = new StaffService(new InMemoryStaffRepository());
    expect(service.get('associate-1').role).toBe('ASSOCIATE');
    expect(() => service.get('unknown')).toThrow('was not found');
  });
});
