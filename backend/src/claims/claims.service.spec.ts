import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClaimsRepository } from './claims.repository';
import { ClaimsService } from './claims.service';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let repository: ClaimsRepository;

  beforeEach(async () => {
    const repositoryMock: ClaimsRepository = {
      create: jest.fn(),
      findPage: jest.fn(),
      count: jest.fn(),
      stats: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: ClaimsRepository, useValue: repositoryMock },
      ],
    }).compile();

    service = moduleRef.get(ClaimsService);
    repository = moduleRef.get(ClaimsRepository);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('delegates creation to the repository and returns its result', async () => {
    const dto = { title: 'Test claim', description: 'A description' };
    const created = { id: '1', ...dto, status: 'pending', totalAmount: 0, damages: [] };
    (repository.create as jest.Mock).mockResolvedValue(created);

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('returns a paginated page of claims with the total count', async () => {
    const items = [{ id: '1' }, { id: '2' }];
    (repository.findPage as jest.Mock).mockResolvedValue(items);
    (repository.count as jest.Mock).mockResolvedValue(12);

    const result = await service.findPage(2, 5);

    expect(repository.findPage).toHaveBeenCalledWith(5, 5); // skip = (2-1)*5
    expect(repository.count).toHaveBeenCalled();
    expect(result).toEqual({ items, total: 12, page: 2, limit: 5 });
  });

  it('delegates portfolio stats to the repository', async () => {
    const stats = {
      total: 3,
      byStatus: { pending: 1, in_review: 1, finalized: 1, canceled: 0 },
      totalValue: 250,
    };
    (repository.stats as jest.Mock).mockResolvedValue(stats);

    const result = await service.getStats();

    expect(repository.stats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });

  it('returns the claim when found', async () => {
    const claim = { id: '1', title: 'X' };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    const result = await service.findOne('1');

    expect(repository.findById).toHaveBeenCalledWith('1');
    expect(result).toBe(claim);
  });

  it('throws NotFoundException when the claim does not exist', async () => {
    (repository.findById as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates a claim and returns the result', async () => {
    const existing = { status: 'pending', description: '', damages: [] };
    const updated = { id: '1', title: 'New title' };
    (repository.findById as jest.Mock).mockResolvedValue(existing);
    (repository.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.update('1', { title: 'New title' });

    expect(repository.update).toHaveBeenCalledWith('1', { title: 'New title' });
    expect(result).toBe(updated);
  });

  it('rejects a forbidden status transition without persisting', async () => {
    const existing = { status: 'in_review', description: '', damages: [] };
    (repository.findById as jest.Mock).mockResolvedValue(existing);

    await expect(
      service.update('1', { status: 'canceled' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('finalizes using the description provided in the update', async () => {
    const existing = {
      status: 'pending',
      description: '',
      damages: [{ severity: 'high' }],
    };
    const updated = { id: '1', status: 'finalized' };
    (repository.findById as jest.Mock).mockResolvedValue(existing);
    (repository.update as jest.Mock).mockResolvedValue(updated);

    const dto = { status: 'finalized', description: 'x'.repeat(101) } as const;
    const result = await service.update('1', dto);

    expect(repository.update).toHaveBeenCalledWith('1', dto);
    expect(result).toBe(updated);
  });

  it('changes status when neither the update nor the claim has a description', async () => {
    const existing = { status: 'pending', damages: [] }; // no description
    const updated = { id: '1', status: 'in_review' };
    (repository.findById as jest.Mock).mockResolvedValue(existing);
    (repository.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.update('1', { status: 'in_review' });

    expect(result).toBe(updated);
  });

  it('adds a damage and recomputes the total', async () => {
    const claim = { status: 'pending', damages: [] as unknown[], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);
    (repository.save as jest.Mock).mockImplementation((c) => Promise.resolve(c));

    const dto = {
      part: 'door',
      description: 'dent',
      imageUrl: 'https://example.com/d.jpg',
      price: 100,
      score: 5,
      severity: 'low',
    } as never;
    const result = await service.addDamage('1', dto);

    expect(claim.damages).toHaveLength(1);
    expect(claim.totalAmount).toBe(100);
    expect(repository.save).toHaveBeenCalledWith(claim);
    expect(result).toBe(claim);
  });

  it('rejects adding a damage when the claim is not pending', async () => {
    const claim = { status: 'finalized', damages: [], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    await expect(
      service.addDamage('1', {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('replaces a damage and recomputes the total', async () => {
    const damage = { _id: { toString: () => 'd1' }, part: 'old', price: 50 };
    const claim = { status: 'pending', damages: [damage], totalAmount: 50 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);
    (repository.save as jest.Mock).mockImplementation((c) => Promise.resolve(c));

    const dto = {
      part: 'new',
      description: 'd',
      imageUrl: 'https://example.com/x.jpg',
      price: 200,
      score: 3,
      severity: 'mid',
    } as never;
    await service.replaceDamage('1', 'd1', dto);

    expect(damage.part).toBe('new');
    expect(claim.totalAmount).toBe(200);
    expect(repository.save).toHaveBeenCalledWith(claim);
  });

  it('throws 404 when replacing a damage that does not exist', async () => {
    const claim = { status: 'pending', damages: [], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    await expect(
      service.replaceDamage('1', 'missing', {} as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects replacing a damage when the claim is not pending', async () => {
    const claim = { status: 'finalized', damages: [], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    await expect(
      service.replaceDamage('1', 'd1', {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a damage and recomputes the total', async () => {
    const damage = { _id: { toString: () => 'd1' }, price: 100 };
    const other = { _id: { toString: () => 'd2' }, price: 50 };
    const claim = { status: 'pending', damages: [damage, other], totalAmount: 150 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);
    (repository.save as jest.Mock).mockImplementation((c) => Promise.resolve(c));

    await service.removeDamage('1', 'd1');

    expect(claim.damages).toHaveLength(1);
    expect(claim.damages[0]).toBe(other);
    expect(claim.totalAmount).toBe(50);
    expect(repository.save).toHaveBeenCalledWith(claim);
  });

  it('throws 404 when removing a damage that does not exist', async () => {
    const claim = { status: 'pending', damages: [], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    await expect(service.removeDamage('1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects removing a damage when the claim is not pending', async () => {
    const claim = { status: 'finalized', damages: [], totalAmount: 0 };
    (repository.findById as jest.Mock).mockResolvedValue(claim);

    await expect(service.removeDamage('1', 'd1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
