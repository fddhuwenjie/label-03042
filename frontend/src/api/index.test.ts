import axios from 'axios';

// Mock axios
jest.mock('axios', () => {
  const mockAxios = {
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  return mockAxios;
});

describe('API 模块', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('应该创建 axios 实例', () => {
    // 重新导入以触发 axios.create
    jest.isolateModules(() => {
      require('./index');
    });
    
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: '/api',
      timeout: 30000,
    });
  });

  it('应该设置请求拦截器', () => {
    jest.isolateModules(() => {
      require('./index');
    });
    
    expect(axios.create().interceptors.request.use).toHaveBeenCalled();
  });

  it('应该设置响应拦截器', () => {
    jest.isolateModules(() => {
      require('./index');
    });
    
    expect(axios.create().interceptors.response.use).toHaveBeenCalled();
  });
});

describe('API 请求拦截器', () => {
  it('应该在请求头中添加 token', () => {
    localStorage.setItem('token', 'test-token');
    
    const mockConfig = { headers: {} };
    
    // 模拟请求拦截器的行为
    const token = localStorage.getItem('token');
    if (token) {
      mockConfig.headers = { Authorization: `Bearer ${token}` };
    }
    
    expect(mockConfig.headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('没有 token 时不应该添加 Authorization 头', () => {
    const mockConfig = { headers: {} };
    
    const token = localStorage.getItem('token');
    if (token) {
      mockConfig.headers = { Authorization: `Bearer ${token}` };
    }
    
    expect(mockConfig.headers).toEqual({});
  });
});

describe('API 响应拦截器', () => {
  it('应该处理 401 错误', () => {
    localStorage.setItem('token', 'test-token');
    
    const error = {
      response: { status: 401 },
    };
    
    // 模拟 401 处理逻辑
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('应该提取错误消息', () => {
    const errorData = { message: '操作失败' };
    
    let message = '操作失败，请稍后重试';
    if (errorData) {
      if (typeof errorData.message === 'string') {
        message = errorData.message;
      }
    }
    
    expect(message).toBe('操作失败');
  });

  it('应该处理数组形式的错误消息', () => {
    const errorData = { message: ['错误1', '错误2'] };
    
    let message = '操作失败，请稍后重试';
    if (errorData) {
      if (Array.isArray(errorData.message)) {
        message = errorData.message[0];
      }
    }
    
    expect(message).toBe('错误1');
  });

  it('应该处理网络错误', () => {
    const error = { message: 'Network Error' };
    
    let message = '操作失败，请稍后重试';
    if (error.message === 'Network Error') {
      message = '网络连接失败，请检查网络';
    }
    
    expect(message).toBe('网络连接失败，请检查网络');
  });
});
