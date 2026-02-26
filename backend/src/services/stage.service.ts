import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from '../entities/stage.entity';

// 阶段管理服务
@Injectable()
export class StageService implements OnModuleInit {
  constructor(
    @InjectRepository(Stage)
    private stageRepository: Repository<Stage>,
  ) {}

  // 模块初始化时创建默认阶段
  async onModuleInit() {
    const count = await this.stageRepository.count();
    if (count === 0) {
      const defaultStages = [
        { name: '第一阶段', stageNumber: 1, classCount: 0, description: '课后服务第一阶段' },
        { name: '第二阶段', stageNumber: 2, classCount: 0, description: '课后服务第二阶段' },
        { name: '第三阶段', stageNumber: 3, classCount: 0, description: '课后服务第三阶段（仅限指定教师）' },
      ];
      
      for (const stage of defaultStages) {
        await this.stageRepository.save(this.stageRepository.create(stage));
      }
      console.log('默认阶段已创建');
    }
  }

  // 获取所有阶段
  async findAll() {
    return this.stageRepository.find({
      where: { isActive: true },
      order: { stageNumber: 'ASC' },
    });
  }

  // 根据ID获取阶段
  async findOne(id: number) {
    const stage = await this.stageRepository.findOne({
      where: { id, isActive: true },
    });
    
    if (!stage) {
      throw new NotFoundException('阶段不存在');
    }
    
    return stage;
  }

  // 根据阶段序号获取阶段
  async findByNumber(stageNumber: number) {
    return this.stageRepository.findOne({
      where: { stageNumber, isActive: true },
    });
  }

  // 更新阶段配置
  async update(id: number, data: Partial<Stage>) {
    const stage = await this.findOne(id);
    Object.assign(stage, data);
    return this.stageRepository.save(stage);
  }

  // 批量更新阶段班级数量
  async updateClassCounts(data: { stageNumber: number; classCount: number }[]) {
    for (const item of data) {
      await this.stageRepository.update(
        { stageNumber: item.stageNumber, isActive: true },
        { classCount: item.classCount },
      );
    }
    return this.findAll();
  }
}
