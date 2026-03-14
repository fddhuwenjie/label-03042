import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleWeek } from '../entities/schedule-week.entity';
import { Teacher } from '../entities/teacher.entity';
import { Stage } from '../entities/stage.entity';

// 统计分析服务
@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleWeek)
    private weekRepository: Repository<ScheduleWeek>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Stage)
    private stageRepository: Repository<Stage>,
  ) {}

  // 获取指定周的教师统计
  async getWeeklyStatistics(weekId: number) {
    const schedules = await this.scheduleRepository.find({
      where: { weekId },
      relations: ['teacher', 'teacher.subject', 'stage'],
    });
    
    const teachers = await this.teacherRepository.find({
      where: { isActive: true },
      relations: ['subject'],
    });
    
    const stage2 = await this.stageRepository.findOne({
      where: { stageNumber: 2, isActive: true },
    });
    
    // 统计每个教师的排班次数
    const teacherStats = teachers.map(teacher => {
      const teacherSchedules = schedules.filter(s => s.teacherId === teacher.id);
      const totalCount = teacherSchedules.length;
      const stage2Count = stage2 
        ? teacherSchedules.filter(s => s.stageId === stage2.id).length 
        : 0;
      
      return {
        teacherId: teacher.id,
        teacherName: teacher.name,
        subjectName: teacher.subject?.name || '未设置',
        totalCount,
        stage2Count,
      };
    });
    
    // 按总次数排序
    teacherStats.sort((a, b) => b.totalCount - a.totalCount);
    
    return {
      weekId,
      statistics: teacherStats,
      summary: {
        totalSchedules: schedules.length,
        teacherCount: teachers.length,
        avgSchedulesPerTeacher: teachers.length > 0 
          ? (schedules.length / teachers.length).toFixed(2) 
          : 0,
      },
    };
  }

  // 获取第二阶段均衡性分析
  // 获取全阶段均衡性分析
    async getStage2BalanceAnalysis(startWeekId?: number, endWeekId?: number) {
      // 获取所有阶段
      const stages = await this.stageRepository.find({
        where: { isActive: true },
        order: { stageNumber: 'ASC' },
      });

      if (stages.length === 0) {
        return { message: '暂无阶段配置', data: [] };
      }

      // 获取所有已确认的排班周
      const weeks = await this.weekRepository.find({
        where: { status: 'confirmed' },
        order: { year: 'ASC', weekNumber: 'ASC' },
      });

      if (weeks.length === 0) {
        return { message: '暂无已确认的排班数据', data: [] };
      }

      // 获取所有教师
      const teachers = await this.teacherRepository.find({
        where: { isActive: true },
        relations: ['subject'],
      });

      const weekIds = weeks.map(w => w.id);

      // 获取范围内的所有排班
      const schedules = await this.scheduleRepository.find({
        relations: ['teacher'],
      });
      const filteredSchedules = schedules.filter(s => weekIds.includes(s.weekId));

      // 按阶段分别统计每个教师的排班次数
      const stageAnalyses = stages.map(stage => {
        const stageSchedules = filteredSchedules.filter(s => s.stageId === stage.id);

        const teacherStats = teachers.map(teacher => {
          const count = stageSchedules.filter(s => s.teacherId === teacher.id).length;
          return {
            teacherId: teacher.id,
            teacherName: teacher.name,
            subjectName: teacher.subject?.name || '未设置',
            count,
          };
        });

        const counts = teacherStats.map(s => s.count);
        const maxCount = Math.max(...counts, 0);
        const minCount = Math.min(...counts, 0);
        const avgCount = counts.length > 0
          ? counts.reduce((a, b) => a + b, 0) / counts.length
          : 0;

        return {
          stageId: stage.id,
          stageName: stage.name,
          stageNumber: stage.stageNumber,
          statistics: teacherStats.sort((a, b) => b.count - a.count),
          balance: {
            maxCount,
            minCount,
            avgCount: avgCount.toFixed(2),
            variance: maxCount - minCount,
          },
        };
      });

      // 整体工作量统计
      const overallStats = teachers.map(teacher => {
        const totalCount = filteredSchedules.filter(s => s.teacherId === teacher.id).length;
        const perStage: Record<string, number> = {};
        stages.forEach(stage => {
          perStage[`stage${stage.stageNumber}Count`] = filteredSchedules
            .filter(s => s.teacherId === teacher.id && s.stageId === stage.id).length;
        });
        return {
          teacherId: teacher.id,
          teacherName: teacher.name,
          subjectName: teacher.subject?.name || '未设置',
          totalCount,
          ...perStage,
        };
      });

      const overallCounts = overallStats.map(s => s.totalCount);
      const overallMax = Math.max(...overallCounts, 0);
      const overallMin = Math.min(...overallCounts, 0);
      const overallAvg = overallCounts.length > 0
        ? overallCounts.reduce((a, b) => a + b, 0) / overallCounts.length
        : 0;

      // 生成均衡性建议
      const suggestions: string[] = [];

      // 整体工作量建议
      if (overallMax - overallMin > 3) {
        const overloadedTeachers = overallStats
          .filter(s => s.totalCount > overallAvg + 1)
          .map(s => s.teacherName);
        const underloadedTeachers = overallStats
          .filter(s => s.totalCount < overallAvg - 1)
          .map(s => s.teacherName);

        if (overloadedTeachers.length > 0) {
          suggestions.push(`建议减少以下教师的整体排班：${overloadedTeachers.join('、')}`);
        }
        if (underloadedTeachers.length > 0) {
          suggestions.push(`建议增加以下教师的整体排班：${underloadedTeachers.join('、')}`);
        }
      } else {
        suggestions.push('当前整体排班较为均衡');
      }

      // 各阶段建议
      for (const analysis of stageAnalyses) {
        if (analysis.balance.variance > 3) {
          const overloaded = analysis.statistics
            .filter(s => s.count > parseFloat(analysis.balance.avgCount) + 1)
            .map(s => s.teacherName);
          if (overloaded.length > 0) {
            suggestions.push(`${analysis.stageName}排班偏多的教师：${overloaded.join('、')}`);
          }
        }
      }

      // 兼容旧接口：保留 stage2Count 字段
      const stage2 = stages.find(s => s.stageNumber === 2);
      const stage2Analysis = stageAnalyses.find(a => a.stageNumber === 2);

      return {
        weekCount: weeks.length,
        // 兼容旧字段
        statistics: stage2Analysis
          ? stage2Analysis.statistics.map(s => ({
              ...s,
              stage2Count: s.count,
            }))
          : [],
        balance: stage2Analysis?.balance || { maxCount: 0, minCount: 0, avgCount: '0', variance: 0 },
        suggestions,
        // 新增：全阶段分析
        stageAnalyses,
        overallStatistics: overallStats.sort((a, b) => b.totalCount - a.totalCount),
        overallBalance: {
          maxCount: overallMax,
          minCount: overallMin,
          avgCount: overallAvg.toFixed(2),
          variance: overallMax - overallMin,
        },
      };
    }

  // 导出统计数据
  async exportStatistics(weekId: number) {
    const stats = await this.getWeeklyStatistics(weekId);
    const week = await this.weekRepository.findOne({ where: { id: weekId } });
    
    return {
      weekInfo: week,
      ...stats,
    };
  }

  // 获取历史排班记录
  async getHistoryRecords(page: number = 1, pageSize: number = 10) {
    const [weeks, total] = await this.weekRepository.findAndCount({
      order: { year: 'DESC', weekNumber: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    
    return {
      data: weeks,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取多维度统计分析
   * 包括：按学科统计、按星期统计、按阶段统计、教师工作量分布
   */
  async getMultiDimensionStatistics(weekId: number) {
    const schedules = await this.scheduleRepository.find({
      where: { weekId },
      relations: ['teacher', 'teacher.subject', 'stage', 'class'],
    });

    const stages = await this.stageRepository.find({
      where: { isActive: true },
      order: { stageNumber: 'ASC' },
    });

    // 按学科统计
    const subjectStats = new Map<string, { count: number; teachers: Set<string> }>();
    schedules.forEach(s => {
      const subjectName = s.teacher?.subject?.name || '未设置';
      if (!subjectStats.has(subjectName)) {
        subjectStats.set(subjectName, { count: 0, teachers: new Set() });
      }
      const stat = subjectStats.get(subjectName)!;
      stat.count++;
      stat.teachers.add(s.teacher?.name || '');
    });

    const bySubject = Array.from(subjectStats.entries()).map(([name, stat]) => ({
      subjectName: name,
      scheduleCount: stat.count,
      teacherCount: stat.teachers.size,
    })).sort((a, b) => b.scheduleCount - a.scheduleCount);

    // 按星期统计
    const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];
    const byDayOfWeek = [1, 2, 3, 4, 5].map(day => {
      const daySchedules = schedules.filter(s => s.dayOfWeek === day);
      return {
        dayOfWeek: day,
        dayName: dayNames[day],
        scheduleCount: daySchedules.length,
        teacherCount: new Set(daySchedules.map(s => s.teacherId)).size,
        classCount: new Set(daySchedules.map(s => s.classId)).size,
      };
    });

    // 按阶段统计
    const byStage = stages.map(stage => {
      const stageSchedules = schedules.filter(s => s.stageId === stage.id);
      return {
        stageId: stage.id,
        stageName: stage.name,
        stageNumber: stage.stageNumber,
        scheduleCount: stageSchedules.length,
        teacherCount: new Set(stageSchedules.map(s => s.teacherId)).size,
        classCount: new Set(stageSchedules.map(s => s.classId)).size,
      };
    });

    // 教师工作量分布（用于直方图）
    const teacherCounts = new Map<number, number>();
    schedules.forEach(s => {
      teacherCounts.set(s.teacherId, (teacherCounts.get(s.teacherId) || 0) + 1);
    });
    
    const countDistribution = new Map<number, number>();
    teacherCounts.forEach(count => {
      countDistribution.set(count, (countDistribution.get(count) || 0) + 1);
    });

    const workloadDistribution = Array.from(countDistribution.entries())
      .map(([count, teachers]) => ({ scheduleCount: count, teacherCount: teachers }))
      .sort((a, b) => a.scheduleCount - b.scheduleCount);

    // 排班类型分布
    const typeStats = new Map<string, number>();
    schedules.forEach(s => {
      const type = s.scheduleType || 'unknown';
      typeStats.set(type, (typeStats.get(type) || 0) + 1);
    });

    const typeNames: Record<string, string> = {
      headTeacher: '班主任优先',
      mainSubject: '主科优先',
      other: '其他学科',
      fill: '补充安排',
      stage3: '第三阶段',
      unknown: '未知',
    };

    const byScheduleType = Array.from(typeStats.entries()).map(([type, count]) => ({
      type,
      typeName: typeNames[type] || type,
      count,
      percentage: schedules.length > 0 ? ((count / schedules.length) * 100).toFixed(1) : '0',
    }));

    return {
      weekId,
      totalSchedules: schedules.length,
      bySubject,
      byDayOfWeek,
      byStage,
      workloadDistribution,
      byScheduleType,
    };
  }

  /**
   * 获取教师工作量趋势分析
   */
  async getWorkloadTrend(teacherId: number, weekCount: number = 4) {
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId },
      relations: ['subject'],
    });

    if (!teacher) {
      return { message: '教师不存在', data: [] };
    }

    // 获取最近 N 周的已确认排班
    const weeks = await this.weekRepository.find({
      where: { status: 'confirmed' },
      order: { year: 'DESC', weekNumber: 'DESC' },
      take: weekCount,
    });

    if (weeks.length === 0) {
      return { 
        teacher: { id: teacher.id, name: teacher.name, subjectName: teacher.subject?.name },
        message: '暂无已确认的排班数据', 
        data: [] 
      };
    }

    const stage2 = await this.stageRepository.findOne({
      where: { stageNumber: 2, isActive: true },
    });

    // 统计每周的排班情况
    const trendData = await Promise.all(
      weeks.reverse().map(async week => {
        const schedules = await this.scheduleRepository.find({
          where: { weekId: week.id, teacherId },
          relations: ['stage'],
        });

        const totalCount = schedules.length;
        const stage2Count = stage2 
          ? schedules.filter(s => s.stageId === stage2.id).length 
          : 0;

        // 按星期分布
        const byDay = [1, 2, 3, 4, 5].map(day => 
          schedules.filter(s => s.dayOfWeek === day).length
        );

        return {
          weekId: week.id,
          year: week.year,
          weekNumber: week.weekNumber,
          weekLabel: `${week.year}年第${week.weekNumber}周`,
          totalCount,
          stage2Count,
          byDay,
        };
      })
    );

    // 计算趋势指标
    const counts = trendData.map(d => d.totalCount);
    const avgCount = counts.length > 0 
      ? counts.reduce((a, b) => a + b, 0) / counts.length 
      : 0;
    
    // 计算变化趋势（简单线性回归斜率）
    let trend = 'stable';
    if (counts.length >= 2) {
      const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
      const secondHalf = counts.slice(Math.floor(counts.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 1) trend = 'increasing';
      else if (secondAvg < firstAvg - 1) trend = 'decreasing';
    }

    return {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        subjectName: teacher.subject?.name || '未设置',
      },
      summary: {
        avgCount: avgCount.toFixed(2),
        maxCount: Math.max(...counts, 0),
        minCount: Math.min(...counts, 0),
        trend,
        trendLabel: trend === 'increasing' ? '上升' : trend === 'decreasing' ? '下降' : '稳定',
      },
      data: trendData,
    };
  }
}
