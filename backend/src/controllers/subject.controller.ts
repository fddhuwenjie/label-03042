import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SubjectService } from '../services/subject.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateSubjectDto, UpdateSubjectDto, SetExcludeDateDto, BatchSetExcludeDatesDto } from '../dto';

/**
 * 学科管理控制器
 * 
 * 处理学科相关的操作，包括：
 * - 学科的增删改查
 * - 学科校验日配置（指定日期该学科教师不参与排班）
 * 
 * @class SubjectController
 * @requires JwtAuthGuard 所有接口需要 JWT 认证
 */
@Controller('subjects')
@UseGuards(JwtAuthGuard)
export class SubjectController {
  constructor(private subjectService: SubjectService) {}

  /**
   * 获取所有学科
   * 
   * @returns 学科列表
   */
  @Get()
  async findAll() {
    return this.subjectService.findAll();
  }

  /**
   * 获取单个学科详情
   * 
   * @param id - 学科 ID
   * @returns 学科详细信息
   */
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.subjectService.findOne(id);
  }

  /**
   * 创建学科
   * 
   * @param body - 学科创建数据
   * @returns 创建的学科对象
   * 
   * @example
   * POST /subjects
   * { "name": "语文", "isMain": true }
   */
  @Post()
  async create(@Body() body: CreateSubjectDto) {
    return this.subjectService.create(body);
  }

  /**
   * 更新学科信息
   * 
   * @param id - 学科 ID
   * @param body - 更新数据
   * @returns 更新后的学科对象
   */
  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateSubjectDto) {
    return this.subjectService.update(id, body);
  }

  /**
   * 删除学科
   * 
   * @param id - 学科 ID
   * @returns 删除结果
   */
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.subjectService.remove(id);
  }

  /**
   * 获取学科校验日配置列表
   * 
   * @description 获取所有学科的校验日配置
   * 配置后，该学科教师在指定日期不参与课后服务排班
   * @returns 校验日配置列表
   */
  @Get('exclude-dates/list')
  async getExcludeDates() {
    return this.subjectService.getExcludeDates();
  }

  /**
   * 设置学科校验日
   * 
   * @description 配置某学科在某天不参与排班
   * @param body - 包含学科ID、星期几和备注
   * @returns 创建的校验日配置
   * 
   * @example
   * POST /subjects/exclude-dates
   * { "subjectId": 3, "dayOfWeek": 3, "remark": "周三体育教研" }
   */
  @Post('exclude-dates')
  async setExcludeDate(@Body() body: SetExcludeDateDto) {
    return this.subjectService.setExcludeDate(body.subjectId, body.dayOfWeek, body.remark);
  }

  /**
   * 删除学科校验日配置
   * 
   * @param id - 校验日配置 ID
   * @returns 删除结果
   */
  @Delete('exclude-dates/:id')
  async removeExcludeDate(@Param('id') id: number) {
    return this.subjectService.removeExcludeDate(id);
  }

  /**
   * 批量设置学科校验日
   * 
   * @param body - 包含多个校验日配置
   * @returns 批量创建结果
   */
  @Post('exclude-dates/batch')
  async batchSetExcludeDates(@Body() body: BatchSetExcludeDatesDto) {
    return this.subjectService.batchSetExcludeDates(body.data);
  }
}
