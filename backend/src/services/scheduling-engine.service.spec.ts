import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulingEngine } from './scheduling-engine.service';
import { LoggerService } from './logger.service';
import { Teacher } from '../entities/teacher.entity';
import { Class } from '../entities/class.entity';
import { Stage } from '../entities/stage.entity';
import { SubjectExcludeDate } from '../entities/subject-exclude-date.entity';

describe('SchedulingEngine', () => {
  let engine: SchedulingEngine;

  // 模拟数据
  const mockTeachers: Partial<Teacher>[] = [
    { id: 1, name: '张老师', subjectId: 1, subject: { id: 1, name: '语文', isMain: true } as any, teachingClasses: [{ id: 1 }] as any, canStage3: true, isActive: true },
    { id: 2, name: '李老师', subjectId: 2, subject: { id: 2, name: '数学', isMain: true } as any, teachingClasses: [{ id: 2 }] as any, canStage3: true, isActive: true },
    { id: 3, name: '王老师', subjectId: 3, subject: { id: 3, name: '体育', isMain: false } as any, teachingClasses: [], canStage3: false, isActive: true },
    { id: 4, name: '赵老师', subjectId: 4, subject: { id: 4, name: '音乐', isMain: false } as any, teachingClasses: [], canStage3: true, isActive: true },
  ];

  const mockClasses: Partial<Class>[] = [
    { id: 1, name: '一年级1班', headTeacherId: 1, isActive: true },
    { id: 2, name: '一年级2班', headTeacherId: 2, isActive: true },
    { id: 3, name: '一年级3班', headTeacherId: null, isActive: true },
  ];

  const mockStages: Partial<Stage>[] = [
    { id: 1, name: '第一阶段', stageNumber: 1, classCount: 3, isActive: true },
    { id: 2, name: '第二阶段', stageNumber: 2, classCount: 3, isActive: true },
    { id: 3, name: '第三阶段', stageNumber: 3, classCount: 2, isActive: true },
  ];

  const mockExcludeDates: Partial<SubjectExcludeDate>[] = [
    { id: 1, subjectId: 3, dayOfWeek: 1 }, // 体育周一不排班
  ];

  // 模拟 Repository
  const mockTeacherRepo = {
    find: jest.fn().mockResolvedValue(mockTeachers),
  };

  const mockClassRepo = {
    find: jest.fn().mockResolvedValue(mockClasses),
  };

  const mockStageRepo = {
    find: jest.fn().mockResolvedValue(mockStages),
  };

  const mockExcludeDateRepo = {
    find: jest.fn().mockResolvedValue(mockExcludeDates),
  };

  const mockLogger = {
    logScheduling: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingEngine,
        { provide: getRepositoryToken(Teacher), useValue: mockTeacherRepo },
        { provide: getRepositoryToken(Class), useValue: mockClassRepo },
        { provide: getRepositoryToken(Stage), useValue: mockStageRepo },
        { provide: getRepositoryToken(SubjectExcludeDate), useValue: mockExcludeDateRepo },
        { provide: LoggerService, useValue: mockLogger },
      ],
    }).compile();

    engine = module.get<SchedulingEngine>(SchedulingEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWeekSchedule', () => {
    it('应该生成一周的排班', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('班主任每周优先安排1次到自己班级', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      // 整周班主任1以 headTeacher 类型安排到班级1 应该只有1次
      const headTeacher1ToClass1Total = result.items.filter(
        s => s.teacherId === 1 && s.classId === 1 && s.scheduleType === 'headTeacher'
      );
      expect(headTeacher1ToClass1Total.length).toBe(1);
      
      // 班主任2以 headTeacher 类型安排到班级2 也应该只有1次
      const headTeacher2ToClass2Total = result.items.filter(
        s => s.teacherId === 2 && s.classId === 2 && s.scheduleType === 'headTeacher'
      );
      expect(headTeacher2ToClass2Total.length).toBe(1);
    });

    it('主科教师每周优先安排1次到任教班级', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      // 整周每个主科教师以 mainSubject 类型安排应该最多1次
      const mainSubjectAssignments = result.items.filter(
        s => s.scheduleType === 'mainSubject'
      );
      
      const teacherCounts = new Map<number, number>();
      mainSubjectAssignments.forEach(s => {
        teacherCounts.set(s.teacherId, (teacherCounts.get(s.teacherId) || 0) + 1);
      });
      
      teacherCounts.forEach((count) => {
        expect(count).toBe(1);
      });
    });

    it('学科校验日应过滤对应教师', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      // 体育老师（id=3）周一不应该被安排
      const peTeacherMonday = result.items.filter(
        s => s.teacherId === 3 && s.dayOfWeek === 1
      );
      
      expect(peTeacherMonday.length).toBe(0);
    });

    it('第三阶段只安排指定教师', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      // 第三阶段的排班
      const stage3Schedules = result.items.filter(s => s.stageId === 3);
      
      // 所有第三阶段的教师都应该是 canStage3=true 的
      stage3Schedules.forEach(s => {
        const teacher = mockTeachers.find(t => t.id === s.teacherId);
        expect(teacher?.canStage3).toBe(true);
      });
    });

    it('第三阶段教师必须当天连续安排', async () => {
      const result = await engine.generateWeekSchedule(1);
      
      // 检查每个第三阶段的排班
      const stage3Schedules = result.items.filter(s => s.stageId === 3);
      
      stage3Schedules.forEach(s3 => {
        const teacherId = s3.teacherId;
        const dayOfWeek = s3.dayOfWeek;
        
        // 该教师当天应该有阶段1和阶段2的排班
        const stage1 = result.items.find(
          s => s.teacherId === teacherId && s.dayOfWeek === dayOfWeek && s.stageId === 1
        );
        const stage2 = result.items.find(
          s => s.teacherId === teacherId && s.dayOfWeek === dayOfWeek && s.stageId === 2
        );
        
        expect(stage1).toBeDefined();
        expect(stage2).toBeDefined();
      });
    });

    it('应该返回警告信息当资源不足时', async () => {
      // 修改 mock 数据使教师不足
      mockTeacherRepo.find.mockResolvedValueOnce([]);
      
      const result = await engine.generateWeekSchedule(1);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.type === 'teacher_shortage')).toBe(true);
    });
  });
});
