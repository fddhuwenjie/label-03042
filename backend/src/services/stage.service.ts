import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
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
      order: { id: 'ASC' },
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

  // 校验阶段间班级数量约束：阶段1 >= 阶段2 >= 阶段3
  private validateClassCountConstraints(countMap: Map<number, number>) {
    const stage1 = countMap.get(1) ?? 0;
    const stage2 = countMap.get(2) ?? 0;
    const stage3 = countMap.get(3) ?? 0;

    if (stage2 > stage1) {
      throw new BadRequestException('第二阶段的班级数量不能超过第一阶段');
    }
    if (stage3 > stage2) {
      throw new BadRequestException('第三阶段的班级数量不能超过第二阶段');
    }
  }

  // 更新阶段配置
  async update(id: number, data: Partial<Stage>) {
    const stage = await this.findOne(id);

    // 如果更新了 classCount，需要校验跨阶段约束
    if (data.classCount !== undefined) {
      const allStages = await this.findAll();
      const countMap = new Map<number, number>();
      for (const s of allStages) {
        countMap.set(s.stageNumber, s.classCount);
      }
      // 用新值覆盖当前阶段
      countMap.set(stage.stageNumber, data.classCount);
      this.validateClassCountConstraints(countMap);
    }

    Object.assign(stage, data);
    return this.stageRepository.save(stage);
  }

  // 批量更新阶段班级数量
  async updateClassCounts(data: { stageNumber: number; classCount: number }[]) {
    // 先校验阶段间约束
    const countMap = new Map<number, number>();
    // 加载现有数据作为基础
    const allStages = await this.findAll();
    for (const s of allStages) {
      countMap.set(s.stageNumber, s.classCount);
    }
    // 用提交的数据覆盖
    for (const item of data) {
      countMap.set(item.stageNumber, item.classCount);
    }
    this.validateClassCountConstraints(countMap);

    for (const item of data) {
      await this.stageRepository.update(
        { stageNumber: item.stageNumber, isActive: true },
        { classCount: item.classCount },
      );
    }
    return this.findAll();
  }
}
