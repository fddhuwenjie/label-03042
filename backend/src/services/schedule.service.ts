import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleWeek } from '../entities/schedule-week.entity';
import { SchedulingEngine } from './scheduling-engine.service';
import { LoggerService } from './logger.service';

// 排班管理服务
@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleWeek)
    private weekRepository: Repository<ScheduleWeek>,
    private schedulingEngine: SchedulingEngine,
    private logger: LoggerService,
  ) {}

  // 获取所有排班周
  async findAllWeeks() {
    return this.weekRepository.find({
      order: { year: 'DESC', weekNumber: 'DESC' },
    });
  }

  // 获取指定周的排班
  async findByWeek(weekId: number) {
    const week = await this.weekRepository.findOne({ where: { id: weekId } });
    if (!week) {
      throw new NotFoundException('排班周不存在');
    }
    
    const schedules = await this.scheduleRepository.find({
      where: { weekId },
      relations: ['teacher', 'teacher.subject', 'class', 'stage'],
      order: { dayOfWeek: 'ASC', stageId: 'ASC' },
    });
    
    return { week, schedules };
  }

  // 创建新的排班周
  async createWeek(year: number, weekNumber: number, startDate: Date, endDate: Date) {
    // 检查是否已存在
    const existing = await this.weekRepository.findOne({
      where: { year, weekNumber },
    });
    
    if (existing) {
      throw new BadRequestException('该周的排班已存在');
    }
    
    const week = this.weekRepository.create({
      year,
      weekNumber,
      startDate,
      endDate,
      status: 'draft',
    });
    
    const saved = await this.weekRepository.save(week);
    this.logger.logOperation('创建排班周', undefined, { year, weekNumber, weekId: saved.id });
    return saved;
  }

  // 生成排班
  async generateSchedule(weekId: number) {
    const week = await this.weekRepository.findOne({ where: { id: weekId } });
    if (!week) {
      throw new NotFoundException('排班周不存在');
    }
    
    if (week.status === 'confirmed') {
      throw new BadRequestException('已确认的排班不能重新生成');
    }
    
    this.logger.logScheduling('开始生成排班', weekId);
    
    // 删除现有排班
    await this.scheduleRepository.delete({ weekId });
    
    // 生成新排班
    const result = await this.schedulingEngine.generateWeekSchedule(weekId);
    
    // 保存排班
    const schedules = result.items.map(item => 
      this.scheduleRepository.create({
        weekId,
        ...item,
      })
    );
    
    await this.scheduleRepository.save(schedules);
    
    this.logger.logScheduling('排班生成完成', weekId, { 
      scheduleCount: schedules.length,
      warningCount: result.warnings.length,
    });
    
    const weekData = await this.findByWeek(weekId);
    
    // 返回排班结果和警告信息
    return {
      ...weekData,
      warnings: result.warnings,
    };
  }

  // 更新单个排班
  async updateSchedule(id: number, data: { teacherId?: number; classId?: number }) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['week'],
    });
    
    if (!schedule) {
      throw new NotFoundException('排班记录不存在');
    }
    
    if (schedule.week.status === 'confirmed') {
      throw new BadRequestException('已确认的排班不能修改');
    }
    
    if (data.teacherId) schedule.teacherId = data.teacherId;
    if (data.classId) schedule.classId = data.classId;
    
    return this.scheduleRepository.save(schedule);
  }

  // 确认排班
  async confirmWeek(weekId: number) {
    const week = await this.weekRepository.findOne({ where: { id: weekId } });
    if (!week) {
      throw new NotFoundException('排班周不存在');
    }
    
    week.status = 'confirmed';
    const saved = await this.weekRepository.save(week);
    this.logger.logOperation('确认排班', undefined, { weekId, year: week.year, weekNumber: week.weekNumber });
    return saved;
  }

  // 删除排班周
  async deleteWeek(weekId: number) {
    const week = await this.weekRepository.findOne({ where: { id: weekId } });
    if (!week) {
      throw new NotFoundException('排班周不存在');
    }
    
    // 删除关联的排班记录
    await this.scheduleRepository.delete({ weekId });
    
    // 删除排班周
    return this.weekRepository.remove(week);
  }

  // 获取当前周信息
  getCurrentWeekInfo() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    
    // 计算本周一和周五
    const dayOfWeek = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    return {
      year: now.getFullYear(),
      weekNumber,
      startDate: monday,
      endDate: friday,
    };
  }
}
