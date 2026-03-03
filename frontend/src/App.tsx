import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, message, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import {
  HomeOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Breadcrumb } from 'antd';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ClassManage from './pages/ClassManage';
import TeacherManage from './pages/TeacherManage';
import SubjectManage from './pages/SubjectManage';
import StageManage from './pages/StageManage';
import ScheduleManage from './pages/ScheduleManage';
import Statistics from './pages/Statistics';

const { Header, Sider, Content } = Layout;

// 主布局组件
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem('token');
    message.success('已退出登录');
    navigate('/login');
  };

  // 菜单项配置
  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/classes', icon: <TeamOutlined />, label: '班级管理' },
    { key: '/teachers', icon: <UserOutlined />, label: '教师管理' },
    { key: '/subjects', icon: <BookOutlined />, label: '学科管理' },
    { key: '/stages', icon: <SettingOutlined />, label: '阶段配置' },
    { key: '/schedules', icon: <ScheduleOutlined />, label: '排班管理' },
    { key: '/statistics', icon: <BarChartOutlined />, label: '统计分析' },
  ];

  // 面包屑映射
  const breadcrumbMap: Record<string, string> = {
    '/': '首页',
    '/classes': '班级管理',
    '/teachers': '教师管理',
    '/subjects': '学科管理',
    '/stages': '阶段配置',
    '/schedules': '排班管理',
    '/statistics': '统计分析',
  };

  // 获取当前页面名称
  const currentPageName = breadcrumbMap[location.pathname] || '首页';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 16,
          fontWeight: 'bold',
        }}>
          {collapsed ? '排班' : '课后服务排班系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          background: '#fff', 
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          <Breadcrumb
            items={[
              { title: '首页', href: location.pathname === '/' ? undefined : '/' },
              ...(location.pathname !== '/' ? [{ title: currentPageName }] : []),
            ]}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span><UserOutlined style={{ marginRight: 8 }} />管理员</span>
            <Button 
              type="text" 
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
            </Button>
          </div>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: '#fff', borderRadius: 8 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/classes" element={<ClassManage />} />
            <Route path="/teachers" element={<TeacherManage />} />
            <Route path="/subjects" element={<SubjectManage />} />
            <Route path="/stages" element={<StageManage />} />
            <Route path="/schedules" element={<ScheduleManage />} />
            <Route path="/statistics" element={<Statistics />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

// 路由守卫组件
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// 主应用组件
const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
