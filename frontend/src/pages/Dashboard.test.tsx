import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import Dashboard from './Dashboard';
import { classApi, teacherApi, subjectApi, scheduleApi, statisticsApi } from '../api';

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
  classApi: { getAll: jest.fn() },
  teacherApi: { getAll: jest.fn() },
  subjectApi: { getAll: jest.fn() },
  scheduleApi: { getAllWeeks: jest.fn() },
  statisticsApi: { getStage2Balance: jest.fn() },
}));

// Mock ECharts
jest.mock('echarts-for-react', () => {
  return function MockECharts() {
    return <div data-testid="echarts-mock">ECharts Mock</div>;
  };
});

describe('Dashboard 组件', () => {
  const mockClasses = [
    { id: 1, name: '一年级1班' },
    { id: 2, name: '一年级2班' },
  ];
  
  const mockTeachers = [
    { id: 1, name: '张老师', canStage3: true },
    { id: 2, name: '李老师', canStage3: false },
  ];
  
  const mockSubjects = [
    { id: 1, name: '语文' },
    { id: 2, name: '数学' },
  ];
  
  const mockWeeks = [
    { id: 1, year: 2024, weekNumber: 1, startDate: '2024-01-01T00:00:00', endDate: '2024-01-05T00:00:00', status: 'confirmed' },
    { id: 2, year: 2024, weekNumber: 2, startDate: '2024-01-08T00:00:00', endDate: '2024-01-12T00:00:00', status: 'draft' },
  ];
  
  const mockBalance = {
    statistics: [
      { teacherName: '张老师', stage2Count: 5 },
      { teacherName: '李老师', stage2Count: 4 },
    ],
    balance: { avgCount: 4.5, maxCount: 5, minCount: 4, variance: 0.5 },
    suggestions: ['排班均衡性良好'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (classApi.getAll as jest.Mock).mockResolvedValue(mockClasses);
    (teacherApi.getAll as jest.Mock).mockResolvedValue(mockTeachers);
    (subjectApi.getAll as jest.Mock).mockResolvedValue(mockSubjects);
    (scheduleApi.getAllWeeks as jest.Mock).mockResolvedValue(mockWeeks);
    (statisticsApi.getStage2Balance as jest.Mock).mockResolvedValue(mockBalance);
  });

  it('应该显示系统概览标题', () => {
    render(<Dashboard />);
    expect(screen.getByText('系统概览')).toBeInTheDocument();
  });

  it('应该调用所有 API 加载数据', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(classApi.getAll).toHaveBeenCalled();
      expect(teacherApi.getAll).toHaveBeenCalled();
      expect(subjectApi.getAll).toHaveBeenCalled();
      expect(scheduleApi.getAllWeeks).toHaveBeenCalled();
      expect(statisticsApi.getStage2Balance).toHaveBeenCalled();
    });
  });
});
