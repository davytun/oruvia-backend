import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  KycDocumentType,
  KycSubmissionStatus,
} from '../../kyc/kyc.constants.js';
import { LandlordUser } from './landlord-user.entity.js';

@Entity('landlord_kyc_submissions')
@Index('idx_landlord_kyc_landlord_status', ['landlordId', 'status'])
export class LandlordKycSubmission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'landlord_id', type: 'uuid' })
  landlordId!: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status!: KycSubmissionStatus;

  @Column({ name: 'document_type', type: 'varchar', length: 50 })
  documentType!: KycDocumentType;

  @Column({ name: 'document_url', type: 'varchar', length: 255 })
  documentUrl!: string;

  @Column({ name: 'attempt', type: 'int', default: 1 })
  attempt!: number;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => LandlordUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'landlord_id' })
  landlord?: LandlordUser;
}
