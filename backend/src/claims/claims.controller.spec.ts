import { Test } from '@nestjs/testing';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

describe('ClaimsController', () => {
  let controller: ClaimsController;
  let service: ClaimsService;

  beforeEach(async () => {
    const serviceMock = {
      create: jest.fn(),
      findPage: jest.fn(),
      getStats: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      addDamage: jest.fn(),
      replaceDamage: jest.fn(),
      removeDamage: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [{ provide: ClaimsService, useValue: serviceMock }],
    }).compile();

    controller = moduleRef.get(ClaimsController);
    service = moduleRef.get(ClaimsService);
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates creation to the service and returns its result', async () => {
    const dto = { title: 'Test claim' };
    const created = { id: '1', title: 'Test claim' };
    (service.create as jest.Mock).mockResolvedValue(created);

    const result = await controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toBe(created);
  });

  it('delegates listing to the service with pagination params', async () => {
    const page = { items: [{ id: '1' }], total: 1, page: 2, limit: 5 };
    (service.findPage as jest.Mock).mockResolvedValue(page);

    const result = await controller.list({ page: 2, limit: 5 });

    expect(service.findPage).toHaveBeenCalledWith(2, 5);
    expect(result).toBe(page);
  });

  it('delegates stats to the service and returns its result', async () => {
    const stats = {
      total: 1,
      byStatus: { pending: 1, in_review: 0, finalized: 0, canceled: 0 },
      totalValue: 0,
    };
    (service.getStats as jest.Mock).mockResolvedValue(stats);

    const result = await controller.stats();

    expect(service.getStats).toHaveBeenCalled();
    expect(result).toBe(stats);
  });

  it('delegates getting one to the service and returns its result', async () => {
    const claim = { id: '1' };
    (service.findOne as jest.Mock).mockResolvedValue(claim);

    const result = await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');
    expect(result).toBe(claim);
  });

  it('delegates updating to the service and returns its result', async () => {
    const updated = { id: '1', title: 'New' };
    (service.update as jest.Mock).mockResolvedValue(updated);

    const result = await controller.update('1', { title: 'New' });

    expect(service.update).toHaveBeenCalledWith('1', { title: 'New' });
    expect(result).toBe(updated);
  });

  it('delegates adding a damage to the service and returns its result', async () => {
    const updated = { id: '1', totalAmount: 100 };
    (service.addDamage as jest.Mock).mockResolvedValue(updated);
    const dto = { part: 'door' } as never;

    const result = await controller.addDamage('1', dto);

    expect(service.addDamage).toHaveBeenCalledWith('1', dto);
    expect(result).toBe(updated);
  });

  it('delegates replacing a damage to the service and returns its result', async () => {
    const updated = { id: '1', totalAmount: 200 };
    (service.replaceDamage as jest.Mock).mockResolvedValue(updated);
    const dto = { part: 'new' } as never;

    const result = await controller.replaceDamage('1', 'd1', dto);

    expect(service.replaceDamage).toHaveBeenCalledWith('1', 'd1', dto);
    expect(result).toBe(updated);
  });

  it('delegates removing a damage to the service and returns its result', async () => {
    const updated = { id: '1', totalAmount: 0 };
    (service.removeDamage as jest.Mock).mockResolvedValue(updated);

    const result = await controller.removeDamage('1', 'd1');

    expect(service.removeDamage).toHaveBeenCalledWith('1', 'd1');
    expect(result).toBe(updated);
  });
});
