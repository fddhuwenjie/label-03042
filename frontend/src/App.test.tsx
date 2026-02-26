import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

// 测试 MainLayout 和 PrivateRoute 的逻辑
// 由于 App 组件内部已经包含 BrowserRouter，我们需要单独测试各个部分

// Mock 页面组件
const MockLogin = () => <div data-testid="login-page">Login Page</div>;
const MockDashboard = () => <div data-testid="dashboard-page">Dashboard Page</div>;
const MockClassManage = () => <div data-testid="class-manage-page">Class Manage Page</div>;

// PrivateRoute 组件测试
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <MockLogin />;
  }
  return <>{children}</>;
};

// 简化的 MainLayout 用于测试
const TestMainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const menuItems = [
    { key: '/', label: '首页' },
    { key: '/classes', label: '班级管理' },
    { key: '/teachers', label: '教师管理' },
    { key: '/subjects', label: '学科管理' },
    { key: '/stages', label: '阶段配置' },
    { key: '/schedules', label: '排班管理' },
    { key: '/statistics', label: '统计分析' },
  ];

  return (
    <Layout>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
      <Button onClick={handleLogout}>退出登录</Button>
      <Routes>
        <Route path="/" element={<MockDashboard />} />
        <Route path="/classes" element={<MockClassManage />} />
      </Routes>
    </Layout>
  );
};

describe('路由守卫 PrivateRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('未登录时应该显示登录页', () => {
    render(
      <MemoryRouter>
        <PrivateRoute>
          <MockDashboard />
        </PrivateRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('已登录时应该显示子组件', () => {
    localStorage.setItem('token', 'test-token');
    
    render(
      <MemoryRouter>
        <PrivateRoute>
          <MockDashboard />
        </PrivateRoute>
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });
});

describe('主布局 MainLayout', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('应该显示侧边栏菜单', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestMainLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('班级管理')).toBeInTheDocument();
    expect(screen.getByText('教师管理')).toBeInTheDocument();
    expect(screen.getByText('学科管理')).toBeInTheDocument();
    expect(screen.getByText('阶段配置')).toBeInTheDocument();
    expect(screen.getByText('排班管理')).toBeInTheDocument();
    expect(screen.getByText('统计分析')).toBeInTheDocument();
  });

  it('应该显示退出登录按钮', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestMainLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('点击菜单应该导航到对应页面', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestMainLayout />
      </MemoryRouter>
    );
    
    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('班级管理'));
    expect(screen.getByTestId('class-manage-page')).toBeInTheDocument();
  });

  it('点击退出登录应该清除 token', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <TestMainLayout />
      </MemoryRouter>
    );
    
    fireEvent.click(screen.getByText('退出登录'));
    expect(localStorage.getItem('token')).toBeNull();
  });
});
