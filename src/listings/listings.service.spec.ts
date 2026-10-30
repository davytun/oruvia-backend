import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { CreateListingDto } from './dto/create-listing.dto.js';
import type { MyListingsQueryDto } from './dto/my-listings.query.dto.js';
import type { SearchListingsQueryDto } from './dto/search-listings.query.dto.js';
import type { UpdateListingDto } from './dto/update-listing.dto.js';
import { Listing } from './entities/listing.entity.js';
import { ListingsService } from './listings.service.js';
import type { ListingsStorageProvider } from './storage/listings-storage.interface.js';

type Repo = Partial<Record<keyof Repository<Listing>, any>>;

const lister = { id: 'agent-123', fullName: 'Alice Agent' };

const baseDto: CreateListingDto = {
  title: '3-bedroom duplex with BQ in Lekki',
  listingType: 'rent',
  price: 2500000,
  state: 'Lagos',
  city: 'Lekki',
  propertyType: 'duplex',
  bedrooms: 3,
  bathrooms: 2,
  description: 'Modern duplex in a secured estate.',
  amenities: ['parking', 'borehole'],
} as CreateListingDto;

const makeFile = (mimeType = 'image/jpeg'): { buffer: Buffer; mimeType: string } => ({
  buffer: Buffer.from('image-bytes'),
  mimeType,
});

const files = (count: number) => Array.from({ length: count }, () => makeFile());

const makeListing = (overrides: Partial<Listing> = {}): Listing =>
  ({
    id: 'listing-1',
    listerType: 'agent',
    listerId: 'agent-123',
    listerDisplayName: 'Alice Agent',
    listerVerified: true,
    title: baseDto.title,
    listingType: 'rent',
    price: 2500000,
    currency: 'NGN',
    state: 'Lagos',
    city: 'Lekki',
    address: null,
    latitude: null,
    longitude: null,
    propertyType: 'duplex',
    bedrooms: 3,
    bathrooms: 2,
    description: baseDto.description,
    amenities: baseDto.amenities,
    imageUrls: ['https://cdn/1.jpg', 'https://cdn/2.jpg', 'https://cdn/3.jpg'],
    status: 'active',
    createdAt: new Date(),
    ...overrides,
  }) as Listing;

