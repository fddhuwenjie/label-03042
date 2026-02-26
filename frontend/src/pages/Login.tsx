import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, ScheduleOutlined } from '@ant-design/icons';
import { authApi } from '../api';

const { Title, Text } = Typography;

// 登录页面
const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // 处理登录
  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await authApi.login(values.username, values.password);
      localStorage.setItem('token', res.access_token);
      message.success('登录成功');
      navigate('/');
    } catch (error: any) {
      // 错误已在拦截器中处理并显示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: '#f0f2f5',
    }}>
      {/* 左侧装饰区域 */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #001529 0%, #003a70 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 装饰圆圈 */}
        <div style={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          top: -100,
          left: -100,
        }} />
        <div style={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          bottom: -50,
          right: -50,
        }} />
        
        <ScheduleOutlined style={{ fontSize: 80, color: '#1890ff', marginBottom: 24 }} />
        <Title level={2} style={{ color: '#fff', marginBottom: 16, textAlign: 'center' }}>
          课后服务排班管理系统
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, textAlign: 'center', maxWidth: 400 }}>
          智能排班 · 均衡分配 · 高效管理
        </Text>
        
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>3</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>阶段管理</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>5</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>工作日排班</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>∞</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>灵活配置</div>
          </div>
        </div>
      </div>

      {/* 右侧登录区域 */}
      <div style={{
        width: 480,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 48,
        background: '#fff',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 40, textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: 8 }}>欢迎登录</Title>
            <Text type="secondary">请输入您的账号和密码</Text>
          </div>

          <Form
            name="login"
            onFinish={handleLogin}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input 
                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="用户名"
                style={{ height: 48, borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password 
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                placeholder="密码"
                style={{ height: 48, borderRadius: 8 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block
                style={{ 
                  height: 48, 
                  borderRadius: 8,
                  fontSize: 16,
                  background: '#001529',
                }}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>
        </div>

        <div style={{ 
          position: 'absolute', 
          bottom: 24, 
          color: '#bfbfbf',
          fontSize: 12,
        }}>
          © 2024 课后服务排班管理系统
        </div>
      </div>
    </div>
  );
};

export default Login;
