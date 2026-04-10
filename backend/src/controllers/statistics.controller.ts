import { Controller, Get, Param, Query, UseGuards, Res, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { ScheduleService } from '../services/schedule.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';

/**
 * 统计分析控制器
 * 
 * 负责处理课后服务排班统计相关的所有 HTTP 请求，包括：
 * - 周度教师排班统计
 * - 第二阶段均衡性分析
 * - 历史排班记录查询
 * - 统计数据导出（支持 Excel 和 CSV 格式）
 * - 多维度统计分析
 * 
 * @description 所有接口需要 JWT 认证
 */
@Controller('statistics')
@UseGuards(JwtAuthGuard)
export class StatisticsController {
  constructor(
    private statisticsService: StatisticsService,
    private scheduleService: ScheduleService,
  ) {}

  /**
   * 获取指定周的教师排班统计
   * 
   * 统计每位教师在该周的排班情况，包括总次数和各阶段次数
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<TeacherStatistics[]>} 教师统计列表
   * @example
   * // 返回示例
   * [
   *   {
   *     teacherId: 1,
   *     teacherName: '张老师',
   *     subjectName: '语文',
   *     totalCount: 5,
   *     stage1Count: 2,
   *     stage2Count: 2,
   *     stage3Count: 1
   *   }
   * ]
   */
  @Get('weekly/:weekId')
  async getWeeklyStatistics(@Param('weekId') weekId: number) {
    return this.statisticsService.getWeeklyStatistics(weekId);
  }

  /**
   * 获取第二阶段均衡性分析
   * 
   * 分析教师在第二阶段的排班分布情况，提供均衡性建议
   * 用于帮助管理员了解教师工作量分配是否合理
   * 
   * @param {number} [startWeekId] - 起始周 ID（可选，默认为最早的周）
   * @param {number} [endWeekId] - 结束周 ID（可选，默认为最新的周）
   * @returns {Promise<Stage2BalanceAnalysis>} 均衡性分析结果
   * @example
   * // 返回示例
   * {
   *   statistics: [...],
   *   analysis: {
   *     average: 3.5,
   *     max: 6,
   *     min: 1,
   *     standardDeviation: 1.2,
   *     suggestions: ['建议增加张老师的第二阶段安排']
   *   }
   * }
   */
  @Get('stage2-balance')
  async getStage2BalanceAnalysis(
    @Query('startWeekId') startWeekId?: number,
    @Query('endWeekId') endWeekId?: number,
  ) {
    return this.statisticsService.getStage2BalanceAnalysis(startWeekId, endWeekId);
  }

  /**
   * 获取历史排班记录
   * 
   * 分页查询已确认的排班周记录
   * 
   * @param {number} [page=1] - 页码，从 1 开始
   * @param {number} [pageSize=10] - 每页记录数
   * @returns {Promise<{data: ScheduleWeek[], total: number, page: number, pageSize: number}>} 分页结果
   */
  @Get('history')
  async getHistoryRecords(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.statisticsService.getHistoryRecords(page, pageSize);
  }

  /**
   * 导出统计数据
   * 
   * 支持 Excel 和 CSV 两种格式导出
   * 
   * @param {number} weekId - 排班周 ID
   * @param {string} format - 导出格式：xlsx（默认）或 csv
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>} 直接返回文件流
   * @throws {NotFoundException} 当指定的排班周不存在时
   * @throws {BadRequestException} 当格式参数无效时
   */
  @Get('export/:weekId')
  async exportStatistics(
    @Param('weekId') weekId: number,
    @Query('format') format: string = 'xlsx',
    @Res() res: Response,
  ) {
    const validFormats = ['xlsx', 'csv'];
    if (!validFormats.includes(format)) {
      throw new BadRequestException(`不支持的导出格式: ${format}，支持的格式: ${validFormats.join(', ')}`);
    }

    const data = await this.statisticsService.exportStatistics(weekId);
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    
    // 创建统计数据工作表
    const statsData = data.statistics.map(s => ({
      '教师姓名': s.teacherName,
      '任教学科': s.subjectName,
      '总排班次数': s.totalCount,
      '第二阶段次数': s.stage2Count,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(statsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, '教师统计');
    
    if (format === 'csv') {
      // 导出 CSV 格式
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);
      const buffer = Buffer.from('\uFEFF' + csvContent, 'utf-8'); // 添加 BOM 以支持中文
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=statistics-week-${weekId}.csv`);
      res.send(buffer);
    } else {
      // 导出 Excel 格式
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=statistics-week-${weekId}.xlsx`);
      res.send(buffer);
    }
  }

  /**
   * 获取多维度统计分析
   * 
   * 提供按学科、按星期、按阶段等多维度的统计分析
   * 
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<MultiDimensionStatistics>} 多维度统计结果
   */
  @Get('multi-dimension/:weekId')
  async getMultiDimensionStatistics(@Param('weekId') weekId: number) {
    return this.statisticsService.getMultiDimensionStatistics(weekId);
  }

  /**
   * 获取教师工作量趋势分析
   * 
   * 分析教师在多周内的工作量变化趋势
   * 
   * @param {number} teacherId - 教师 ID
   * @param {number} weekCount - 统计周数（默认 4 周）
   * @returns {Promise<WorkloadTrend>} 工作量趋势数据
   */
  @Get('workload-trend/:teacherId')
  async getWorkloadTrend(
    @Param('teacherId') teacherId: number,
    @Query('weekCount') weekCount: number = 4,
  ) {
    return this.statisticsService.getWorkloadTrend(teacherId, weekCount);
  }

  /**
   * 导出指定周的统计数据为Excel（双Sheet）
   * 
   * 导出该周的统计数据，包含两个Sheet：
   * - Sheet1: 教师课时数统计
   * - Sheet2: 科目分布统计
   * 
   * @param {number} weekId - 排班周 ID
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>} 直接返回文件流
   * @throws {NotFoundException} 当指定的排班周不存在时
   */
  @Get('weeks/:weekId/export')
  async exportWeekStatistics(
    @Param('weekId') weekId: number,
    @Res() res: Response,
  ) {
    // 获取排班周信息
    const { week, schedules } = await this.scheduleService.findByWeek(weekId);
    
    // 获取统计数据
    const stats = await this.statisticsService.getWeeklyStatistics(weekId);
    const multiStats = await this.statisticsService.getMultiDimensionStatistics(weekId);
    
    // 创建工作簿
    const workbook = new ExcelJS.Workbook();
    
    // ========== Sheet 1: 教师课时数统计 ==========
    const teacherSheet = workbook.addWorksheet('教师课时数');
    
    // 设置列
    teacherSheet.columns = [
      { header: '教师姓名', key: 'teacherName', width: 15 },
      { header: '任教学科', key: 'subjectName', width: 15 },
      { header: '总排班次数', key: 'totalCount', width: 15 },
      { header: '第二阶段次数', key: 'stage2Count', width: 15 },
    ];
    
    // 添加数据
    stats.statistics.forEach((s: any) => {
      teacherSheet.addRow({
        teacherName: s.teacherName,
        subjectName: s.subjectName,
        totalCount: s.totalCount,
        stage2Count: s.stage2Count,
      });
    });
    
    // 设置Sheet1表头样式
    const teacherHeaderRow = teacherSheet.getRow(1);
    teacherHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
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
    
    // 设置Sheet1数据样式
    teacherSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
    
    // ========== Sheet 2: 科目分布统计 ==========
    const subjectSheet = workbook.addWorksheet('科目分布');
    
    // 设置列
    subjectSheet.columns = [
      { header: '学科名称', key: 'subjectName', width: 15 },
      { header: '排班次数', key: 'scheduleCount', width: 15 },
      { header: '涉及教师数', key: 'teacherCount', width: 15 },
      { header: '占比(%)', key: 'percentage', width: 15 },
    ];
    
    // 计算总排班数以计算占比
    const totalSchedules = multiStats.totalSchedules || 0;
    
    // 添加数据
    multiStats.bySubject.forEach((s: any) => {
      const percentage = totalSchedules > 0 
        ? ((s.scheduleCount / totalSchedules) * 100).toFixed(1) 
        : '0.0';
      subjectSheet.addRow({
        subjectName: s.subjectName,
        scheduleCount: s.scheduleCount,
        teacherCount: s.teacherCount,
        percentage: percentage + '%',
      });
    });
    
    // 添加汇总行
    subjectSheet.addRow({});
    const summaryRow = subjectSheet.addRow({
      subjectName: '总计',
      scheduleCount: totalSchedules,
      teacherCount: '-',
      percentage: '100%',
    });
    
    // 设置Sheet2表头样式
    const subjectHeaderRow = subjectSheet.getRow(1);
    subjectHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
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
    
    // 设置Sheet2数据样式
    subjectSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1 && rowNumber < subjectSheet.rowCount - 1) {
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      }
    });
    
    // 设置汇总行样式
    summaryRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // 生成文件名：统计数据_第N周_YYYYMMDD.xlsx
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `统计数据_第${week.weekNumber}周_${dateStr}.xlsx`;
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(filename)}`);
    
    // 写入响应
    await workbook.xlsx.write(res);
    res.end();
  }
}
