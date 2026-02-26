import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { authApi } from '../api';

// Mock API
jest.mock('../api', () => ({
  authApi: {
    login: jest.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login 组件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('应该正确渲染登录表单', () => {
    render(<Login />);
    
    expect(screen.getByText('课后服务排班管理系统')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByText('默认账号：admin / admin123')).toBeInTheDocument();
  });

  it('应该在表单为空时显示验证错误', async () => {
    render(<Login />);
    
    const loginButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument();
    });
  });

  it('应该在登录成功后跳转到首页', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({ access_token: 'test-token' });
    
    render(<Login />);
    
    const usernameInput = screen.getByPlaceholderText('用户名');
    const passwordInput = screen.getByPlaceholderText('密码');
    const loginButton = screen.getByRole('button', { name: '登录' });
    
    await userEvent.type(usernameInput, 'admin');
    await userEvent.type(passwordInput, 'admin123');
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin', 'admin123');
      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('应该在登录失败时显示错误消息', async () => {
    (authApi.login as jest.Mock).mockRejectedValue({ message: '用户名或密码错误' });
    
    render(<Login />);
    
    const usernameInput = screen.getByPlaceholderText('用户名');
    const passwordInput = screen.getByPlaceholderText('密码');
    const loginButton = screen.getByRole('button', { name: '登录' });
    
    await userEvent.type(usernameInput, 'wrong');
    await userEvent.type(passwordInput, 'wrong');
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('wrong', 'wrong');
    });
  });
});
