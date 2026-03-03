import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../entities/class.entity';
import { Teacher } from '../entities/teacher.entity';
import { LoggerService } from './logger.service';

// 班级管理服务
@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    private logger: LoggerService,
  ) {}

  // 获取所有班级（支持分页）
  async findAll(page?: number, pageSize?: number) {
    const startTime = Date.now();
    
    try {
      const query = this.classRepository.createQueryBuilder('class')
        .leftJoinAndSelect('class.headTeacher', 'headTeacher')
        .leftJoinAndSelect('headTeacher.subject', 'subject')
        .where('class.isActive = :isActive', { isActive: true })
        .orderBy('class.id', 'ASC');
      
      // 如果提供了分页参数，返回分页结果
      if (page && pageSize) {
        // 校验分页参数
        const validPage = Math.max(1, Math.floor(page));
        const validPageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
        
        const [data, total] = await query
          .skip((validPage - 1) * validPageSize)
          .take(validPageSize)
          .getManyAndCount();
        
        this.logger.logPerformance('查询班级列表(分页)', Date.now() - startTime);
        
        return {
          data,
          total,
          page: validPage,
          pageSize: validPageSize,
          totalPages: Math.ceil(total / validPageSize),
        };
      }
      
      // 否则返回全部数据
      const result = await query.getMany();
      this.logger.logPerformance('查询班级列表(全部)', Date.now() - startTime);
      return result;
    } catch (error) {
      this.logger.logSystemError('查询班级列表', error as Error);
      throw error;
    }
  }

  // 根据ID获取班级
  async findOne(id: number) {
    // 校验 ID
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('班级ID无效');
    }
    
    const classEntity = await this.classRepository.findOne({
      where: { id, isActive: true },
      relations: ['headTeacher', 'headTeacher.subject'],
    });
    
    if (!classEntity) {
      this.logger.logBusinessError('查询班级', `班级不存在`, { classId: id });
      throw new NotFoundException(`班级(ID: ${id})不存在`);
    }
    
    return classEntity;
  }

  // 创建班级
  async create(data: Partial<Class>) {
    const startTime = Date.now();
    
    try {
      // 校验必填字段
      if (!data.name?.trim()) {
        throw new BadRequestException('班级名称不能为空');
      }
      if (!data.grade?.trim()) {
        throw new BadRequestException('年级不能为空');
      }
      
      // 检查班级名称是否重复
      const existing = await this.classRepository.findOne({
        where: { name: data.name, isActive: true },
      });
      
      if (existing) {
        throw new BadRequestException(`班级名称"${data.name}"已存在`);
      }
      
      // 检查同年级同班号是否重复
      const duplicateNumber = await this.classRepository.findOne({
        where: { grade: data.grade, classNumber: data.classNumber, isActive: true },
      });
      
      if (duplicateNumber) {
        throw new BadRequestException(`${data.grade}${data.classNumber}班已存在`);
      }
      
      const classEntity = this.classRepository.create(data);
      const result = await this.classRepository.save(classEntity);
      
      this.logger.logOperation('创建班级', undefined, { 
        classId: result.id, 
        name: result.name 
      });
      this.logger.logPerformance('创建班级', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.logSystemError('创建班级', error as Error, { data });
      throw error;
    }
  }

  // 批量创建班级
  async batchCreate(grades: string[], classCountPerGrade: number) {
    const startTime = Date.now();
    
    try {
      // 校验参数
      if (!grades || grades.length === 0) {
        throw new BadRequestException('年级列表不能为空');
      }
      
      if (classCountPerGrade <= 0 || classCountPerGrade > 20) {
        throw new BadRequestException('每年级班级数必须在1-20之间');
      }
      
      // 去重并过滤空值
      const uniqueGrades = [...new Set(grades.filter(g => g?.trim()))];
      if (uniqueGrades.length === 0) {
        throw new BadRequestException('年级列表不能全为空');
      }
      
      const classes: Partial<Class>[] = [];
      
      for (const grade of uniqueGrades) {
        for (let i = 1; i <= classCountPerGrade; i++) {
          classes.push({
            name: `${grade}${i}班`,
            grade: grade,
            classNumber: i,
          });
        }
      }
      
      // 先删除现有班级（软删除）
      const deleteResult = await this.classRepository.update({ isActive: true }, { isActive: false });
      
      // 创建新班级
      const entities = this.classRepository.create(classes);
      const result = await this.classRepository.save(entities);
      
      this.logger.logOperation('批量创建班级', undefined, { 
        grades: uniqueGrades, 
        classCountPerGrade,
        totalCreated: result.length,
        deletedCount: deleteResult.affected,
      });
      this.logger.logPerformance('批量创建班级', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.logSystemError('批量创建班级', error as Error, { grades, classCountPerGrade });
      throw error;
    }
  }

  // 更新班级
  async update(id: number, data: Partial<Class>) {
    const startTime = Date.now();
    
    try {
      const classEntity = await this.findOne(id);
      
      // 如果更新名称，检查是否重复
      if (data.name && data.name !== classEntity.name) {
        const existing = await this.classRepository.findOne({
          where: { name: data.name, isActive: true },
        });
        if (existing && existing.id !== id) {
          throw new BadRequestException(`班级名称"${data.name}"已存在`);
        }
      }
      
      // 如果更新年级或班号，检查是否重复
      const newGrade = data.grade || classEntity.grade;
      const newClassNumber = data.classNumber || classEntity.classNumber;
      
      if (data.grade || data.classNumber) {
        const duplicateNumber = await this.classRepository.findOne({
          where: { grade: newGrade, classNumber: newClassNumber, isActive: true },
        });
        if (duplicateNumber && duplicateNumber.id !== id) {
          throw new BadRequestException(`${newGrade}${newClassNumber}班已存在`);
        }
      }
      
      Object.assign(classEntity, data);
      const result = await this.classRepository.save(classEntity);
      
      this.logger.logOperation('更新班级', undefined, { classId: id, updates: data });
      this.logger.logPerformance('更新班级', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logSystemError('更新班级', error as Error, { id, data });
      throw error;
    }
  }

  // 删除班级（软删除）
  async remove(id: number) {
    const classEntity = await this.findOne(id);
    classEntity.isActive = false;
    
    const result = await this.classRepository.save(classEntity);
    this.logger.logOperation('删除班级', undefined, { classId: id, name: classEntity.name });
    
    return result;
  }

  // 设置班主任
  async setHeadTeacher(classId: number, teacherId: number) {
    const startTime = Date.now();
    
    try {
      const classEntity = await this.findOne(classId);
      
      // 校验教师是否存在
      if (teacherId) {
        const teacher = await this.teacherRepository.findOne({
          where: { id: teacherId, isActive: true },
        });
        
        if (!teacher) {
          throw new BadRequestException(`教师(ID: ${teacherId})不存在`);
        }
        
        // 检查该教师是否已经是其他班级的班主任
        const existingClass = await this.classRepository.findOne({
          where: { headTeacherId: teacherId, isActive: true },
        });
        
        if (existingClass && existingClass.id !== classId) {
          this.logger.warn(`教师(ID: ${teacherId})已是${existingClass.name}的班主任，将被重新分配`);
        }
      }
      
      classEntity.headTeacherId = teacherId;
      const result = await this.classRepository.save(classEntity);
      
      this.logger.logOperation('设置班主任', undefined, { 
        classId, 
        className: classEntity.name,
        teacherId 
      });
      this.logger.logPerformance('设置班主任', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logSystemError('设置班主任', error as Error, { classId, teacherId });
      throw error;
    }
  }
}
