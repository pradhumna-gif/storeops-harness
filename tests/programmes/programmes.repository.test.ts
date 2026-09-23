import { InMemoryProgrammesRepository } from '../../src/programmes/programmes.repository';
describe('ProgrammesRepository', () => {
  it('stores and filters projects', () => {
    const repo = new InMemoryProgrammesRepository();
    repo.save({ id: 'p1', name: 'P', storeId: 's1', status: 'PLANNED', memberIds: [] });
    repo.save({ id: 'p2', name: 'Q', storeId: 's2', status: 'PLANNED', memberIds: [] });
    expect(repo.list('s1')).toHaveLength(1);
    expect(repo.find('p1')?.name).toBe('P');
  });
});
