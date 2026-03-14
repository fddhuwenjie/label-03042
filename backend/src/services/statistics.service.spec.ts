import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatisticsService } from './statistics.service';
import { Schedule } from '../entities/schedule.entity';
import { ScheduleWeek } from '../entities/schedule-week.entity';
import { Teacher } from '../entities/teacher.entity';
import { Stage } from '../entities/stage.entity';

describe('StatisticsService', () => {
  let service: StatisticsService;

  const mockTeachers = [
    { id: 1, name: '张老师', subject: { name: '语文' }, isActive: true },
    { id: 2, name: '李老师', subject: { name: '数学' }, isActive: true },
  ];

  const mockStage2 = { id: 2, stageNumber: 2, isActive: true };

  const mockSchedules = [
    { id: 1, weekId: 1, teacherId: 1, stageId: 1, teacher: mockTeachers[0], stage: { stageNumber: 1 } },
    { id: 2, weekId: 1, teacherId: 1, stageId: 2, teacher: mockTeachers[0], stage: { stageNumber: 2 } },
    { id: 3, weekId: 1, teacherId: 2, stageId: 1, teacher: mockTeachers[1], stage: { stageNumber: 1 } },
    { id: 4, weekId: 1, teacherId: 2, stageId: 2, teacher: mockTeachers[1], stage: { stageNumber: 2 } },
    { id: 5, weekId: 1, teacherId: 2, stageId: 2, teacher: mockTeachers[1], stage: { stageNumber: 2 } },
  ];

  const mockWeeks = [
    { id: 1, year: 2024, weekNumber: 1, status: 'confirmed' },
  ];

  const mockScheduleRepo = {
    find: jest.fn().mockResolvedValue(mockSchedules),
  };

  const mockWeekRepo = {
    findOne: jest.fn().mockResolvedValue(mockWeeks[0]),
    find: jest.fn().mockResolvedValue(mockWeeks),
    findAndCount: jest.fn().mockResolvedValue([mockWeeks, 1]),
  };

  const mockTeacherRepo = {
    find: jest.fn().mockResolvedValue(mockTeachers),
  };

  const mockStages = [
    { id: 1, stageNumber: 1, name: '第一阶段', isActive: true },
    { id: 2, stageNumber: 2, name: '第二阶段', isActive: true },
    { id: 3, stageNumber: 3, name: '第三阶段', isActive: true },
  ];

  const mockStageRepo = {
    findOne: jest.fn().mockResolvedValue(mockStage2),
    find: jest.fn().mockResolvedValue(mockStages),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        { provide: getRepositoryToken(Schedule), useValue: mockScheduleRepo },
        { provide: getRepositoryToken(ScheduleWeek), useValue: mockWeekRepo },
        { provide: getRepositoryToken(Teacher), useValue: mockTeacherRepo },
        { provide: getRepositoryToken(Stage), useValue: mockStageRepo },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeeklyStatistics', () => {
    it('应该返回周统计数据', async () => {
      const result = await service.getWeeklyStatistics(1);

      expect(result).toHaveProperty('weekId', 1);
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.statistics)).toBe(true);
    });

    it('应该正确统计每个教师的排班次数', async () => {
      const result = await service.getWeeklyStatistics(1);

      const teacher1Stats = result.statistics.find((s: any) => s.teacherId === 1);
      const teacher2Stats = result.statistics.find((s: any) => s.teacherId === 2);

      expect(teacher1Stats.totalCount).toBe(2);
      expect(teacher2Stats.totalCount).toBe(3);
    });

    it('应该正确统计第二阶段次数', async () => {
      const result = await service.getWeeklyStatistics(1);

      const teacher1Stats = result.statistics.find((s: any) => s.teacherId === 1);
      const teacher2Stats = result.statistics.find((s: any) => s.teacherId === 2);

      expect(teacher1Stats.stage2Count).toBe(1);
      expect(teacher2Stats.stage2Count).toBe(2);
    });
  });

  describe('getStage2BalanceAnalysis', () => {
    it('应该返回均衡性分析数据', async () => {
      const result = await service.getStage2BalanceAnalysis();

      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('suggestions');
      // 新增：全阶段分析
      expect(result).toHaveProperty('stageAnalyses');
      expect(result).toHaveProperty('overallStatistics');
      expect(result).toHaveProperty('overallBalance');
    });

    it('应该计算正确的均衡性指标', async () => {
      const result = await service.getStage2BalanceAnalysis();

      expect(result.balance).toHaveProperty('maxCount');
      expect(result.balance).toHaveProperty('minCount');
      expect(result.balance).toHaveProperty('avgCount');
      expect(result.balance).toHaveProperty('variance');

      // 全阶段均衡性指标
      expect(result.overallBalance).toHaveProperty('maxCount');
      expect(result.overallBalance).toHaveProperty('minCount');
      expect(result.overallBalance).toHaveProperty('avgCount');
      expect(result.overallBalance).toHaveProperty('variance');

      // 每个阶段都有独立分析
      expect((result as any).stageAnalyses.length).toBe(3);
    });
  });

  describe('getHistoryRecords', () => {
    it('应该返回分页的历史记录', async () => {
      const result = await service.getHistoryRecords(1, 10);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('pageSize', 10);
      expect(result).toHaveProperty('totalPages');
    });
  });
});
