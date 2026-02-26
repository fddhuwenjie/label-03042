import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateClassDto, BatchCreateClassDto, SetHeadTeacherDto } from './class.dto';

describe('Class DTOs', () => {
  describe('CreateClassDto', () => {
    it('应该通过有效数据验证', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: '一年级1班',
        grade: '一年级',
        classNumber: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('缺少必填字段时应验证失败', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: '一年级1班',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('班级序号小于1时应验证失败', async () => {
      const dto = plainToInstance(CreateClassDto, {
        name: '一年级1班',
        grade: '一年级',
        classNumber: 0,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('BatchCreateClassDto', () => {
    it('应该通过有效数据验证', async () => {
      const dto = plainToInstance(BatchCreateClassDto, {
        grades: ['一年级', '二年级'],
        classCountPerGrade: 6,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('班级数超过20时应验证失败', async () => {
      const dto = plainToInstance(BatchCreateClassDto, {
        grades: ['一年级'],
        classCountPerGrade: 25,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SetHeadTeacherDto', () => {
    it('应该通过有效数据验证', async () => {
      const dto = plainToInstance(SetHeadTeacherDto, {
        teacherId: 1,
      });

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
