import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ValueTransformer,
} from 'typeorm';
import type {
  ListingStatus,
  ListingType,
  ListerType,
  PropertyType,
} from '../listings.constants.js';

// bigint and numeric arrive as strings from the pg driver; normalize to number.
const numberTransformer: ValueTransformer = {
  to: (value: number | null | undefined) =>
    value === null || value === undefined ? value : String(value),
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('listings')
@Index('idx_listings_type_price', ['listingType', 'price'])
@Index('idx_listings_location', ['state', 'city'])
@Index('idx_listings_property_type', ['propertyType'])
@Index('idx_listings_lister', ['listerId'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'lister_type', type: 'varchar', length: 10 })
  listerType!: ListerType;

  @Column({ name: 'lister_id', type: 'uuid' })
  listerId!: string;

  @Column({ name: 'lister_display_name', type: 'varchar', length: 255 })
  listerDisplayName!: string;

  @Column({ name: 'lister_verified', type: 'boolean', default: false })
  listerVerified!: boolean;

  @Column({ name: 'title', type: 'varchar', length: 120 })
  title!: string;

  @Column({ name: 'listing_type', type: 'varchar', length: 10 })
  listingType!: ListingType;

  @Column({
    name: 'price',
    type: 'bigint',
    transformer: numberTransformer,
  })
  price!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, default: 'NGN' })
  currency!: string;

  @Column({ name: 'state', type: 'varchar', length: 60 })
  state!: string;

  @Column({ name: 'city', type: 'varchar', length: 60 })
  city!: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address!: string | null;

  @Column({
    name: 'latitude',
    type: 'double precision',
    nullable: true,
  })
  latitude!: number | null;

  @Column({
    name: 'longitude',
    type: 'double precision',
    nullable: true,
  })
  longitude!: number | null;

  @Column({ name: 'property_type', type: 'varchar', length: 30 })
  propertyType!: PropertyType;

  @Column({ name: 'bedrooms', type: 'int', default: 0 })
  bedrooms!: number;

  @Column({ name: 'bathrooms', type: 'int', default: 0 })
  bathrooms!: number;

  @Column({ name: 'description', type: 'text' })
  description!: string;

  @Column({ name: 'amenities', type: 'text', array: true, default: '{}' })
  amenities!: string[];

  @Column({ name: 'image_urls', type: 'text', array: true })
  imageUrls!: string[];

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'active' })
  status!: ListingStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
