import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import ScheduleManage from './ScheduleManage';
import { scheduleApi, teacherApi, classApi, stageApi } from '../api';

// Mock antd Grid 组件以避免 responsiveObserver 问题
jest.mock('antd', () => {
  const antd = jest.requireActual('antd');
  return {
    ...antd,
    Row: ({ children, ...props }: any) => <div data-testid="antd-row" {...props}>{children}</div>,
    Col: ({ children, ...props }: any) => <div data-testid="antd-col" {...props}>{children}</div>,
  };
});

// Mock API
jest.mock('../api', () => ({
  scheduleApi: {
    getAllWeeks: jest.fn(),
    getByWeek: jest.fn(),
    createWeek: jest.fn(),
    generateSchedule: jest.fn(),
    confirmWeek: jest.fn(),
    deleteWeek: jest.fn(),
    updateSchedule: jest.fn(),
  },
  teacherApi: {
    getAll: jest.fn(),
  },
  classApi: {
    getAll: jest.fn(),
  },
  stageApi: {
    getAll: jest.fn(),
  },
}));

describe('ScheduleManage 组件', () => {
  const mockWeeks = [
    { id: 1, year: 2024, weekNumber: 1, startDate: '2024-01-01', endDate: '2024-01-05', status: 'draft' },
    { id: 2, year: 2024, weekNumber: 2, startDate: '2024-01-08', endDate: '2024-01-12', status: 'confirmed' },
  ];
  
  const mockTeachers = [
    { id: 1, name: '张老师', subject: { name: '语文' } },
    { id: 2, name: '李老师', subject: { name: '数学' } },
  ];
  
  const mockClasses = [
    { id: 1, name: '一年级1班' },
    { id: 2, name: '一年级2班' },
  ];
  
  const mockStages = [
    { id: 1, stageNumber: 1, name: '第一阶段' },
    { id: 2, stageNumber: 2, name: '第二阶段' },
    { id: 3, stageNumber: 3, name: '第三阶段' },
  ];
  
  const mockSchedules = [
    { id: 1, dayOfWeek: 1, stageId: 1, teacherId: 1, classId: 1, scheduleType: 'headTeacher', teacher: mockTeachers[0], class: mockClasses[0] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (scheduleApi.getAllWeeks as jest.Mock).mockResolvedValue(mockWeeks);
    (scheduleApi.getByWeek as jest.Mock).mockResolvedValue({ week: mockWeeks[0], schedules: mockSchedules, warnings: [] });
    (teacherApi.getAll as jest.Mock).mockResolvedValue(mockTeachers);
    (classApi.getAll as jest.Mock).mockResolvedValue(mockClasses);
    (stageApi.getAll as jest.Mock).mockResolvedValue(mockStages);
  });

  it('应该正确渲染排班管理页面', () => {
    render(<ScheduleManage />);
    
    expect(screen.getByText('排班管理')).toBeInTheDocument();
    expect(screen.getByText('新建排班周')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<ScheduleManage />);
    
    await waitFor(() => {
      expect(scheduleApi.getAllWeeks).toHaveBeenCalled();
    });
  });

  it('应该打开新建排班周弹窗', async () => {
    render(<ScheduleManage />);
    
    const createButton = screen.getByText('新建排班周');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/选择该周内的任意一天/)).toBeInTheDocument();
    });
  });
});
