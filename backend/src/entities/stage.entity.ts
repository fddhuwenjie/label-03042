import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 课后服务阶段实体
@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '阶段名称' })
  name: string;

  @Column({ type: 'int', comment: '阶段序号（1、2、3）' })
  stageNumber: number;

  @Column({ type: 'int', default: 0, comment: '该阶段需要安排的班级数量' })
  classCount: number;

  @Column({ nullable: true, comment: '阶段描述' })
  description: string;

  @Column({ default: true, comment: '是否启用' })
  isActive: boolean;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
