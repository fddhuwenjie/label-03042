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
 * 
 * @interface ScheduleItem
 * @property {number} dayOfWeek - 星期几（1-5，周一到周五）
 * @property {number} stageId - 阶段 ID
 * @property {number} teacherId - 教师 ID
 * @property {number} classId - 班级 ID
 * @property {string} scheduleType - 排班类型（headTeacher/mainSubject/other/fill/stage3）
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
 * 
 * 用于记录排班过程中遇到的问题和异常情况
 * 
 * @interface ScheduleWarning
 * @property {'teacher_shortage' | 'class_unassigned' | 'stage3_shortage'} type - 警告类型
 * @property {string} message - 警告消息
 * @property {number} [dayOfWeek] - 相关的星期几
 * @property {number} [stageNumber] - 相关的阶段编号
 * @property {any} [details] - 额外详情
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
 * 
 * @interface ScheduleResult
 * @property {ScheduleItem[]} items - 生成的排班项列表
 * @property {ScheduleWarning[]} warnings - 排班过程中的警告列表
 */
export interface ScheduleResult {
  items: ScheduleItem[];
  warnings: ScheduleWarning[];
}

/**
 * 智能排班引擎服务
 * 
 * 核心排班算法实现，负责根据业务规则自动生成一周的课后服务排班
 * 
 * ## 排班规则
 * 
 * ### 三级优先级算法
 * 1. **第一优先级**：班主任每天优先安排 1 次到自己班级
 * 2. **第二优先级**：主科教师（语数英）每天优先安排 1 次到任教班级
 * 3. **第三优先级**：其他学科教师安排到空余班级
 * 
 * ### 第三阶段特殊规则
 * - 仅限标记为 `canStage3=true` 的教师参与
 * - 参与第三阶段的教师必须当天从第一阶段连续安排至第三阶段
 * - 确保教师工作的连续性，避免中间空档
 * 
 * ### 学科排除规则
 * - 支持配置学科在特定日期不参与排班（如体育课周三不排班）
 * - 排班时自动过滤被排除学科的教师
 * 
 * @class SchedulingEngine
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
   * 1. 班主任每天优先安排到自己班级（第一优先级）
   * 2. 主科教师（语数英）每天优先安排到任教班级（第二优先级）
   * 3. 其他教师安排到空余班级（第三优先级）
   * 4. 第三阶段仅限指定教师，且必须从第一阶段连续安排
   */
  async generateWeekSchedule(weekId: number): Promise<ScheduleResult> {
    this.logger.logScheduling('开始生成排班', weekId);

    // 获取基础数据
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
    
    // 初始化教师周工作量统计（用于均衡性优化）
    const teacherWeeklyCount: Map<number, number> = new Map();
    teachers.forEach(t => teacherWeeklyCount.set(t.id, 0));
    
    // 检查基础数据是否充足
    if (teachers.length === 0) {
      warnings.push({
        type: 'teacher_shortage',
        message: '系统中没有可用的教师，请先添加教师信息',
      });
    }
    
    if (classes.length === 0) {
      warnings.push({
        type: 'class_unassigned',
        message: '系统中没有可用的班级，请先添加班级信息',
      });
    }
    
    // 检查阶段配置是否完整
    if (stages.length === 0) {
      warnings.push({
        type: 'class_unassigned',
        message: '系统中没有阶段配置，请先配置课后服务阶段',
      });
    }
    
    // 检查教师数量是否足够覆盖最大阶段班级数
    const maxClassCount = Math.max(...stages.map(s => s.classCount), 0);
    if (teachers.length > 0 && maxClassCount > 0 && teachers.length < maxClassCount) {
      warnings.push({
        type: 'teacher_shortage',
        message: `教师数量(${teachers.length})少于最大阶段班级数(${maxClassCount})，部分班级可能无法安排`,
      });
    }
    
    // 检查第三阶段教师是否充足
    const stage3 = stages.find(s => s.stageNumber === 3);
    const stage3Teachers = teachers.filter(t => t.canStage3);
    if (stage3 && stage3.classCount > 0 && stage3Teachers.length === 0) {
      warnings.push({
        type: 'stage3_shortage',
        message: '没有可参与第三阶段的教师，请在教师管理中设置',
      });
    }
    
    // 检查第三阶段教师数量是否足够
    if (stage3 && stage3.classCount > 0 && stage3Teachers.length < stage3.classCount) {
      warnings.push({
        type: 'stage3_shortage',
        message: `第三阶段教师数量(${stage3Teachers.length})少于需安排班级数(${stage3.classCount})`,
      });
    }
    
    // 遍历周一到周五
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      // 获取当天被排除的学科ID
      const excludedSubjectIds = excludeDates
        .filter(ed => ed.dayOfWeek === dayOfWeek)
        .map(ed => ed.subjectId);
      
      // 过滤当天可用的教师
      const availableTeachers = teachers.filter(t => 
        !t.subjectId || !excludedSubjectIds.includes(t.subjectId)
      );
      
      // 记录当天每个教师的排班情况（用于检查连续性）
      const teacherDaySchedule: Map<number, number[]> = new Map();
      
      // 记录当天班主任是否已安排到自己班级（每天每个班主任优先安排1次到自己班级）
      const headTeacherAssignedToday: Set<number> = new Set();
      
      // 记录当天主科教师是否已安排到任教班级（每天每个主科教师优先安排1次到任教班级）
      const mainSubjectTeacherAssignedToday: Set<number> = new Set();
      
      // 遍历每个阶段
      for (const stage of stages) {
        this.logger.logScheduling(`开始生成 星期${dayOfWeek} ${stage.name} 排班`, weekId, {
          stageNumber: stage.stageNumber,
          classCount: stage.classCount,
          availableTeacherCount: availableTeachers.length,
        });
        
        const { items: stageSchedule, unassignedCount } = this.generateStageSchedule(
          dayOfWeek,
          stage,
          availableTeachers,
          classes,
          teacherDaySchedule,
          headTeacherAssignedToday,
          mainSubjectTeacherAssignedToday,
          teacherWeeklyCount,
        );
        
        scheduleItems.push(...stageSchedule);
        
        this.logger.logScheduling(`完成 星期${dayOfWeek} ${stage.name} 排班`, weekId, {
          scheduledCount: stageSchedule.length,
          unassignedCount,
        });
        
        // 记录未分配的班级警告
        if (unassignedCount > 0) {
          const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];
          warnings.push({
            type: stage.stageNumber === 3 ? 'stage3_shortage' : 'teacher_shortage',
            message: `${dayNames[dayOfWeek]}${stage.name}有${unassignedCount}个班级因教师不足未能安排`,
            dayOfWeek,
            stageNumber: stage.stageNumber,
            details: { unassignedCount },
          });
        }
      }
    }
    
    this.logger.logScheduling('排班生成完成', weekId, {
      totalSchedules: scheduleItems.length,
      warningCount: warnings.length,
    });
    
    return { items: scheduleItems, warnings };
  }

  /**
   * 生成单个阶段的排班
   * 
   * 优化：引入教师周工作量统计，优先安排工作量较少的教师
   */
  private generateStageSchedule(
    dayOfWeek: number,
    stage: Stage,
    availableTeachers: Teacher[],
    classes: Class[],
    teacherDaySchedule: Map<number, number[]>,
    headTeacherAssignedToday: Set<number>,
    mainSubjectTeacherAssignedToday: Set<number>,
    teacherWeeklyCount?: Map<number, number>,
  ): { items: ScheduleItem[]; unassignedCount: number } {
    const items: ScheduleItem[] = [];
    const classCount = stage.classCount;
    
    if (classCount === 0) return { items, unassignedCount: 0 };
    
    // 需要安排的班级（取前N个班级）
    const classesToSchedule = classes.slice(0, classCount);
    const scheduledClasses: Set<number> = new Set();
    
    // 第三阶段特殊处理
    if (stage.stageNumber === 3) {
      const result = this.generateStage3Schedule(
        dayOfWeek,
        stage,
        availableTeachers,
        classesToSchedule,
        teacherDaySchedule,
        teacherWeeklyCount,
      );
      return result;
    }
    
    // 第一优先级：班主任每天优先安排1次到自己班级
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;
      
      if (cls.headTeacherId) {
        // 检查该班主任当天是否已经安排到自己班级
        if (headTeacherAssignedToday.has(cls.headTeacherId)) {
          continue; // 当天已安排过，跳过
        }
        
        const headTeacher = availableTeachers.find(t => t.id === cls.headTeacherId);
        if (headTeacher && this.canTeacherBeScheduled(headTeacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek,
            stageId: stage.id,
            teacherId: headTeacher.id,
            classId: cls.id,
            scheduleType: 'headTeacher',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(headTeacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(headTeacher.id, teacherWeeklyCount);
          // 标记该班主任当天已安排到自己班级
          headTeacherAssignedToday.add(cls.headTeacherId);
        }
      }
    }
    
    // 第二优先级：主科教师（语数英）每天优先安排1次到任教班级
    // 优化：按周工作量排序，优先安排工作量少的教师
    const mainSubjectTeachers = this.sortTeachersByWorkload(
      availableTeachers.filter(t => t.subject?.isMain && t.teachingClasses?.length > 0),
      teacherWeeklyCount
    );
    
    for (const teacher of mainSubjectTeachers) {
      // 检查该主科教师当天是否已经安排到任教班级
      if (mainSubjectTeacherAssignedToday.has(teacher.id)) {
        continue; // 当天已安排过，跳过
      }
      
      if (!this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
        continue;
      }
      
      for (const teachingClass of teacher.teachingClasses) {
        const cls = classesToSchedule.find(c => c.id === teachingClass.id);
        if (cls && !scheduledClasses.has(cls.id)) {
          items.push({
            dayOfWeek,
            stageId: stage.id,
            teacherId: teacher.id,
            classId: cls.id,
            scheduleType: 'mainSubject',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          // 标记该主科教师当天已安排到任教班级
          mainSubjectTeacherAssignedToday.add(teacher.id);
          break;
        }
      }
    }
    
    // 第三优先级：其他教师安排到空余班级
    // 优化：按周工作量排序，优先安排工作量少的教师
    const otherTeachers = this.sortTeachersByWorkload(
      availableTeachers.filter(t => !t.subject?.isMain),
      teacherWeeklyCount
    );
    
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;
      
      // 重新排序以获取当前工作量最少的教师
      const sortedOthers = this.sortTeachersByWorkload(otherTeachers, teacherWeeklyCount);
      
      for (const teacher of sortedOthers) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek,
            stageId: stage.id,
            teacherId: teacher.id,
            classId: cls.id,
            scheduleType: 'other',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }
    
    // 如果还有未安排的班级，用任意可用教师填充
    // 优化：按周工作量排序
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;
      
      const sortedAll = this.sortTeachersByWorkload(availableTeachers, teacherWeeklyCount);
      
      for (const teacher of sortedAll) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek,
            stageId: stage.id,
            teacherId: teacher.id,
            classId: cls.id,
            scheduleType: 'fill',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }
    
    // 计算未分配的班级数
    const unassignedCount = classesToSchedule.length - scheduledClasses.size;
    
    return { items, unassignedCount };
  }

  /**
   * 按周工作量排序教师（工作量少的优先）
   */
  private sortTeachersByWorkload(teachers: Teacher[], weeklyCount?: Map<number, number>): Teacher[] {
    if (!weeklyCount) return teachers;
    
    return [...teachers].sort((a, b) => {
      const countA = weeklyCount.get(a.id) || 0;
      const countB = weeklyCount.get(b.id) || 0;
      return countA - countB;
    });
  }

  /**
   * 增加教师周工作量计数
   */
  private incrementWeeklyCount(teacherId: number, weeklyCount?: Map<number, number>): void {
    if (!weeklyCount) return;
    weeklyCount.set(teacherId, (weeklyCount.get(teacherId) || 0) + 1);
  }

  /**
   * 生成第三阶段排班（特殊规则）
   * 第三阶段仅限指定教师参与，且必须从第一阶段连续安排至第三阶段
   * 
   * 连续性说明：
   * - 排班按阶段顺序进行（阶段1 -> 阶段2 -> 阶段3）
   * - 每个教师每天每阶段只能安排一次
   * - 因此如果教师同时有阶段1和阶段2的记录，必然是连续的（1->2）
   * - 加上阶段3就形成完整的连续链（1->2->3）
   * 
   * 优化：按周工作量排序，优先安排工作量少的教师
   */
  private generateStage3Schedule(
    dayOfWeek: number,
    stage: Stage,
    availableTeachers: Teacher[],
    classesToSchedule: Class[],
    teacherDaySchedule: Map<number, number[]>,
    teacherWeeklyCount?: Map<number, number>,
  ): { items: ScheduleItem[]; unassignedCount: number } {
    const items: ScheduleItem[] = [];
    const scheduledClasses: Set<number> = new Set();
    
    // 只选择可参与第三阶段且当天已经从第一阶段连续安排的教师
    // 连续性验证：由于排班按阶段顺序进行，拥有阶段1和阶段2记录即表示连续安排
    let stage3Teachers = availableTeachers.filter(t => {
      if (!t.canStage3) return false;
      
      const schedules = teacherDaySchedule.get(t.id) || [];
      // 必须同时有阶段1和阶段2的安排，才能参与阶段3（确保1->2->3连续）
      const hasStage1 = schedules.includes(1);
      const hasStage2 = schedules.includes(2);
      return hasStage1 && hasStage2;
    });

    // 优化：按周工作量排序
    stage3Teachers = this.sortTeachersByWorkload(stage3Teachers, teacherWeeklyCount);
    
    for (const cls of classesToSchedule) {
      if (scheduledClasses.has(cls.id)) continue;
      
      // 重新排序以获取当前工作量最少的教师
      const sortedTeachers = this.sortTeachersByWorkload(stage3Teachers, teacherWeeklyCount);
      
      for (const teacher of sortedTeachers) {
        if (this.canTeacherBeScheduled(teacher.id, stage.stageNumber, teacherDaySchedule)) {
          items.push({
            dayOfWeek,
            stageId: stage.id,
            teacherId: teacher.id,
            classId: cls.id,
            scheduleType: 'stage3',
          });
          scheduledClasses.add(cls.id);
          this.recordTeacherSchedule(teacher.id, stage.stageNumber, teacherDaySchedule);
          this.incrementWeeklyCount(teacher.id, teacherWeeklyCount);
          break;
        }
      }
    }
    
    // 计算未分配的班级数
    const unassignedCount = classesToSchedule.length - scheduledClasses.size;
    
    return { items, unassignedCount };
  }

  /**
   * 检查教师是否可以被安排到指定阶段
   */
  private canTeacherBeScheduled(
    teacherId: number,
    stageNumber: number,
    teacherDaySchedule: Map<number, number[]>,
  ): boolean {
    const schedules = teacherDaySchedule.get(teacherId) || [];
    // 同一天同一阶段不能重复安排
    return !schedules.includes(stageNumber);
  }

  /**
   * 记录教师的排班
   */
  private recordTeacherSchedule(
    teacherId: number,
    stageNumber: number,
    teacherDaySchedule: Map<number, number[]>,
  ): void {
    const schedules = teacherDaySchedule.get(teacherId) || [];
    schedules.push(stageNumber);
    teacherDaySchedule.set(teacherId, schedules);
  }
}
