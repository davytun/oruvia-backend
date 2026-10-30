import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type SelectQueryBuilder } from 'typeorm';
import { buildPaginated, type PaginatedResult } from '../common/interfaces/pagination.interface.js';
import {
  LISTING_ALLOWED_MIME_TYPES,
  LISTING_MAX_PHOTOS,
  LISTING_MAX_PHOTO_BYTES,
  LISTING_MIN_PHOTOS,
  LISTING_NOT_FOUND,
  LISTING_TERMINAL_STATUS,
  type ListingDashboardResponse,
  type ListingDetailResponse,
  type ListingResponse,
  type ListingStatus,
  type ListerType,
} from './listings.constants.js';
import type { CreateListingDto } from './dto/create-listing.dto.js';
import type { MyListingsQueryDto } from './dto/my-listings.query.dto.js';
import type { SearchListingsQueryDto } from './dto/search-listings.query.dto.js';
import type { UpdateListingDto } from './dto/update-listing.dto.js';
import { Listing } from './entities/listing.entity.js';
import { ListingsStorageProvider } from './storage/listings-storage.interface.js';

export interface ListingUploadFile {
  buffer: Buffer;
  mimeType: string;
}

export interface ListerPrincipal {
  id: string;
  fullName: string;
}

/**
 * Dashboard-editable fields, single source of truth for the mass-assignment
 * whitelist. Fields added to CreateListingDto are NOT editable until they
 * appear here (photos, owner reference and the snapshot badge stay excluded
 * deliberately).
 */
