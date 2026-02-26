import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Subject } from './subject.entity';

// 学科校验日实体 - 配置某学科在特定日期不参与排班
@Entity('subject_exclude_dates')
export class SubjectExcludeDate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '学科ID' })
  subjectId: number;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ type: 'int', comment: '星期几（1-5，周一到周五）' })
  dayOfWeek: number;

  @Column({ nullable: true, comment: '备注说明' })
  remark: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;
}
