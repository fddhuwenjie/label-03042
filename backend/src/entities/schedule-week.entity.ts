import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 排班周实体 - 记录每周的排班信息
@Entity('schedule_weeks')
export class ScheduleWeek {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '年份' })
  year: number;

  @Column({ type: 'int', comment: '周数' })
  weekNumber: number;

  @Column({ type: 'date', comment: '周开始日期（周一）' })
  startDate: Date;

  @Column({ type: 'date', comment: '周结束日期（周五）' })
  endDate: Date;

  @Column({ default: 'draft', comment: '状态：draft-草稿, confirmed-已确认' })
  status: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
