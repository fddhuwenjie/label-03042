import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
import { Class } from '../entities/class.entity';
import { Subject } from '../entities/subject.entity';
import { LoggerService } from './logger.service';

// 教师管理服务
@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    private logger: LoggerService,
  ) {}

  // 获取所有教师（支持分页）
  async findAll(page?: number, pageSize?: number) {
    const startTime = Date.now();
    
    try {
      const query = this.teacherRepository.createQueryBuilder('teacher')
        .leftJoinAndSelect('teacher.subject', 'subject')
        .leftJoinAndSelect('teacher.teachingClasses', 'teachingClasses')
        .where('teacher.isActive = :isActive', { isActive: true })
        .orderBy('teacher.id', 'ASC');
      
      // 如果提供了分页参数，返回分页结果
      if (page && pageSize) {
        // 校验分页参数
        const validPage = Math.max(1, Math.floor(page));
        const validPageSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
        
        const [data, total] = await query
          .skip((validPage - 1) * validPageSize)
          .take(validPageSize)
          .getManyAndCount();
        
        this.logger.logPerformance('查询教师列表(分页)', Date.now() - startTime);
        
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
      this.logger.logPerformance('查询教师列表(全部)', Date.now() - startTime);
      return result;
    } catch (error) {
      this.logger.logSystemError('查询教师列表', error as Error);
      throw error;
    }
  }

  // 根据ID获取教师
  async findOne(id: number) {
    // 校验 ID
    if (!id || id <= 0 || !Number.isInteger(id)) {
      throw new BadRequestException('教师ID无效');
    }
    
    const teacher = await this.teacherRepository.findOne({
      where: { id, isActive: true },
      relations: ['subject', 'teachingClasses'],
    });
    
    if (!teacher) {
      this.logger.logBusinessError('查询教师', `教师不存在`, { teacherId: id });
      throw new NotFoundException(`教师(ID: ${id})不存在`);
    }
    
    return teacher;
  }

  // 创建教师
  async create(data: { name: string; subjectId?: number; canStage3?: boolean; teachingClassIds?: number[] }) {
    const startTime = Date.now();
    
    try {
      // 校验教师姓名是否重复
      const existingTeacher = await this.teacherRepository.findOne({
        where: { name: data.name, isActive: true },
      });
      
      if (existingTeacher) {
        throw new BadRequestException(`教师姓名"${data.name}"已存在`);
      }
      
      // 校验学科是否存在
      if (data.subjectId) {
        const subject = await this.subjectRepository.findOne({
          where: { id: data.subjectId, isActive: true },
        });
        if (!subject) {
          throw new BadRequestException(`学科(ID: ${data.subjectId})不存在`);
        }
      }
      
      const teacher = this.teacherRepository.create({
        name: data.name,
        subjectId: data.subjectId,
        canStage3: data.canStage3 || false,
      });
      
      // 设置任教班级
      if (data.teachingClassIds && data.teachingClassIds.length > 0) {
        const classes = await this.classRepository.find({
          where: { id: In(data.teachingClassIds), isActive: true },
        });
        
        // 检查是否所有班级都存在
        if (classes.length !== data.teachingClassIds.length) {
          const foundIds = classes.map(c => c.id);
          const missingIds = data.teachingClassIds.filter(id => !foundIds.includes(id));
          throw new BadRequestException(`班级(ID: ${missingIds.join(', ')})不存在`);
        }
        
        teacher.teachingClasses = classes;
      }
      
      const result = await this.teacherRepository.save(teacher);
      
      this.logger.logOperation('创建教师', undefined, { 
        teacherId: result.id, 
        name: result.name 
      });
      this.logger.logPerformance('创建教师', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.logSystemError('创建教师', error as Error, { data });
      throw error;
    }
  }

  // 更新教师
  async update(id: number, data: { name?: string; subjectId?: number; canStage3?: boolean; teachingClassIds?: number[] }) {
    const startTime = Date.now();
    
    try {
      const teacher = await this.findOne(id);
      
      // 如果更新姓名，检查是否重复
      if (data.name && data.name !== teacher.name) {
        const existingTeacher = await this.teacherRepository.findOne({
          where: { name: data.name, isActive: true },
        });
        if (existingTeacher && existingTeacher.id !== id) {
          throw new BadRequestException(`教师姓名"${data.name}"已存在`);
        }
        teacher.name = data.name;
      }
      
      // 校验学科是否存在
      if (data.subjectId !== undefined) {
        if (data.subjectId) {
          const subject = await this.subjectRepository.findOne({
            where: { id: data.subjectId, isActive: true },
          });
          if (!subject) {
            throw new BadRequestException(`学科(ID: ${data.subjectId})不存在`);
          }
        }
        teacher.subjectId = data.subjectId;
      }
      
      if (data.canStage3 !== undefined) teacher.canStage3 = data.canStage3;
      
      // 更新任教班级
      if (data.teachingClassIds) {
        if (data.teachingClassIds.length > 0) {
          const classes = await this.classRepository.find({
            where: { id: In(data.teachingClassIds), isActive: true },
          });
          
          if (classes.length !== data.teachingClassIds.length) {
            const foundIds = classes.map(c => c.id);
            const missingIds = data.teachingClassIds.filter(cid => !foundIds.includes(cid));
            throw new BadRequestException(`班级(ID: ${missingIds.join(', ')})不存在`);
          }
          
          teacher.teachingClasses = classes;
        } else {
          teacher.teachingClasses = [];
        }
      }
      
      const result = await this.teacherRepository.save(teacher);
      
      this.logger.logOperation('更新教师', undefined, { teacherId: id, updates: data });
      this.logger.logPerformance('更新教师', Date.now() - startTime);
      
      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      this.logger.logSystemError('更新教师', error as Error, { id, data });
      throw error;
    }
  }

  // 删除教师（软删除）
  async remove(id: number) {
    const teacher = await this.findOne(id);
    teacher.isActive = false;
    
    const result = await this.teacherRepository.save(teacher);
    this.logger.logOperation('删除教师', undefined, { teacherId: id, name: teacher.name });
    
    return result;
  }

  // 获取可参与第三阶段的教师
  async findStage3Teachers() {
    return this.teacherRepository.find({
      where: { isActive: true, canStage3: true },
      relations: ['subject', 'teachingClasses'],
    });
  }

  // 批量设置第三阶段教师
  async setStage3Teachers(teacherIds: number[]) {
    const startTime = Date.now();
    
    try {
      // 校验教师ID是否都存在
      if (teacherIds.length > 0) {
        const existingTeachers = await this.teacherRepository.find({
          where: { id: In(teacherIds), isActive: true },
        });
        
        if (existingTeachers.length !== teacherIds.length) {
          const foundIds = existingTeachers.map(t => t.id);
          const missingIds = teacherIds.filter(id => !foundIds.includes(id));
          throw new BadRequestException(`教师(ID: ${missingIds.join(', ')})不存在`);
        }
      }
      
      // 先将所有教师的 canStage3 设为 false
      await this.teacherRepository.update({ isActive: true }, { canStage3: false });
      
      // 设置指定教师的 canStage3 为 true
      if (teacherIds.length > 0) {
        await this.teacherRepository.update(
          { id: In(teacherIds), isActive: true },
          { canStage3: true },
        );
      }
      
      this.logger.logOperation('批量设置第三阶段教师', undefined, { 
        teacherIds, 
        count: teacherIds.length 
      });
      this.logger.logPerformance('批量设置第三阶段教师', Date.now() - startTime);
      
      return this.findAll();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.logSystemError('批量设置第三阶段教师', error as Error, { teacherIds });
      throw error;
    }
  }
}
