import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { IsEnumValues } from '../../../common/validation/enum-validator.js';
import {
  KYC_DOCUMENT_TYPES,
  type KycDocumentType,
} from '../../kyc/kyc.constants.js';

export class SubmitLandlordKycDto {
  @ApiProperty({
    description:
      'Type of the uploaded government-issued ID. Any valid government ID is accepted; use OTHER_GOVERNMENT_ID when the document is not listed.',
    enum: KYC_DOCUMENT_TYPES as unknown as KycDocumentType[],
    example: 'NIN_SLIP',
  })
  @IsEnumValues(KYC_DOCUMENT_TYPES)
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  documentType!: KycDocumentType;
}
