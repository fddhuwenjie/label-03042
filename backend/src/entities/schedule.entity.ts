import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Teacher } from './teacher.entity';
import { Class } from './class.entity';
import { Stage } from './stage.entity';
import { ScheduleWeek } from './schedule-week.entity';

// 排班记录实体
@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '排班周ID' })
  weekId: number;

  @ManyToOne(() => ScheduleWeek)
  @JoinColumn({ name: 'weekId' })
  week: ScheduleWeek;

  @Column({ type: 'int', comment: '星期几（1-5）' })
  dayOfWeek: number;

  @Column({ type: 'int', comment: '阶段ID' })
  stageId: number;

  @ManyToOne(() => Stage)
  @JoinColumn({ name: 'stageId' })
  stage: Stage;

  @Column({ type: 'int', comment: '教师ID' })
  teacherId: number;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ type: 'int', comment: '班级ID' })
  classId: number;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @Column({ nullable: true, comment: '排班类型：headTeacher-班主任, mainSubject-主科, other-其他' })
  scheduleType: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
