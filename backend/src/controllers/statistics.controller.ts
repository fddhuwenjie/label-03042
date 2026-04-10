import { Controller, Get, Param, Query, UseGuards, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { StatisticsService } from '../services/statistics.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import * as XLSX from 'xlsx';

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
  constructor(private statisticsService: StatisticsService) {}

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
   * 导出统计数据 Excel（新版本）
   * 
   * 导出指定周的统计数据 Excel 文件，包含两个工作表：
   * - Sheet1 "教师课时统计"：教师排班次数统计数据
   * - Sheet2 "科目分布"：学科分布统计数据
   * 
   * @param {number} weekId - 排班周 ID
   * @param {Response} res - Express 响应对象
   * @returns {Promise<void>} 直接返回 Excel 文件流
   * @throws {NotFoundException} 当指定的排班周不存在时
   */
  @Get('weeks/:weekId/export')
  async exportStatisticsV2(
    @Param('weekId') weekId: number,
    @Res() res: Response,
  ) {
    // 获取教师课时统计
    const teacherStatsData = await this.statisticsService.getWeeklyStatistics(weekId);
    if (!teacherStatsData) {
      throw new NotFoundException('排班周不存在');
    }

    // 获取多维度统计（用于科目分布）
    const multiDimStats = await this.statisticsService.getMultiDimensionStatistics(weekId);
    
    // 获取周信息
    const weekData = await this.statisticsService.exportStatistics(weekId);
    const week = weekData.weekInfo;

    const workbook = new ExcelJS.Workbook();
    
    // Sheet1: 教师课时统计
    const sheet1 = workbook.addWorksheet('教师课时统计');
    
    // 设置列宽
    sheet1.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];
    
    // 表头
    const header1 = sheet1.addRow(['教师姓名', '任教学科', '总排班次数', '第二阶段次数']);
    header1.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F7FF' },
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // 数据行
    teacherStatsData.statistics.forEach((stat: any) => {
      const row = sheet1.addRow([
        stat.teacherName,
        stat.subjectName,
        stat.totalCount,
        stat.stage2Count,
      ]);
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Sheet2: 科目分布
    const sheet2 = workbook.addWorksheet('科目分布');
    
    // 设置列宽
    sheet2.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
    ];
    
    // 表头
    const header2 = sheet2.addRow(['科目名称', '排班次数', '教师人数']);
    header2.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0FFF0' },
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    
    // 数据行
    multiDimStats.bySubject.forEach((subject: any) => {
      const row = sheet2.addRow([
        subject.subjectName,
        subject.scheduleCount,
        subject.teacherCount,
      ]);
      row.eachCell((cell) => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // 生成文件名
    const weekNum = week?.weekNumber || 1;
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const fileName = `统计数据_第${weekNum}周_${dateStr}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
    );

    await workbook.xlsx.write(res);
    res.end();
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
}
