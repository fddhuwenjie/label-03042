import { Controller, Get, Param, Query, UseGuards, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { StatisticsService } from '../services/statistics.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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
  async exportStatisticsLegacy(
    @Param('weekId') weekId: number,
    @Query('format') format: string = 'xlsx',
    @Res() res: Response,
  ) {
    return this.exportStatisticsExcel(weekId, res);
  }

  @Get('weeks/:weekId/export')
  async exportStatistics(
    @Param('weekId') weekId: number,
    @Res() res: Response,
  ) {
    return this.exportStatisticsExcel(weekId, res);
  }

  private async exportStatisticsExcel(
    weekId: number,
    res: Response,
  ) {
    const weekData = await this.statisticsService.exportStatistics(weekId);
    if (!weekData || !weekData.weekInfo) {
      throw new NotFoundException('排班周不存在');
    }

    const multiDimData = await this.statisticsService.getMultiDimensionStatistics(weekId);

    const workbook = new ExcelJS.Workbook();

    const teacherSheet = workbook.addWorksheet('教师课时数');
    teacherSheet.columns = [
      { header: '教师姓名', key: 'teacherName', width: 20 },
      { header: '任教学科', key: 'subjectName', width: 20 },
      { header: '总课时数', key: 'totalCount', width: 15 },
      { header: '第二阶段课时', key: 'stage2Count', width: 18 },
    ];
    weekData.statistics.forEach(s => teacherSheet.addRow(s));

    const subjectSheet = workbook.addWorksheet('科目分布');
    subjectSheet.columns = [
      { header: '科目名称', key: 'subjectName', width: 25 },
      { header: '排班次数', key: 'scheduleCount', width: 15 },
      { header: '涉及教师数', key: 'teacherCount', width: 18 },
    ];
    multiDimData.bySubject.forEach(item => subjectSheet.addRow(item));

    const filename = `统计数据_第${weekData.weekInfo.weekNumber}周.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

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
