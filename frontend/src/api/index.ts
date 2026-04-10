import axios from 'axios';
import { message } from 'antd';

/**
 * 前端 API 模块
 * 
 * 封装所有与后端的 HTTP 通信，提供统一的接口调用方式
 * 
 * ## 响应格式
 * 成功响应: { code: 0, data: any, message: string }
 * 错误响应: { code: number, data: null, message: string }
 * 
 * ## 功能特性
 * - 自动添加 JWT Token 到请求头
 * - 统一的错误处理和消息提取
 * - 401 状态自动跳转登录页
 * - 30 秒请求超时设置
 * 
 * @module api
 */

/**
 * 错误码定义（与后端保持一致）
 */
export const ErrorCodes = {
  SUCCESS: 0,
  UNKNOWN_ERROR: 1000,
  VALIDATION_ERROR: 1001,
  UNAUTHORIZED: 2001,
  TOKEN_EXPIRED: 2002,
  FORBIDDEN: 2003,
  NOT_FOUND: 3001,
  ALREADY_EXISTS: 3002,
  CONFLICT: 3003,
};

/**
 * API 响应接口
 */
export interface ApiResponse<T = any> {
  code: number;
  data: T;
  message: string;
}

/**
 * Axios 实例
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

/**
 * 请求拦截器
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 响应拦截器
 * 处理统一响应格式 { code, data, message }
 */
api.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResponse;
    
    // code 为 0 表示成功，返回 data
    if (res.code === 0 || res.code === undefined) {
      return res.data !== undefined ? res.data : res;
    }
    
    // code 不为 0 表示业务错误
    message.error(res.message || '操作失败');
    return Promise.reject(res);
  },
  (error) => {
    // 处理 HTTP 错误
    const res = error.response?.data as ApiResponse;
    
    // 处理 401 未授权错误
    if (error.response?.status === 401 || res?.code === ErrorCodes.UNAUTHORIZED) {
      localStorage.removeItem('token');
      message.error('登录已过期，请重新登录');
      window.location.href = '/login';
      return Promise.reject({ code: ErrorCodes.UNAUTHORIZED, message: '登录已过期' });
    }
    
    // 提取错误消息
    let errorMessage = '操作失败，请稍后重试';
    
    if (res?.message) {
      errorMessage = res.message;
    } else if (error.message === 'Network Error') {
      errorMessage = '网络连接失败，请检查网络';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // 显示错误提示
    message.error(errorMessage);
    
    return Promise.reject({
      code: res?.code || ErrorCodes.UNKNOWN_ERROR,
      message: errorMessage,
      data: null,
    });
  }
);

/**
 * 认证相关 API
 * 
 * 处理用户登录和身份验证
 */
export const authApi = {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{access_token: string}>} JWT Token
   */
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  
  /**
   * 获取当前用户信息
   * @returns {Promise<User>} 用户信息
   */
  getProfile: () => api.get('/auth/profile'),
};

/**
 * 班级管理 API
 * 
 * 处理班级的增删改查和班主任设置
 */
export const classApi = {
  /** 获取所有班级列表 */
  getAll: () => api.get('/classes'),
  
  /** 获取单个班级详情 */
  getOne: (id: number) => api.get(`/classes/${id}`),
  
  /** 创建单个班级 */
  create: (data: any) => api.post('/classes', data),
  
  /**
   * 批量创建班级
   * @param {string[]} grades - 年级列表，如 ['一年级', '二年级']
   * @param {number} classCountPerGrade - 每个年级的班级数
   */
  batchCreate: (grades: string[], classCountPerGrade: number) =>
    api.post('/classes/batch', { grades, classCountPerGrade }),
  
  /** 更新班级信息 */
  update: (id: number, data: any) => api.put(`/classes/${id}`, data),
  
  /** 删除班级 */
  delete: (id: number) => api.delete(`/classes/${id}`),
  
  /**
   * 设置班主任（teacherId 传 null 表示清空班主任）
   * @param {number} classId - 班级 ID
   * @param {number | null} teacherId - 教师 ID，null 表示清空
   */
  setHeadTeacher: (classId: number, teacherId: number | null) =>
    api.put(`/classes/${classId}/head-teacher`, { teacherId }),
};

/**
 * 教师管理 API
 * 
 * 处理教师的增删改查和第三阶段教师配置
 */
export const teacherApi = {
  /** 获取所有教师列表 */
  getAll: () => api.get('/teachers'),
  
  /** 获取单个教师详情 */
  getOne: (id: number) => api.get(`/teachers/${id}`),
  
  /** 创建教师 */
  create: (data: any) => api.post('/teachers', data),
  
  /** 更新教师信息 */
  update: (id: number, data: any) => api.put(`/teachers/${id}`, data),
  
  /** 删除教师 */
  delete: (id: number) => api.delete(`/teachers/${id}`),
  
  /** 获取可参与第三阶段的教师列表 */
  getStage3Teachers: () => api.get('/teachers/stage3/list'),
  
  /**
   * 批量设置第三阶段教师
   * @param {number[]} teacherIds - 教师 ID 列表
   */
  setStage3Teachers: (teacherIds: number[]) =>
    api.post('/teachers/stage3/batch', { teacherIds }),
};

/**
 * 学科管理 API
 * 
 * 处理学科的增删改查和学科排除日期配置
 */
