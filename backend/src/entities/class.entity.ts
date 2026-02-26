import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Teacher } from './teacher.entity';

// 班级实体
@Entity('classes')
export class Class {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '班级名称，如：一年级1班' })
  name: string;

  @Column({ comment: '年级，如：一年级' })
  grade: string;

  @Column({ type: 'int', comment: '班级序号' })
  classNumber: number;

  @Column({ type: 'int', nullable: true, comment: '班主任ID' })
  headTeacherId: number;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'headTeacherId' })
  headTeacher: Teacher;

  @Column({ default: true, comment: '是否启用' })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
