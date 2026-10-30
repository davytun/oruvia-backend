import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginated, type PaginatedResult } from '../common/interfaces/pagination.interface.js';
import {
  LISTING_ALLOWED_MIME_TYPES,
  LISTING_MAX_PHOTOS,
  LISTING_MAX_PHOTO_BYTES,
  LISTING_MIN_PHOTOS,
  type ListingDetailResponse,
  type ListingResponse,
  type ListerType,
} from './listings.constants.js';
import type { CreateListingDto } from './dto/create-listing.dto.js';
import type { SearchListingsQueryDto } from './dto/search-listings.query.dto.js';
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

    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await qb
      .orderBy('listing.created_at', 'DESC')
      .skip(skip)
      .take(query.limit)
      .getManyAndCount();

    return buildPaginated(
      rows.map((row) => this.toResponse(row)),
      query.page,
      query.limit,
      total,
    );
  }

  async findDetail(id: string): Promise<ListingDetailResponse> {
    const listing = await this.listingRepository.findOne({
      where: { id, status: 'active' },
    });
    if (!listing) {
      throw new NotFoundException({
        code: 'LISTING_NOT_FOUND',
        message: 'Listing not found',
      });
    }
    return this.toDetail(listing);
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
}