export const subjectApi = {
  /** 获取所有学科列表 */
  getAll: () => api.get('/subjects'),
  
  /** 获取单个学科详情 */
  getOne: (id: number) => api.get(`/subjects/${id}`),
  
  /** 创建学科 */
  create: (data: any) => api.post('/subjects', data),
  
  /** 更新学科信息 */
  update: (id: number, data: any) => api.put(`/subjects/${id}`, data),
  
  /** 删除学科 */
  delete: (id: number) => api.delete(`/subjects/${id}`),
  
  /** 获取学科排除日期列表 */
  getExcludeDates: () => api.get('/subjects/exclude-dates/list'),
  
  /** 设置学科排除日期 */
  setExcludeDate: (data: any) => api.post('/subjects/exclude-dates', data),
  
  /** 移除学科排除日期 */
  removeExcludeDate: (id: number) => api.delete(`/subjects/exclude-dates/${id}`),
  
  /**
   * 批量设置学科排除日期
   * @param {Array<{subjectId: number, dayOfWeek: number}>} data - 排除日期配置
   */
  batchSetExcludeDates: (data: any[]) =>
    api.post('/subjects/exclude-dates/batch', { data }),
};

/**
 * 阶段配置 API
 * 
 * 处理课后服务阶段的查询和配置
 */
export const stageApi = {
  /** 获取所有阶段配置 */
  getAll: () => api.get('/stages'),
  
  /** 获取单个阶段详情 */
  getOne: (id: number) => api.get(`/stages/${id}`),
  
  /** 更新阶段配置 */
  update: (id: number, data: any) => api.put(`/stages/${id}`, data),
  
  /**
   * 批量更新阶段班级数量
   * @param {Array<{stageNumber: number, classCount: number}>} data - 阶段配置
   */
  updateClassCounts: (data: { stageNumber: number; classCount: number }[]) =>
    api.put('/stages/class-counts/batch', { data }),
};

/**
 * 排班管理 API
 * 
 * 处理排班周的创建、排班生成、调整和确认
 */
export const scheduleApi = {
  /** 获取所有排班周列表 */
  getAllWeeks: () => api.get('/schedules/weeks'),
  
  /** 获取当前周信息（年份、周数、起止日期） */
  getCurrentWeekInfo: () => api.get('/schedules/current-week'),
  
  /** 获取指定周的排班详情 */
  getByWeek: (weekId: number) => api.get(`/schedules/weeks/${weekId}`),
  
  /** 创建新的排班周 */
  createWeek: (data: any) => api.post('/schedules/weeks', data),
  
  /**
   * 生成指定周的排班
   * 调用智能排班引擎自动生成排班
   */
  generateSchedule: (weekId: number) =>
    api.post(`/schedules/weeks/${weekId}/generate`),
  
  /** 更新单个排班记录（手动调整） */
  updateSchedule: (id: number, data: any) => api.put(`/schedules/${id}`, data),
  
  /** 确认排班周（确认后不可修改） */
  confirmWeek: (weekId: number) =>
    api.post(`/schedules/weeks/${weekId}/confirm`),
  
  /** 删除排班周 */
  deleteWeek: (weekId: number) => api.delete(`/schedules/weeks/${weekId}`),

  /**
   * 导出排课方案为 Excel 文件
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<Blob>} Excel 文件 Blob
   */
  exportSchedule: (weekId: number) =>
    api.get(`/schedules/weeks/${weekId}/export`, { responseType: 'blob' }),
};

/**
 * 统计分析 API
 * 
 * 处理排班统计、均衡性分析和数据导出
 */
export const statisticsApi = {
  /**
   * 获取指定周的教师排班统计
   * @param {number} weekId - 排班周 ID
   */
  getWeeklyStatistics: (weekId: number) =>
    api.get(`/statistics/weekly/${weekId}`),
  
  /** 获取第二阶段均衡性分析 */
  getStage2Balance: () => api.get('/statistics/stage2-balance'),
  
  /**
   * 获取历史排班记录（分页）
   * @param {number} page - 页码
   * @param {number} pageSize - 每页数量
   */
  getHistory: (page: number, pageSize: number) =>
    api.get('/statistics/history', { params: { page, pageSize } }),
  
  /**
   * 导出统计数据
   * @param {number} weekId - 排班周 ID
   * @param {string} format - 导出格式：xlsx 或 csv
   * @returns {Promise<Blob>} 文件 Blob
   */
  exportData: (weekId: number, format: 'xlsx' | 'csv' = 'xlsx') =>
    api.get(`/statistics/export/${weekId}`, { 
      params: { format },
      responseType: 'blob' 
    }),

  /**
   * 导出统计数据为 Excel 文件（兼容旧接口）
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<Blob>} Excel 文件 Blob
   */
  exportExcel: (weekId: number) =>
    api.get(`/statistics/export/${weekId}`, { responseType: 'blob' }),

  /**
   * 获取多维度统计分析
   * @param {number} weekId - 排班周 ID
   */
  getMultiDimensionStats: (weekId: number) =>
    api.get(`/statistics/multi-dimension/${weekId}`),

  /**
   * 获取教师工作量趋势
   * @param {number} teacherId - 教师 ID
   * @param {number} weekCount - 统计周数
   */
  getWorkloadTrend: (teacherId: number, weekCount: number = 4) =>
    api.get(`/statistics/workload-trend/${teacherId}`, { params: { weekCount } }),

  /**
   * 导出统计数据 Excel（新版接口）
   * 导出包含两个工作表的 Excel 文件
   * @param {number} weekId - 排班周 ID
   * @returns {Promise<Blob>} Excel 文件 Blob
   */
  exportStatisticsExcel: (weekId: number) =>
    api.get(`/statistics/weeks/${weekId}/export`, { responseType: 'blob' }),
};

export default api;
