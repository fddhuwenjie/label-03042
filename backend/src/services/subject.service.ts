import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from '../entities/subject.entity';
import { SubjectExcludeDate } from '../entities/subject-exclude-date.entity';

// 学科管理服务
@Injectable()
export class SubjectService implements OnModuleInit {
  constructor(
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(SubjectExcludeDate)
    private excludeDateRepository: Repository<SubjectExcludeDate>,
  ) {}

  // 模块初始化时创建默认学科
  async onModuleInit() {
    const count = await this.subjectRepository.count();
    if (count === 0) {
      const defaultSubjects = [
        { name: '语文', isMain: true },
        { name: '数学', isMain: true },
        { name: '英语', isMain: true },
        { name: '体育', isMain: false },
        { name: '音乐', isMain: false },
        { name: '美术', isMain: false },
        { name: '科学', isMain: false },
        { name: '道德与法治', isMain: false },
      ];
      
      for (const subject of defaultSubjects) {
        await this.subjectRepository.save(this.subjectRepository.create(subject));
      }
      console.log('默认学科已创建');
    }
  }

  // 获取所有学科
  async findAll() {
    return this.subjectRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  // 根据ID获取学科
  async findOne(id: number) {
    const subject = await this.subjectRepository.findOne({
      where: { id, isActive: true },
    });
    
    if (!subject) {
      throw new NotFoundException('学科不存在');
    }
    
    return subject;
  }

  // 创建学科
  async create(data: Partial<Subject>) {
    const existing = await this.subjectRepository.findOne({
      where: { name: data.name, isActive: true },
    });
    
    if (existing) {
      throw new BadRequestException('学科名称已存在');
    }
    
    const subject = this.subjectRepository.create(data);
    return this.subjectRepository.save(subject);
  }

  // 更新学科
  async update(id: number, data: Partial<Subject>) {
    const subject = await this.findOne(id);
    Object.assign(subject, data);
    return this.subjectRepository.save(subject);
  }

  // 删除学科（软删除）
  async remove(id: number) {
    const subject = await this.findOne(id);
    subject.isActive = false;
    return this.subjectRepository.save(subject);
  }

  // 获取学科校验日配置
  async getExcludeDates() {
    return this.excludeDateRepository.find({
      relations: ['subject'],
      order: { id: 'ASC' },
    });
  }

  // 设置学科校验日
  async setExcludeDate(subjectId: number, dayOfWeek: number, remark?: string) {
    // 检查是否已存在
    const existing = await this.excludeDateRepository.findOne({
      where: { subjectId, dayOfWeek },
    });
    
    if (existing) {
      throw new BadRequestException('该学科在该日期的校验日已存在');
    }
    
    const excludeDate = this.excludeDateRepository.create({
      subjectId,
      dayOfWeek,
      remark,
    });
    
    return this.excludeDateRepository.save(excludeDate);
  }

  // 删除学科校验日
  async removeExcludeDate(id: number) {
    const excludeDate = await this.excludeDateRepository.findOne({
      where: { id },
    });
    
    if (!excludeDate) {
      throw new NotFoundException('校验日配置不存在');
    }
    
    return this.excludeDateRepository.remove(excludeDate);
  }

  // 批量设置学科校验日
  async batchSetExcludeDates(data: { subjectId: number; dayOfWeek: number; remark?: string }[]) {
    // 先删除所有现有配置
    await this.excludeDateRepository.clear();
    
    // 创建新配置
    const entities = data.map(item => this.excludeDateRepository.create(item));
    return this.excludeDateRepository.save(entities);
  }
}
