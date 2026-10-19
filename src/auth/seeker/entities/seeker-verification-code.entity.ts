import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SeekerUser } from './seeker-user.entity.js';

export type VerificationCodePurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Entity('seeker_verification_codes')
@Index('idx_seeker_codes_seeker_purpose', ['seekerId', 'purpose'])
export class SeekerVerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'seeker_id', type: 'uuid' })
  seekerId!: string;

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

  @ManyToOne(() => SeekerUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'seeker_id' })
  seeker?: SeekerUser;
}
