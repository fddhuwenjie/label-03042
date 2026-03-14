import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
import { Class } from '../entities/class.entity';
import { Stage } from '../entities/stage.entity';
import { SubjectExcludeDate } from '../entities/subject-exclude-date.entity';
import { LoggerService } from './logger.service';

/**
 * 单个排班项接口
 */
interface ScheduleItem {
  dayOfWeek: number;
  stageId: number;
  teacherId: number;
  classId: number;
  scheduleType: string;
}

/**
 * 排班警告接口
 */
export interface ScheduleWarning {
  type: 'teacher_shortage' | 'class_unassigned' | 'stage3_shortage';
  message: string;
  dayOfWeek?: number;
  stageNumber?: number;
  details?: any;
}

/**
 * 排班结果接口
 */
export interface ScheduleResult {
  items: ScheduleItem[];
  warnings: ScheduleWarning[];
}

/**
 * 智能排班引擎服务
 *
 * ## 排班规则
 *
 * ### 三级优先级算法
 * 1. 班主任每周优先安排 1 次到自己班级
 * 2. 主科教师（语数英）每周优先安排 1 次到任教班级
 * 3. 其他学科教师安排到空余班级
 *
 * ### 第三阶段特殊规则
 * - 仅限标记为 canStage3=true 的教师参与
 * - 参与第三阶段的教师必须整周每天从第一阶段连续安排至第三阶段
 * - 通过预选机制保证整周连续性
 *
 * ### 学科排除规则
 * - 支持配置学科在特定日期不参与排班
 * - 排班时自动过滤被排除学科的教师
 */