describe('ListingsService', () => {
  let service: ListingsService;
  let repo: Repo;
  let storage: Partial<Record<keyof ListingsStorageProvider, any>>;

  beforeEach(() => {
    repo = {
      create: vi.fn((entity) => entity),
      save: vi.fn((entity) =>
        Promise.resolve({ id: 'listing-1', createdAt: new Date(), updatedAt: new Date(), ...entity }),
      ),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    storage = {
      persist: vi
        .fn()
        .mockImplementation((_b, _m, _o) => Promise.resolve({ url: 'https://cdn/x.jpg' })),
    };
    service = new ListingsService(repo as any, storage as any);
  });

  describe('create', () => {
    it('publishes a listing, stores each photo, and snapshots the lister', async () => {
      const result = await service.create(lister, 'agent', baseDto, files(3));

      expect(storage.persist).toHaveBeenCalledTimes(3);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          listerType: 'agent',
          listerId: 'agent-123',
          listerDisplayName: 'Alice Agent',
          listerVerified: true,
          status: 'active',
          currency: 'NGN',
        }),
      );
      // Snapshot badge fields are read back from the row, not joined from a role table
      expect(result.listerVerified).toBe(true);
      expect(result.listerDisplayName).toBe('Alice Agent');
      expect(result.imageUrls).toHaveLength(3);
    });

    it('rejects fewer than the minimum photos', async () => {
      const error = await service
        .create(lister, 'agent', baseDto, files(2))
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ code: 'LISTING_PHOTOS_INSUFFICIENT' });
      expect(storage.persist).not.toHaveBeenCalled();
    });

    it('rejects more than the maximum photos', async () => {
      const error = await service
        .create(lister, 'agent', baseDto, files(11))
        .catch((e) => e);

      expect(error.getResponse()).toMatchObject({ code: 'LISTING_PHOTOS_EXCEEDED' });
    });

    it('rejects a disallowed MIME type on any photo', async () => {
      const bad = [makeFile(), makeFile(), makeFile('application/pdf')];
      const error = await service
        .create(lister, 'agent', baseDto, bad)
        .catch((e) => e);

      expect(error.getResponse()).toMatchObject({ code: 'LISTING_PHOTO_TYPE_INVALID' });
    });

    it('rejects an oversized photo', async () => {
      const oversized = [
        makeFile(),
        makeFile(),
        { buffer: Buffer.alloc(5 * 1024 * 1024 + 1), mimeType: 'image/jpeg' },
      ];
      const error = await service
        .create(lister, 'agent', baseDto, oversized)
        .catch((e) => e);

      expect(error.getResponse()).toMatchObject({ code: 'LISTING_PHOTO_TOO_LARGE' });
    });

    it('surfaces a storage failure as 503 without persisting a row', async () => {
      storage.persist = vi.fn().mockResolvedValue(null);

      const error = await service
        .create(lister, 'agent', baseDto, files(3))
        .catch((e) => e);

      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.getResponse()).toMatchObject({ code: 'LISTING_MEDIA_UNAVAILABLE' });
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    const attachQueryBuilder = (rows: Listing[], total: number) => {
      const whereArgs: string[] = [];
      const qb: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn((sql: string) => {
          whereArgs.push(sql);
          return qb;
        }),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([rows, total]),
        __whereArgs: whereArgs,
      };
      repo.createQueryBuilder = vi.fn().mockReturnValue(qb);
      return qb;
    };

    it('returns the paginated envelope shape and maps rows', async () => {
      const qb = attachQueryBuilder([makeListing()], 1);

      const result = await service.search({
        page: 1,
        limit: 12,
      } as SearchListingsQueryDto);

      expect(result).toEqual({
        items: [expect.objectContaining({ id: 'listing-1' })],
        meta: { page: 1, limit: 12, total: 1 },
      });
      // Only the soft-delete guard is applied when no filters are provided
      expect(qb.__whereArgs).toEqual(['listing.deleted_at IS NULL']);
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(12);
    });

    it('applies the requested filters', async () => {
      const qb = attachQueryBuilder([], 0);

      await service.search({
        listingType: 'rent',
        minPrice: 500000,
        maxPrice: 5000000,
        state: 'Lagos',
        city: 'Lekki',
        propertyType: 'duplex',
        bedrooms: 3,
        page: 2,
        limit: 10,
      } as SearchListingsQueryDto);

      expect(qb.__whereArgs).toEqual([
        'listing.deleted_at IS NULL',
        'listing.listing_type = :listingType',
        'listing.price >= :minPrice',
        'listing.price <= :maxPrice',
        'listing.state = :state',
        'listing.city = :city',
        'listing.property_type = :propertyType',
        'listing.bedrooms >= :bedrooms',
      ]);
      expect(qb.skip).toHaveBeenCalledWith(10);
    });
  });

  describe('findDetail', () => {
    it('reads the snapshot badge from the row without a role-table join', async () => {
      repo.findOne = vi.fn().mockResolvedValue(makeListing());

      const result = await service.findDetail('listing-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'listing-1', status: 'active' },
      });
      expect(result.listerVerified).toBe(true);
      expect(result.description).toBe(baseDto.description);
    });

    it('throws LISTING_NOT_FOUND for a missing listing', async () => {
      repo.findOne = vi.fn().mockResolvedValue(null);

      const error = await service.findDetail('missing').catch((e) => e);
      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'LISTING_NOT_FOUND' });
    });
  });

  describe('dashboard (Phase 2)', () => {
    const attachQueryBuilder = (rows: Listing[], total: number) => {
      const whereArgs: string[] = [];
      const qb: any = {
        where: vi.fn((sql: string) => {
          whereArgs.push(sql);
          return qb;
        }),
        andWhere: vi.fn((sql: string) => {
          whereArgs.push(sql);
          return qb;
        }),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([rows, total]),
        __whereArgs: whereArgs,
      };
      repo.createQueryBuilder = vi.fn().mockReturnValue(qb);
      return qb;
    };

    it('findOwn scopes the query to the authenticated lister and exposes status', async () => {
      const qb = attachQueryBuilder([makeListing({ status: 'rented' })], 1);

      const result = await service.findOwn(lister, 'agent', {
        page: 1,
        limit: 12,
      } as MyListingsQueryDto);

      expect(qb.__whereArgs).toEqual([
        'listing.lister_id = :listerId',
        'listing.lister_type = :listerType',
      ]);
      expect(result.items[0]).toMatchObject({ status: 'rented' });
      expect(result.meta).toEqual({ page: 1, limit: 12, total: 1 });
    });

    it('findOwn applies the optional status filter', async () => {
      const qb = attachQueryBuilder([], 0);

      await service.findOwn(lister, 'agent', {
        status: 'sold',
        page: 1,
        limit: 12,
      } as MyListingsQueryDto);

      expect(qb.__whereArgs).toContain('listing.status = :status');
    });

    it('update changes only the provided fields of an owned listing', async () => {
      repo.findOne = vi.fn().mockResolvedValue(makeListing());

      const result = await service.update(lister, 'agent', 'listing-1', {
        price: 3000000,
      } as UpdateListingDto);

      // Ownership is scoped into the lookup, not compared after fetching
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 'listing-1', listerId: 'agent-123', listerType: 'agent' },
      });
      expect(result.price).toBe(3000000);
      expect(result.title).toBe(baseDto.title);
      expect(result.imageUrls).toHaveLength(3);
    });

    it('update responds LISTING_NOT_FOUND for a foreign or missing listing', async () => {
      repo.findOne = vi.fn().mockResolvedValue(null);

      const error = await service
        .update(lister, 'agent', 'listing-1', { price: 1 } as UpdateListingDto)
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(error.getResponse()).toMatchObject({ code: 'LISTING_NOT_FOUND' });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('updateStatus marks a listing rented', async () => {
      repo.findOne = vi.fn().mockResolvedValue(makeListing());

      const result = await service.updateStatus(lister, 'agent', 'listing-1', 'rented');

      expect(result.status).toBe('rented');
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rented' }),
      );
    });

    it('updateStatus rejects a terminal status that contradicts the listing type', async () => {
      repo.findOne = vi.fn().mockResolvedValue(makeListing({ listingType: 'rent' }));

      const error = await service
        .updateStatus(lister, 'agent', 'listing-1', 'sold')
        .catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ code: 'LISTING_STATUS_TYPE_MISMATCH' });
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('remove soft-deletes an owned listing', async () => {
      repo.findOne = vi.fn().mockResolvedValue(makeListing());
      repo.softDelete = vi.fn().mockResolvedValue(undefined);

      await service.remove(lister, 'agent', 'listing-1');

      expect(repo.softDelete).toHaveBeenCalledWith({ id: 'listing-1' });
    });

    it('remove responds LISTING_NOT_FOUND without deleting when not owned', async () => {
      repo.findOne = vi.fn().mockResolvedValue(null);
      repo.softDelete = vi.fn();

      const error = await service
        .remove(lister, 'agent', 'listing-1')
        .catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundException);
      expect(repo.softDelete).not.toHaveBeenCalled();
    });
  });
});
