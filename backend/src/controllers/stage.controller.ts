import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { StageService } from '../services/stage.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { UpdateStageClassCountsDto } from '../dto';

/**
 * 阶段管理控制器
 * 
 * 负责处理课后服务阶段配置相关的 HTTP 请求
 * 
 * 系统将课后服务划分为 3 个阶段：
 * - 第一阶段：基础托管服务
 * - 第二阶段：作业辅导服务
 * - 第三阶段：延时托管服务（仅限指定教师）
 * 
 * 每个阶段可配置参与的班级数量
 * 
 * @description 所有接口需要 JWT 认证
 */
@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StageController {
  constructor(private stageService: StageService) {}

  /**
   * 获取所有阶段配置
   * 
   * @returns {Promise<Stage[]>} 阶段列表，按阶段编号升序排列
   * @example
   * // 返回示例
   * [
   *   { id: 1, stageNumber: 1, name: '第一阶段', classCount: 6, isActive: true },
   *   { id: 2, stageNumber: 2, name: '第二阶段', classCount: 6, isActive: true },
   *   { id: 3, stageNumber: 3, name: '第三阶段', classCount: 4, isActive: true }
   * ]
   */
  @Get()
  async findAll() {
    return this.stageService.findAll();
  }

  /**
   * 获取单个阶段详情
   * 
   * @param {number} id - 阶段 ID
   * @returns {Promise<Stage>} 阶段详情
   * @throws {NotFoundException} 当指定的阶段不存在时
   */
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return this.stageService.findOne(id);
  }

  /**
   * 更新阶段配置
   * 
   * @param {number} id - 阶段 ID
   * @param {Object} body - 更新数据
   * @param {number} [body.classCount] - 参与该阶段的班级数量
   * @param {string} [body.description] - 阶段描述
   * @returns {Promise<Stage>} 更新后的阶段信息
   * @throws {NotFoundException} 当指定的阶段不存在时
   */
  @Put(':id')
  async update(@Param('id') id: number, @Body() body: { classCount?: number; description?: string }) {
    return this.stageService.update(id, body);
  }

  /**
   * 批量更新阶段班级数量
   * 
   * 一次性更新多个阶段的班级数量配置
   * 
   * @param {UpdateStageClassCountsDto} body - 批量更新数据
   * @param {Array<{stageNumber: number, classCount: number}>} body.data - 阶段配置数组
   * @returns {Promise<Stage[]>} 更新后的所有阶段信息
   * @example
   * // 请求示例
   * {
   *   "data": [
   *     { "stageNumber": 1, "classCount": 6 },
   *     { "stageNumber": 2, "classCount": 6 },
   *     { "stageNumber": 3, "classCount": 4 }
   *   ]
   * }
   */
  @Put('class-counts/batch')
  async updateClassCounts(@Body() body: UpdateStageClassCountsDto) {
    return this.stageService.updateClassCounts(body.data);
  }
}
