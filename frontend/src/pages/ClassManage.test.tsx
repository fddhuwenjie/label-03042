import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import ClassManage from './ClassManage';
import { classApi, teacherApi } from '../api';

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
  classApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    batchCreate: jest.fn(),
    setHeadTeacher: jest.fn(),
  },
  teacherApi: {
    getAll: jest.fn(),
  },
}));

describe('ClassManage 组件', () => {
  const mockClasses = [
    { id: 1, name: '一年级1班', grade: '一年级', classNumber: 1, headTeacherId: 1 },
    { id: 2, name: '一年级2班', grade: '一年级', classNumber: 2, headTeacherId: null },
  ];
  
  const mockTeachers = [
    { id: 1, name: '张老师' },
    { id: 2, name: '李老师' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (classApi.getAll as jest.Mock).mockResolvedValue(mockClasses);
    (teacherApi.getAll as jest.Mock).mockResolvedValue(mockTeachers);
  });

  it('应该正确渲染班级管理页面', () => {
    render(<ClassManage />);
    
    expect(screen.getByText('班级管理')).toBeInTheDocument();
    expect(screen.getByText('批量创建')).toBeInTheDocument();
    expect(screen.getByText('添加班级')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<ClassManage />);
    
    await waitFor(() => {
      expect(classApi.getAll).toHaveBeenCalled();
      expect(teacherApi.getAll).toHaveBeenCalled();
    });
  });

  it('应该打开添加班级弹窗', async () => {
    render(<ClassManage />);
    
    const addButton = screen.getByText('添加班级');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('班级名称')).toBeInTheDocument();
    });
  });

  it('应该打开批量创建弹窗', async () => {
    render(<ClassManage />);
    
    const batchButton = screen.getByText('批量创建');
    fireEvent.click(batchButton);
    
    await waitFor(() => {
      expect(screen.getByText('批量创建班级')).toBeInTheDocument();
    });
  });
});
