import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  key!: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @ManyToOne(() => User, user => user.apiKeys, { onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column('simple-array')
  scopes!: string[];

  @BeforeInsert()
  generateKey() {
    if (!this.key) {
      // Generate a secure random API key
      this.key = `${randomBytes(32).toString('hex')}`;
    }
    
    if (!this.id) {
      this.id = uuidv4();
    }

    // Set default expiration to 1 year if not set
    if (!this.expiresAt) {
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      this.expiresAt = oneYear;
    }
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isValid(): boolean {
    return !this.revoked && !this.isExpired();
  }
}