@Injectable()
export class SchedulingEngine {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Stage)
    private stageRepository: Repository<Stage>,
    @InjectRepository(SubjectExcludeDate)
    private excludeDateRepository: Repository<SubjectExcludeDate>,
    private logger: LoggerService,
  ) {}

  /**
   * 生成一周的排班
   * 核心规则：
   * 1. 班主任每周优先安排1次到自己班级（第一优先级）
   * 2. 主科教师（语数英）每周优先安排1次到任教班级（第二优先级）
   * 3. 其他教师安排到空余班级（第三优先级）
   * 4. 第三阶段仅限指定教师，且必须整周每天从第一阶段连续安排至第三阶段
   */
  async generateWeekSchedule(weekId: number): Promise<ScheduleResult> {
    this.logger.logScheduling('开始生成排班', weekId);

    const teachers = await this.teacherRepository.find({
      where: { isActive: true },
      relations: ['subject', 'teachingClasses'],
    });

    const classes = await this.classRepository.find({
      where: { isActive: true },
      relations: ['headTeacher'],
    });

    const stages = await this.stageRepository.find({
      where: { isActive: true },
      order: { stageNumber: 'ASC' },
    });

    const excludeDates = await this.excludeDateRepository.find();

    this.logger.logScheduling('基础数据加载完成', weekId, {
      teacherCount: teachers.length,
      classCount: classes.length,
      stageCount: stages.length,
      stage3TeacherCount: teachers.filter(t => t.canStage3).length,
      excludeDateCount: excludeDates.length,
    });

    const scheduleItems: ScheduleItem[] = [];
    const warnings: ScheduleWarning[] = [];

    // 教师周工作量统计（用于均衡性优化）
    const teacherWeeklyCount: Map<number, number> = new Map();
    teachers.forEach(t => teacherWeeklyCount.set(t.id, 0));

    // 周级别优先安排追踪：班主任和主科教师每周只优先安排1次
    const headTeacherAssignedThisWeek: Set<number> = new Set();
    const mainSubjectTeacherAssignedThisWeek: Set<number> = new Set();

    // 基础数据校验
    if (teachers.length === 0) {
      warnings.push({ type: 'teacher_shortage', message: '系统中没有可用的教师，请先添加教师信息' });
    }
    if (classes.length === 0) {
      warnings.push({ type: 'class_unassigned', message: '系统中没有可用的班级，请先添加班级信息' });
    }
    if (stages.length === 0) {
      warnings.push({ type: 'class_unassigned', message: '系统中没有阶段配置，请先配置课后服务阶段' });
    }

    const maxClassCount = Math.max(...stages.map(s => s.classCount), 0);
    if (teachers.length > 0 && maxClassCount > 0 && teachers.length < maxClassCount) {
      warnings.push({
        type: 'teacher_shortage',
        message: `教师数量(${teachers.length})少于最大阶段班级数(${maxClassCount})，部分班级可能无法安排`,
      });
    }

    const stage3Config = stages.find(s => s.stageNumber === 3);
    const stage3TeacherPool = teachers.filter(t => t.canStage3);
    if (stage3Config && stage3Config.classCount > 0 && stage3TeacherPool.length === 0) {
      warnings.push({ type: 'stage3_shortage', message: '没有可参与第三阶段的教师，请在教师管理中设置' });
    }
    if (stage3Config && stage3Config.classCount > 0 && stage3TeacherPool.length < stage3Config.classCount) {
      warnings.push({
        type: 'stage3_shortage',
        message: `第三阶段教师数量(${stage3TeacherPool.length})少于需安排班级数(${stage3Config.classCount})`,
      });
    }

    // 预选第三阶段教师：这些教师整周每天都必须从阶段1连续安排到阶段3
    const preselectedStage3TeacherIds: Set<number> = new Set();
    if (stage3Config && stage3Config.classCount > 0) {
      const sorted = this.sortTeachersByWorkload(stage3TeacherPool, teacherWeeklyCount);
      const needed = stage3Config.classCount;
      for (let i = 0; i < Math.min(needed, sorted.length); i++) {
        preselectedStage3TeacherIds.add(sorted[i].id);
      }
    }

    // 遍历周一到周五
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      const excludedSubjectIds = excludeDates
        .filter(ed => ed.dayOfWeek === dayOfWeek)
        .map(ed => ed.subjectId);

      const availableTeachers = teachers.filter(t =>
        !t.subjectId || !excludedSubjectIds.includes(t.subjectId)
      );

      const teacherDaySchedule: Map<number, number[]> = new Map();

      for (const stage of stages) {
        this.logger.logScheduling(`开始生成 星期${dayOfWeek} ${stage.name} 排班`, weekId, {
          stageNumber: stage.stageNumber,
          classCount: stage.classCount,
          availableTeacherCount: availableTeachers.length,
        });

        const { items: stageSchedule, unassignedCount } = this.generateStageSchedule(
          dayOfWeek, stage, availableTeachers, classes, teacherDaySchedule,
          headTeacherAssignedThisWeek, mainSubjectTeacherAssignedThisWeek,
          teacherWeeklyCount, preselectedStage3TeacherIds,
        );

        scheduleItems.push(...stageSchedule);

        this.logger.logScheduling(`完成 星期${dayOfWeek} ${stage.name} 排班`, weekId, {
          scheduledCount: stageSchedule.length, unassignedCount,
        });

        if (unassignedCount > 0) {
          const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];
          warnings.push({
            type: stage.stageNumber === 3 ? 'stage3_shortage' : 'teacher_shortage',
            message: `${dayNames[dayOfWeek]}${stage.name}有${unassignedCount}个班级因教师不足未能安排`,
            dayOfWeek, stageNumber: stage.stageNumber,
            details: { unassignedCount },
          });
        }
      }
    }

    this.logger.logScheduling('排班生成完成', weekId, {
      totalSchedules: scheduleItems.length, warningCount: warnings.length,
    });

    return { items: scheduleItems, warnings };
  }

  /**
   * 生成单个阶段的排班
   *
   * - 班主任和主科教师每周只优先安排1次（而非每天）
   * - 预选的第三阶段教师在阶段1和阶段2中确保被安排（整周连续性）
   * - 按周工作量排序，优先安排工作量较少的教师
   */
  private generateStageSchedule(
    dayOfWeek: number,
    stage: Stage,
    availableTeachers: Teacher[],
    classes: Class[],
    teacherDaySchedule: Map<number, number[]>,
    headTeacherAssignedThisWeek: Set<number>,
    mainSubjectTeacherAssignedThisWeek: Set<number>,
    teacherWeeklyCount?: Map<number, number>,
    preselectedStage3TeacherIds?: Set<number>,
  ): { items: ScheduleItem[]; unassignedCount: number } {
    const items: ScheduleItem[] = [];
    const classCount = stage.classCount;

    if (classCount === 0) return { items, unassignedCount: 0 };

    const classesToSchedule = classes.slice(0, classCount);
    const scheduledClasses: Set<number> = new Set();
    // 记录本阶段已安排的教师，避免重复
    const scheduledTeachers: Set<number> = new Set();

    // 第三阶段特殊处理
    if (stage.stageNumber === 3) {
      return this.generateStage3Schedule(
        dayOfWeek, stage, availableTeachers, classesToSchedule,
        teacherDaySchedule, teacherWeeklyCount, preselectedStage3TeacherIds,
      );
    }

    // 第一优先级：班主任每周优先安排1次到自己班级
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;
      if (!cls.headTeacherId) continue;
      if (headTeacherAssignedThisWeek.has(cls.headTeacherId)) continue;

      const headTeacher = availableTeachers.find(t => t.id === cls.headTeacherId);
      if (headTeacher && this.canTeacherBeScheduled(headTeacher.id, stage.stageNumber, teacherDaySchedule)) {
        items.push({
          dayOfWeek, stageId: stage.id, teacherId: headTeacher.id,
          classId: cls.id, scheduleType: 'headTeacher',
        });
        scheduledClasses.add(cls.id);
        scheduledTeachers.add(headTeacher.id);
        this.recordTeacherSchedule(headTeacher.id, stage.stageNumber, teacherDaySchedule);
        this.incrementWeeklyCount(headTeacher.id, teacherWeeklyCount);
        headTeacherAssignedThisWeek.add(cls.headTeacherId);
      }
    }

    // 第二优先级：主科教师（语数英）每周优先安排1次到任教班级
    const mainSubjectTeachers = this.sortTeachersByWorkload(
      availableTeachers.filter(t => t.subject?.isMain && t.teachingClasses?.length > 0),
      teacherWeeklyCount,
    );

    for (const teacher of mainSubjectTeachers) {
      if (mainSubjectTeacherAssignedThisWeek.has(teacher.id)) continue;
      if (!this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) continue;

      for (const teachingClass of teacher.teachingClasses) {
        const cls = classesToSchedule.find(c => c.id === teachingClass.id);
        if (cls && !scheduledClasses.has(cls.id)) {
          items.push({
            dayOfWeek, stageId: stage.id, teacherId: teacher.id,
            classId: cls.id, scheduleType: 'mainSubject',
          });
          scheduledClasses.add(cls.id);
          scheduledTeachers.add(teacher.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          mainSubjectTeacherAssignedThisWeek.add(teacher.id);
          break;
        }
      }
    }

    // 确保预选的第三阶段教师在阶段1和阶段2中被安排（整周连续性保障）
    if (preselectedStage3TeacherIds && preselectedStage3TeacherIds.size > 0
        && (stage.stageNumber === 1 || stage.stageNumber === 2)) {
      const stage3TeachersToSchedule = this.sortTeachersByWorkload(
        availableTeachers.filter(t =>
          preselectedStage3TeacherIds.has(t.id) && !scheduledTeachers.has(t.id)
        ),
        teacherWeeklyCount,
      );

      for (const teacher of stage3TeachersToSchedule) {
        if (scheduledClasses.size >= classesToSchedule.length) break;
        if (!this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) continue;

        const cls = classesToSchedule.find(c => !scheduledClasses.has(c.id));
        if (cls) {
          items.push({
            dayOfWeek, stageId: stage.id, teacherId: teacher.id,
            classId: cls.id, scheduleType: 'stage3',
          });
          scheduledClasses.add(cls.id);
          scheduledTeachers.add(teacher.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
        }
      }
    }

    // 第三优先级：其他教师安排到空余班级
    const otherTeachers = this.sortTeachersByWorkload(
      availableTeachers.filter(t => !t.subject?.isMain),
      teacherWeeklyCount,
    );

    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;

      const sortedOthers = this.sortTeachersByWorkload(otherTeachers, teacherWeeklyCount);
      for (const teacher of sortedOthers) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek, stageId: stage.id, teacherId: teacher.id,
            classId: cls.id, scheduleType: 'other',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }

    // 填充：用任意可用教师填充剩余班级
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;

      const sortedAll = this.sortTeachersByWorkload(availableTeachers, teacherWeeklyCount);
      for (const teacher of sortedAll) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek, stageId: stage.id, teacherId: teacher.id,
            classId: cls.id, scheduleType: 'fill',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }

    const unassignedCount = classesToSchedule.length - scheduledClasses.size;
    return { items, unassignedCount };
  }

  /** 按周工作量排序教师（工作量少的优先） */
  private sortTeachersByWorkload(teachers: Teacher[], weeklyCount?: Map<number, number>): Teacher[] {
    if (!weeklyCount) return teachers;
    return [...teachers].sort((a, b) => {
      const countA = weeklyCount.get(a.id) || 0;
      const countB = weeklyCount.get(b.id) || 0;
      return countA - countB;
    });
  }

  /** 增加教师周工作量计数 */
  private incrementWeeklyCount(teacherId: number, weeklyCount?: Map<number, number>): void {
    if (!weeklyCount) return;
    weeklyCount.set(teacherId, (weeklyCount.get(teacherId) || 0) + 1);
  }

  /**
   * 生成第三阶段排班（特殊规则）
   * - 仅限预选的 canStage3 教师参与
   * - 当天必须有阶段1和阶段2的记录（确保1->2->3连续）
   * - 整周连续性通过预选机制保证
   */
  private generateStage3Schedule(
    dayOfWeek: number,
    stage: Stage,
    availableTeachers: Teacher[],
    classesToSchedule: Class[],
    teacherDaySchedule: Map<number, number[]>,
    teacherWeeklyCount?: Map<number, number>,
    preselectedStage3TeacherIds?: Set<number>,
  ): { items: ScheduleItem[]; unassignedCount: number } {
    const items: ScheduleItem[] = [];
    const scheduledClasses: Set<number> = new Set();

    let stage3Teachers = availableTeachers.filter(t => {
      if (!t.canStage3) return false;
      if (preselectedStage3TeacherIds && !preselectedStage3TeacherIds.has(t.id)) return false;

      const schedules = teacherDaySchedule.get(t.id) || [];
      return schedules.includes(1) && schedules.includes(2);
    });

    stage3Teachers = this.sortTeachersByWorkload(stage3Teachers, teacherWeeklyCount);

    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;

      const sortedTeachers = this.sortTeachersByWorkload(stage3Teachers, teacherWeeklyCount);
      for (const teacher of sortedTeachers) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek, stageId: stage.id, teacherId: teacher.id,
            classId: cls.id, scheduleType: 'stage3',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }

    const unassignedCount = classesToSchedule.length - scheduledClasses.size;
    return { items, unassignedCount };
  }

  /** 检查教师是否可以被安排到指定阶段（同一天同一阶段不能重复） */
  private canTeacherBeScheduled(
    teacherId: number, stageNumber: number,
    teacherDaySchedule: Map<number, number[]>,
  ): boolean {
    const schedules = teacherDaySchedule.get(teacherId) || [];
    return !schedules.includes(stageNumber);
  }

  /** 记录教师的排班 */
  private recordTeacherSchedule(
    teacherId: number, stageNumber: number,
    teacherDaySchedule: Map<number, number[]>,
  ): void {
    const schedules = teacherDaySchedule.get(teacherId) || [];
    schedules.push(stageNumber);
    teacherDaySchedule.set(teacherId, schedules);
  }
}
