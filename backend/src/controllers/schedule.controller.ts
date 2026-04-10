import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateWeekDto, UpdateScheduleDto } from '../dto';
import * as ExcelJS from 'exceljs';

/**
 * 排班管理控制器
 * 
 * 负责处理课后服务排班相关的所有 HTTP 请求，包括：
 * - 排班周的创建、查询、删除
 * - 排班的自动生成和手动调整
 * - 排班确认和状态管理
 * 
 * @description 所有接口需要 JWT 认证
 */
@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class ScheduleController {
  constructor(private scheduleService: ScheduleService) {}

  /**
   * 获取所有排班周列表
   * 
   * @returns {Promise<ScheduleWeek[]>} 排班周列表，按年份和周数倒序排列
   * @example
   * // 返回示例
   * [
   *   { id: 1, year: 2024, weekNumber: 10, status: 'confirmed', ... },
   *   { id: 2, year: 2024, weekNumber: 9, status: 'draft', ... }
   * ]
   */
  @Get('weeks')
  async findAllWeeks() {
    return this.scheduleService.findAllWeeks();
  }

  /**
   * 获取当前周信息
   * 
   * 根据系统日期自动计算当前所在的年份和周数
   * 
   * @returns {Promise<{year: number, weekNumber: number, startDate: string, endDate: string}>} 当前周信息
   */
  @Get('current-week')
  async getCurrentWeekInfo() {
    return this.scheduleService.getCurrentWeekInfo();
  }

  /**
   * 获取指定周的排班详情
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<{week: ScheduleWeek, schedules: Schedule[]}>} 排班周信息及其所有排班记录
   * @throws {NotFoundException} 当指定的排班周不存在时
   */
  @Get('weeks/:weekId')
  async findByWeek(@Param('weekId') weekId: number) {
    return this.scheduleService.findByWeek(weekId);
  }

  /**
   * 创建新的排班周
   * 
   * @param {CreateWeekDto} body - 创建排班周的数据
   * @param {number} body.year - 年份
   * @param {number} body.weekNumber - 周数（1-53）
   * @param {string} body.startDate - 周开始日期（周一）
   * @param {string} body.endDate - 周结束日期（周日）
   * @returns {Promise<ScheduleWeek>} 新创建的排班周
   * @throws {ConflictException} 当同年同周的排班周已存在时
   */
  @Post('weeks')
  async createWeek(@Body() body: CreateWeekDto) {
    return this.scheduleService.createWeek(
      body.year,
      body.weekNumber,
      new Date(body.startDate),
      new Date(body.endDate),
    );
  }

  /**
   * 生成指定周的排班
   * 
   * 调用智能排班引擎，根据以下优先级规则自动生成排班：
   * 1. 班主任优先安排到自己班级
   * 2. 主科教师（语数英）优先安排到任教班级
   * 3. 其他教师安排到空余班级
   * 4. 第三阶段仅限指定教师，且需从第一阶段连续安排
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<{schedules: Schedule[], warnings: ScheduleWarning[]}>} 生成的排班及警告信息
   * @throws {NotFoundException} 当指定的排班周不存在时
   * @throws {BadRequestException} 当排班周已确认无法重新生成时
   */
  @Post('weeks/:weekId/generate')
  async generateSchedule(@Param('weekId') weekId: number) {
    return this.scheduleService.generateSchedule(weekId);
  }

  /**
   * 更新单个排班记录
   * 
   * 用于手动调整自动生成的排班，支持更换教师或班级
   * 
   * @param {number} id - 排班记录 ID
   * @param {UpdateScheduleDto} body - 更新数据
   * @param {number} [body.teacherId] - 新的教师 ID
   * @param {number} [body.classId] - 新的班级 ID
   * @returns {Promise<Schedule>} 更新后的排班记录
   * @throws {NotFoundException} 当指定的排班记录不存在时
   * @throws {BadRequestException} 当所属排班周已确认无法修改时
   */
  @Put(':id')
  async updateSchedule(@Param('id') id: number, @Body() body: UpdateScheduleDto) {
    return this.scheduleService.updateSchedule(id, body);
  }

  /**
   * 确认排班周
   * 
   * 将排班周状态从草稿变更为已确认，确认后不可再修改
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<ScheduleWeek>} 确认后的排班周
   * @throws {NotFoundException} 当指定的排班周不存在时
   * @throws {BadRequestException} 当排班周已确认或没有排班记录时
   */
  @Post('weeks/:weekId/confirm')
  async confirmWeek(@Param('weekId') weekId: number) {
    return this.scheduleService.confirmWeek(weekId);
  }

  /**
   * 删除排班周
   * 
   * 删除排班周及其所有关联的排班记录
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<void>}
   * @throws {NotFoundException} 当指定的排班周不存在时
   * @throws {BadRequestException} 当排班周已确认无法删除时
   */
  @Delete('weeks/:weekId')
  async deleteWeek(@Param('weekId') weekId: number) {
    return this.scheduleService.deleteWeek(weekId);
  }

  /**
   * 导出排课方案为Excel
   * 
   * 生成Excel文件，表头为"时段\周一\周二\周三\周四\周五"，
   * 每个单元格显示"科目名-教师名(教室)"，空时段显示"-"
   * 
   * @param {number} weekId - 排班周 ID
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>} 直接返回文件流
   * @throws {NotFoundException} 当指定的排班周不存在时
   */
  @Get('weeks/:weekId/export')
  async exportSchedule(@Param('weekId') weekId: number, @Res() res: Response) {
    const { week, schedules } = await this.scheduleService.findByWeek(weekId);
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('排课方案');
    
    // 设置列宽
    worksheet.columns = [
      { header: '时段', key: 'stage', width: 15 },
      { header: '周一', key: 'monday', width: 25 },
      { header: '周二', key: 'tuesday', width: 25 },
      { header: '周三', key: 'wednesday', width: 25 },
      { header: '周四', key: 'thursday', width: 25 },
      { header: '周五', key: 'friday', width: 25 },
    ];
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // 获取所有阶段
    const stages = [...new Set(schedules.map(s => s.stageId))].sort();
    const stageMap = new Map();
    schedules.forEach(s => {
      if (!stageMap.has(s.stageId)) {
        stageMap.set(s.stageId, s.stage);
      }
    });
    
    // 按阶段和星期组织数据
    stages.forEach((stageId, index) => {
      const stage = stageMap.get(stageId);
      const rowData: any = { stage: stage?.name || `阶段${index + 1}` };
      
      // 遍历周一到周五
      for (let day = 1; day <= 5; day++) {
        const daySchedules = schedules.filter(
          s => s.stageId === stageId && s.dayOfWeek === day
        );
        
        if (daySchedules.length === 0) {
          rowData[['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][day - 1]] = '-';
        } else {
          // 多个排班用换行符连接
          const cellValue = daySchedules
            .map(s => {
              const subjectName = s.teacher?.subject?.name || '未设置';
              const teacherName = s.teacher?.name || '未分配';
              const className = s.class?.name || '未分配';
              return `${subjectName}-${teacherName}(${className})`;
            })
            .join('\n');
          rowData[['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][day - 1]] = cellValue;
        }
      }
      
      const row = worksheet.addRow(rowData);
      
      // 设置单元格样式
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      
      // 设置行高以容纳多行内容
      row.height = 40;
    });
    
    // 生成文件名：排课方案_第N周_YYYYMMDD.xlsx
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `排课方案_第${week.weekNumber}周_${dateStr}.xlsx`;
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    
    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  }
}
