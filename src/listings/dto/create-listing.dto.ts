import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsEnumValues } from '../../common/validation/enum-validator.js';
import {
  LISTING_TYPES,
  PROPERTY_TYPES,
  type ListingType,
  type PropertyType,
} from '../listings.constants.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateListingDto {
  @ApiProperty({ example: '3-bedroom duplex with BQ in Lekki' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  @Transform(trim)
  title!: string;

  @ApiProperty({ enum: LISTING_TYPES, example: 'rent' })
  @IsEnumValues(LISTING_TYPES)
  listingType!: ListingType;

  @ApiProperty({ example: 2500000, description: 'Whole naira, no kobo.' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  price!: number;

  @ApiProperty({ example: 'Lagos' })
  @IsString()
  @MaxLength(60)
  @Transform(trim)
  state!: string;

  @ApiProperty({ example: 'Lekki' })
  @IsString()
  @MaxLength(60)
  @Transform(trim)
  city!: string;

  @ApiProperty({ example: 'apartment', enum: PROPERTY_TYPES })
  @IsEnumValues(PROPERTY_TYPES)
  propertyType!: PropertyType;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  bedrooms!: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  bathrooms!: number;

  @ApiProperty({ example: 'Modern duplex in a secured estate, close to schools.' })
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ required: false, type: [String], example: ['parking', 'borehole'] })
  @IsOptional()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  amenities?: string[];

  @ApiProperty({ required: false, example: '10 Awodey Street' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiProperty({ required: false, example: 6.5244 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ required: false, example: 3.3792 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
