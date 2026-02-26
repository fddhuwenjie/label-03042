import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import Statistics from './Statistics';
import { statisticsApi, scheduleApi } from '../api';

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
  statisticsApi: {
    getWeeklyStatistics: jest.fn(),
    getStage2Balance: jest.fn(),
    exportExcel: jest.fn(),
  },
  scheduleApi: {
    getAllWeeks: jest.fn(),
  },
}));

// Mock ECharts
jest.mock('echarts-for-react', () => {
  return function MockECharts() {
    return <div data-testid="echarts-mock">ECharts Mock</div>;
  };
});

describe('Statistics 组件', () => {
  const mockWeeks = [
    { id: 1, year: 2024, weekNumber: 1 },
    { id: 2, year: 2024, weekNumber: 2 },
  ];
  
  const mockWeeklyStats = {
    summary: {
      totalSchedules: 100,
      teacherCount: 20,
      avgSchedulesPerTeacher: 5,
    },
    statistics: [
      { teacherId: 1, teacherName: '张老师', subjectName: '语文', totalCount: 6, stage2Count: 3 },
      { teacherId: 2, teacherName: '李老师', subjectName: '数学', totalCount: 5, stage2Count: 2 },
    ],
  };
  
  const mockBalanceData = {
    weekCount: 10,
    balance: {
      maxCount: 15,
      minCount: 8,
      avgCount: 12,
      variance: 2,
    },
    statistics: [
      { teacherId: 1, teacherName: '张老师', subjectName: '语文', stage2Count: 15 },
      { teacherId: 2, teacherName: '李老师', subjectName: '数学', stage2Count: 12 },
    ],
    suggestions: ['排班均衡性良好'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (scheduleApi.getAllWeeks as jest.Mock).mockResolvedValue(mockWeeks);
    (statisticsApi.getWeeklyStatistics as jest.Mock).mockResolvedValue(mockWeeklyStats);
    (statisticsApi.getStage2Balance as jest.Mock).mockResolvedValue(mockBalanceData);
  });

  it('应该正确渲染统计分析页面', () => {
    render(<Statistics />);
    
    expect(screen.getByText('统计分析')).toBeInTheDocument();
    expect(screen.getByText('周统计')).toBeInTheDocument();
    expect(screen.getByText('第二阶段均衡性分析')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<Statistics />);
    
    await waitFor(() => {
      expect(scheduleApi.getAllWeeks).toHaveBeenCalled();
      expect(statisticsApi.getStage2Balance).toHaveBeenCalled();
    });
  });

  it('应该有导出 Excel 按钮', () => {
    render(<Statistics />);
    
    expect(screen.getByText('导出 Excel')).toBeInTheDocument();
  });
});
