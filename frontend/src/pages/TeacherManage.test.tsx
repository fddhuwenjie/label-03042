import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import TeacherManage from './TeacherManage';
import { teacherApi, subjectApi, classApi } from '../api';

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
  teacherApi: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setStage3Teachers: jest.fn(),
  },
  subjectApi: {
    getAll: jest.fn(),
  },
  classApi: {
    getAll: jest.fn(),
  },
}));

describe('TeacherManage 组件', () => {
  const mockTeachers = [
    { 
      id: 1, 
      name: '张老师', 
      canStage3: true, 
      subject: { id: 1, name: '语文', isMain: true },
      teachingClasses: [{ id: 1, name: '一年级1班' }]
    },
    { 
      id: 2, 
      name: '李老师', 
      canStage3: false, 
      subject: { id: 2, name: '数学', isMain: true },
      teachingClasses: []
    },
  ];
  
  const mockSubjects = [
    { id: 1, name: '语文', isMain: true },
    { id: 2, name: '数学', isMain: true },
  ];
  
  const mockClasses = [
    { id: 1, name: '一年级1班' },
    { id: 2, name: '一年级2班' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (teacherApi.getAll as jest.Mock).mockResolvedValue(mockTeachers);
    (subjectApi.getAll as jest.Mock).mockResolvedValue(mockSubjects);
    (classApi.getAll as jest.Mock).mockResolvedValue(mockClasses);
  });

  it('应该正确渲染教师管理页面', () => {
    render(<TeacherManage />);
    
    expect(screen.getByText('教师管理')).toBeInTheDocument();
    expect(screen.getByText('添加教师')).toBeInTheDocument();
    expect(screen.getByText('批量设置第三阶段教师')).toBeInTheDocument();
  });

  it('应该调用 API 加载数据', async () => {
    render(<TeacherManage />);
    
    await waitFor(() => {
      expect(teacherApi.getAll).toHaveBeenCalled();
      expect(subjectApi.getAll).toHaveBeenCalled();
      expect(classApi.getAll).toHaveBeenCalled();
    });
  });

  it('应该打开添加教师弹窗', async () => {
    render(<TeacherManage />);
    
    const addButton = screen.getByText('添加教师');
    fireEvent.click(addButton);
    
    await waitFor(() => {
      expect(screen.getByText('教师姓名')).toBeInTheDocument();
    });
  });
});
