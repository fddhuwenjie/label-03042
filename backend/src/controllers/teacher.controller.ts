import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TeacherService } from '../services/teacher.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateTeacherDto, UpdateTeacherDto, SetStage3TeachersDto } from '../dto';

/**
 * 教师管理控制器
 * 
 * 处理教师相关的 CRUD 操作，包括：
 * - 教师的增删改查
 * - 第三阶段教师管理
 * - 教师任教班级配置
 * 
 * @class TeacherController
 * @requires JwtAuthGuard 所有接口需要 JWT 认证
 */
@Controller('teachers')
@UseGuards(JwtAuthGuard)
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  /**
   * 获取所有教师
   * 
   * @description 获取教师列表，包含任教学科和班级信息
   * @param page - 页码（可选）
   * @param pageSize - 每页数量（可选）
   * @returns 教师列表
   */
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.teacherService.findAll(page, pageSize);
  }

  /**
   * 获取单个教师详情
   * 
   * @param id - 教师 ID
   * @returns 教师详细信息
   */
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.teacherService.findOne(id);
  }

  /**
   * 获取可参与第三阶段的教师列表
   * 
   * @description 返回 canStage3 为 true 的教师
   * @returns 第三阶段教师列表
   */
  @Get('stage3/list')
  async findStage3Teachers() {
    return this.teacherService.findStage3Teachers();
  }

  /**
   * 创建教师
   * 
   * @param body - 教师创建数据
   * @returns 创建的教师对象
   * 
   * @example
   * POST /teachers
   * {
   *   "name": "张老师",
   *   "subjectId": 1,
   *   "teachingClassIds": [1, 2, 3],
   *   "canStage3": false
   * }
   */
  @Post()
  async create(@Body() body: CreateTeacherDto) {
    return this.teacherService.create(body);
  }

  /**
   * 更新教师信息
   * 
   * @param id - 教师 ID
   * @param body - 更新数据
   * @returns 更新后的教师对象
   */
  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateTeacherDto) {
    return this.teacherService.update(id, body);
  }

  /**
   * 删除教师
   * 
   * @param id - 教师 ID
   * @returns 删除结果
   */
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.teacherService.remove(id);
  }

  /**
   * 批量设置第三阶段教师
   * 
   * @description 设置哪些教师可以参与第三阶段课后服务
   * @param body - 包含教师 ID 列表
   * @returns 更新结果
   * 
   * @example
   * POST /teachers/stage3/batch
   * { "teacherIds": [1, 2, 3, 4, 5] }
   */
  @Post('stage3/batch')
  async setStage3Teachers(@Body() body: SetStage3TeachersDto) {
    return this.teacherService.setStage3Teachers(body.teacherIds);
  }
}
