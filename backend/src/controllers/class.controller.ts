import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClassService } from '../services/class.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateClassDto, UpdateClassDto, BatchCreateClassDto, SetHeadTeacherDto } from '../dto';

/**
 * 班级管理控制器
 * 
 * 处理班级相关的 CRUD 操作，包括：
 * - 班级的增删改查
 * - 批量创建班级
 * - 设置班主任
 * 
 * @class ClassController
 * @requires JwtAuthGuard 所有接口需要 JWT 认证
 */
@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassController {
  constructor(private classService: ClassService) {}

  /**
   * 获取所有班级
   * 
   * @description 获取班级列表，支持分页查询
   * @param page - 页码（可选）
   * @param pageSize - 每页数量（可选）
   * @returns 班级列表，包含班主任信息
   * 
   * @example
   * GET /classes
   * GET /classes?page=1&pageSize=10
   */
  @Get()
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.classService.findAll(page, pageSize);
  }

  /**
   * 获取单个班级详情
   * 
   * @param id - 班级 ID
   * @returns 班级详细信息
   * @throws NotFoundException 当班级不存在时
   */
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.classService.findOne(id);
  }

  /**
   * 创建班级
   * 
   * @param body - 班级创建数据
   * @returns 创建的班级对象
   * 
   * @example
   * POST /classes
   * { "name": "一年级1班", "grade": "一年级", "classNumber": 1 }
   */
  @Post()
  async create(@Body() body: CreateClassDto) {
    return this.classService.create(body);
  }

  /**
   * 批量创建班级
   * 
   * @description 根据年级列表和每年级班级数批量创建班级
   * @warning 此操作会清除现有班级数据
   * @param body - 包含年级列表和每年级班级数
   * @returns 创建结果
   * 
   * @example
   * POST /classes/batch
   * { "grades": ["一年级", "二年级"], "classCountPerGrade": 6 }
   */
  @Post('batch')
  async batchCreate(@Body() body: BatchCreateClassDto) {
    return this.classService.batchCreate(body.grades, body.classCountPerGrade);
  }

  /**
   * 更新班级信息
   * 
   * @param id - 班级 ID
   * @param body - 更新数据
   * @returns 更新后的班级对象
   */
  @Put(':id')
  async update(@Param('id') id: number, @Body() body: UpdateClassDto) {
    return this.classService.update(id, body);
  }

  /**
   * 删除班级
   * 
   * @param id - 班级 ID
   * @returns 删除结果
   */
  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.classService.remove(id);
  }

  /**
   * 设置班主任
   * 
   * @description 为指定班级设置班主任教师
   * @param classId - 班级 ID
   * @param body - 包含教师 ID
   * @returns 更新后的班级对象
   * 
   * @example
   * PUT /classes/1/head-teacher
   * { "teacherId": 5 }
   */
  @Put(':id/head-teacher')
  async setHeadTeacher(
    @Param('id') classId: number,
    @Body() body: SetHeadTeacherDto,
  ) {
    return this.classService.setHeadTeacher(classId, body.teacherId);
  }
}
