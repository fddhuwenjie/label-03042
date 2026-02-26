import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import SubjectManage from './SubjectManage';
import { subjectApi } from '../api';

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
  subjectApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getExcludeDates: jest.fn(),
    setExcludeDate: jest.fn(),
    removeExcludeDate: jest.fn(),
  },
}));

describe('SubjectManage 组件', () => {
  const mockSubjects = [
    { id: 1, name: '语文', isMain: true },
    { id: 2, name: '数学', isMain: true },
    { id: 3, name: '体育', isMain: false },
  ];
  
  const mockExcludeDates = [
    { id: 1, subject: { id: 3, name: '体育' }, dayOfWeek: 3, remark: '周三不排体育' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (subjectApi.getAll as jest.Mock).mockResolvedValue(mockSubjects);
    (subjectApi.getExcludeDates as jest.Mock).mockResolvedValue(mockExcludeDates);
  });

  it('应该正确渲染学科管理页面', () => {
    render(<SubjectManage />);
    
    expect(screen.getByText('学科管理')).toBeInTheDocument();
    expect(screen.getByText('学科列表')).toBeInTheDocument();
    expect(screen.getByText('学科校验日')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<SubjectManage />);
    
    await waitFor(() => {
      expect(subjectApi.getAll).toHaveBeenCalled();
      expect(subjectApi.getExcludeDates).toHaveBeenCalled();
    });
  });

  it('应该打开添加学科弹窗', async () => {
    render(<SubjectManage />);
    
    const addButton = screen.getByText('添加学科');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('学科名称')).toBeInTheDocument();
    });
  });
});
