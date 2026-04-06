import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { ProjectsService } from '../../src/projects/projects.service'
import { Role } from '../../src/common/enums/role.enum'

describe('ProjectsService', () => {
  function createRepository() {
    return {
      create: jest.fn(),
    }
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('restricts project creation to system admins and project leads', async () => {
    const repository = createRepository()
    const service = new ProjectsService(repository as never)

    await expect(service.create({
      companyId: 'comp-1',
      actorId: 'user-1',
      actorRole: Role.ACCOUNT_OWNER,
      name: 'Portal clientes',
      description: 'Alta inicial',
    })).rejects.toThrow(ForbiddenException)

    expect(repository.create).not.toHaveBeenCalled()
  })

  it('rejects blank project names with a bad request', async () => {
    const repository = createRepository()
    const service = new ProjectsService(repository as never)

    await expect(service.create({
      companyId: 'comp-1',
      actorId: 'user-1',
      actorRole: Role.PROJECT_LEAD,
      name: '   ',
      description: 'Alta inicial',
    })).rejects.toThrow(BadRequestException)

    expect(repository.create).not.toHaveBeenCalled()
  })

  it('trims project fields before persisting them', async () => {
    const repository = createRepository()
    repository.create.mockResolvedValue({ id: 'proj-1' })
    const service = new ProjectsService(repository as never)

    await service.create({
      companyId: 'comp-1',
      actorId: 'user-1',
      actorRole: Role.SYSTEM_ADMIN,
      name: '  Portal clientes  ',
      description: '  Descripcion operativa  ',
    })

    expect(repository.create).toHaveBeenCalledWith({
      companyId: 'comp-1',
      actorId: 'user-1',
      name: 'Portal clientes',
      description: 'Descripcion operativa',
    })
  })
})
