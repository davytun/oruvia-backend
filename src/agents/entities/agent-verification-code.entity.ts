import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentUser } from './agent-user.entity.js';

export type VerificationCodePurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Entity('agent_verification_codes')
@Index('idx_agent_codes_agent_purpose', ['agentId', 'purpose'])
export class AgentVerificationCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId!: string;

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

  @ManyToOne(() => AgentUser, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agent_id' })
  agent?: AgentUser;
}
