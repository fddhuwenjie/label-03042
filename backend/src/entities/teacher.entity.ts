import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, ManyToMany, JoinTable } from 'typeorm';
import { Subject } from './subject.entity';
import { Class } from './class.entity';

// 教师实体
@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '教师姓名' })
  name: string;

  @Column({ type: 'int', nullable: true, comment: '任教学科ID' })
  subjectId: number;

  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @ManyToMany(() => Class)
  @JoinTable({
    name: 'teacher_classes',
    joinColumn: { name: 'teacherId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'classId', referencedColumnName: 'id' },
  })
  teachingClasses: Class[]; // 任教班级

  @Column({ default: false, comment: '是否可参与第三阶段' })
  canStage3: boolean;

  @Column({ default: true, comment: '是否启用' })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
