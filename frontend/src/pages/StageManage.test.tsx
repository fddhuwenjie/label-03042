import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import StageManage from './StageManage';
import { stageApi, classApi } from '../api';

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
  stageApi: {
    getAll: jest.fn(),
    updateClassCounts: jest.fn(),
  },
  classApi: {
    getAll: jest.fn(),
  },
}));

describe('StageManage 组件', () => {
  const mockStages = [
    { id: 1, stageNumber: 1, name: '第一阶段', description: '作业辅导', classCount: 36 },
    { id: 2, stageNumber: 2, name: '第二阶段', description: '兴趣活动', classCount: 36 },
    { id: 3, stageNumber: 3, name: '第三阶段', description: '延时托管', classCount: 18 },
  ];
  
  const mockClasses = Array.from({ length: 36 }, (_, i) => ({ id: i + 1, name: `班级${i + 1}` }));

  beforeEach(() => {
    jest.clearAllMocks();
    (stageApi.getAll as jest.Mock).mockResolvedValue(mockStages);
    (classApi.getAll as jest.Mock).mockResolvedValue(mockClasses);
  });

  it('应该正确渲染阶段配置页面', () => {
    render(<StageManage />);
    
    expect(screen.getByText('课后服务阶段配置')).toBeInTheDocument();
    expect(screen.getByText('配置说明')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<StageManage />);
    
    await waitFor(() => {
      expect(stageApi.getAll).toHaveBeenCalled();
      expect(classApi.getAll).toHaveBeenCalled();
    });
  });

  it('应该有保存配置按钮', () => {
    render(<StageManage />);
    
    expect(screen.getByText('保存配置')).toBeInTheDocument();
  });

  it('应该显示配置说明', () => {
    render(<StageManage />);
    
    expect(screen.getByText(/课后服务分为3个阶段/)).toBeInTheDocument();
  });
});