const UPDATE_LISTING_FIELDS: readonly (keyof UpdateListingDto & keyof Listing)[] =
  [
    'title',
    'listingType',
    'price',
    'state',
    'city',
    'propertyType',
    'bedrooms',
    'bathrooms',
    'description',
    'amenities',
    'address',
    'latitude',
    'longitude',
  ];

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly storage: ListingsStorageProvider,
  ) {}

  async create(
    lister: ListerPrincipal,
    listerType: ListerType,
    dto: CreateListingDto,
    files: ListingUploadFile[],
  ): Promise<ListingDetailResponse> {
    if (files.length < LISTING_MIN_PHOTOS) {
      throw new BadRequestException({
        code: 'LISTING_PHOTOS_INSUFFICIENT',
        message: `At least ${LISTING_MIN_PHOTOS} photos are required`,
      });
    }
    if (files.length > LISTING_MAX_PHOTOS) {
      throw new BadRequestException({
        code: 'LISTING_PHOTOS_EXCEEDED',
        message: `A maximum of ${LISTING_MAX_PHOTOS} photos are allowed`,
      });
    }
    for (const file of files) {
      if (!LISTING_ALLOWED_MIME_TYPES.includes(file.mimeType)) {
        throw new BadRequestException({
          code: 'LISTING_PHOTO_TYPE_INVALID',
          message: 'Each photo must be a JPEG, PNG or WebP image',
        });
      }
      if (file.buffer.byteLength > LISTING_MAX_PHOTO_BYTES) {
        throw new BadRequestException({
          code: 'LISTING_PHOTO_TOO_LARGE',
          message: 'Each photo must not exceed 5 MB',
        });
      }
    }

    // Store every photo before the DB write; an orphaned stored file is
    // acceptable, a listing pointing at a missing photo is not.
    const imageUrls: string[] = [];
    for (const file of files) {
      const stored = await this.storage.persist(
        file.buffer,
        file.mimeType,
        lister.id,
      );
      if (!stored) {
        throw new ServiceUnavailableException({
          code: 'LISTING_MEDIA_UNAVAILABLE',
          message: 'Image storage is temporarily unavailable. Please retry.',
        });
      }
      imageUrls.push(stored.url);
    }

    const listing = await this.listingRepository.save(
      this.listingRepository.create({
        listerType,
        listerId: lister.id,
        listerDisplayName: lister.fullName,
        listerVerified: true,
        title: dto.title,
        listingType: dto.listingType,
        price: dto.price,
        currency: 'NGN',
        state: dto.state,
        city: dto.city,
        address: dto.address ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        propertyType: dto.propertyType,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        description: dto.description,
        amenities: dto.amenities ?? [],
        imageUrls,
        status: 'active',
      }),
    );

    return this.toDetail(listing);
  }

  async search(
    query: SearchListingsQueryDto,
  ): Promise<PaginatedResult<ListingResponse>> {
    // Redundant with TypeORM's implicit @DeleteDateColumn filter, kept
    // because the partial idx_listings_active index is defined with this
    // exact predicate.
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.status = :status', { status: 'active' })
      .andWhere('listing.deleted_at IS NULL');

    if (query.listingType) {
      qb.andWhere('listing.listing_type = :listingType', {
        listingType: query.listingType,
      });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('listing.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('listing.price <= :maxPrice', { maxPrice: query.maxPrice });
    }
    if (query.state) {
      qb.andWhere('listing.state = :state', { state: query.state });
    }
    if (query.city) {
      qb.andWhere('listing.city = :city', { city: query.city });
    }
    if (query.propertyType) {
      qb.andWhere('listing.property_type = :propertyType', {
        propertyType: query.propertyType,
      });
    }
    if (query.bedrooms !== undefined) {
      qb.andWhere('listing.bedrooms >= :bedrooms', { bedrooms: query.bedrooms });
    }

    return this.paginate(qb, query.page, query.limit, (row) => this.toResponse(row));
  }

  async findDetail(id: string): Promise<ListingDetailResponse> {
    const listing = await this.listingRepository.findOne({
      where: { id, status: 'active' },
    });
    if (!listing) {
      throw new NotFoundException(LISTING_NOT_FOUND);
    }
    return this.toDetail(listing);
  }

  // ------------------------------------------------------------------
  // Phase 2 — lister dashboard. Ownership is scoped into every query so
  // another lister's listing is indistinguishable from a missing one.
  // ------------------------------------------------------------------

  async findOwn(
    lister: ListerPrincipal,
    listerType: ListerType,
    query: MyListingsQueryDto,
  ): Promise<PaginatedResult<ListingDashboardResponse>> {
    const qb = this.listingRepository
      .createQueryBuilder('listing')
      .where('listing.lister_id = :listerId', { listerId: lister.id })
      .andWhere('listing.lister_type = :listerType', { listerType });

    if (query.status) {
      qb.andWhere('listing.status = :status', { status: query.status });
    }

    // Soft-deleted rows are excluded implicitly by TypeORM's @DeleteDateColumn
    // filter — the same guarantee remove() relies on.
    return this.paginate(qb, query.page, query.limit, (row) => this.toDashboard(row));
  }

  async update(
    lister: ListerPrincipal,
    listerType: ListerType,
    id: string,
    dto: UpdateListingDto,
  ): Promise<ListingDashboardResponse> {
    const listing = await this.findOwnedOrFail(lister, listerType, id);

    // Whitelisted copy: only UPDATE_LISTING_FIELDS can be mass-assigned;
    // photos, owner reference and the snapshot badge are never touched here.
    const patch: Partial<Listing> = {};
    for (const field of UPDATE_LISTING_FIELDS) {
      const value = dto[field];
      if (value !== undefined) {
        // Both DTO and entity narrow to the same literal union types.
        Object.assign(patch, { [field]: value });
      }
    }
    Object.assign(listing, patch);
    // A rent listing parked as `rented` must not be flipped to `sale`
    // without going through the status route first.
    this.assertStatusMatchesType(listing);

    const saved = await this.listingRepository.save(listing);
    return this.toDashboard(saved);
  }

  async updateStatus(
    lister: ListerPrincipal,
    listerType: ListerType,
    id: string,
    status: ListingStatus,
  ): Promise<ListingDashboardResponse> {
    const listing = await this.findOwnedOrFail(lister, listerType, id);
    listing.status = status;
    this.assertStatusMatchesType(listing);
    const saved = await this.listingRepository.save(listing);
    return this.toDashboard(saved);
  }

  /**
   * Soft delete: sets `deleted_at`, which removes the listing from public
   * search/detail and from the dashboard list (TypeORM excludes soft-deleted
   * rows by default). Recovery is out of scope this phase.
   */
  async remove(
    lister: ListerPrincipal,
    listerType: ListerType,
    id: string,
  ): Promise<void> {
    const listing = await this.findOwnedOrFail(lister, listerType, id);
    await this.listingRepository.softDelete({ id: listing.id });
  }

  private async findOwnedOrFail(
    lister: ListerPrincipal,
    listerType: ListerType,
    id: string,
  ): Promise<Listing> {
    const listing = await this.listingRepository.findOne({
      where: { id, listerId: lister.id, listerType },
    });
    if (!listing) {
      throw new NotFoundException(LISTING_NOT_FOUND);
    }
    return listing;
  }

  /** Terminal status must match the listing type: rented ⇒ rent, sold ⇒ sale. */
  private assertStatusMatchesType(listing: Listing): void {
    if (
      (listing.status === 'rented' || listing.status === 'sold') &&
      listing.status !== LISTING_TERMINAL_STATUS[listing.listingType]
    ) {
      throw new BadRequestException({
        code: 'LISTING_STATUS_TYPE_MISMATCH',
        message: `A "${listing.listingType}" listing can only be marked as "${LISTING_TERMINAL_STATUS[listing.listingType]}"`,
      });
    }
  }

  /** Newest-first paging shared by search and the dashboard list. */
  private async paginate<T>(
    qb: SelectQueryBuilder<Listing>,
    page: number,
    limit: number,
    map: (listing: Listing) => T,
  ): Promise<PaginatedResult<T>> {
    const skip = (page - 1) * limit;
    const [rows, total] = await qb
      .orderBy('listing.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map(map),
      page,
      limit,
      total,
    );
  }

  private toResponse(listing: Listing): ListingResponse {
    return {
      id: listing.id,
      title: listing.title,
      listingType: listing.listingType,
      price: listing.price,
      currency: listing.currency,
      state: listing.state,
      city: listing.city,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      amenities: listing.amenities,
      imageUrls: listing.imageUrls,
      listerType: listing.listerType,
      listerDisplayName: listing.listerDisplayName,
      listerVerified: listing.listerVerified,
      createdAt: listing.createdAt,
    };
  }

  private toDetail(listing: Listing): ListingDetailResponse {
    return {
      ...this.toResponse(listing),
      description: listing.description,
      address: listing.address,
      latitude: listing.latitude,
      longitude: listing.longitude,
    };
  }

  private toDashboard(listing: Listing): ListingDashboardResponse {
    return {
      ...this.toDetail(listing),
      status: listing.status,
      updatedAt: listing.updatedAt,
    };
  }
}
