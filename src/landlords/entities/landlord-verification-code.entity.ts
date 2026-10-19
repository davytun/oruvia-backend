import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LandlordUser } from './landlord-user.entity.js';

export type VerificationCodePurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Entity('landlord_verification_codes')
@Index('idx_landlord_codes_landlord_purpose', ['landlordId', 'purpose'])
export class LandlordVerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'landlord_id', type: 'uuid' })
  landlordId!: string;

  @Column({ name: 'code_hash', type: 'varchar', length: 255 })
  codeHash!: string;

  @Column({ name: 'purpose', type: 'varchar', length: 50 })
  purpose!: VerificationCodePurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 5 })
  maxAttempts!: number;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => LandlordUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'landlord_id' })
  landlord?: LandlordUser;
}
