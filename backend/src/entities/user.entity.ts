import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 用户实体 - 系统管理员账户
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '用户名' })
  username: string;

  @Column({ comment: '密码（加密存储）' })
  password: string;

  @Column({ default: 'admin', comment: '角色' })
  role: string;

  @Column({ default: true, comment: '是否启用' })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
