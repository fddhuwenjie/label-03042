import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

// 日志级别
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// 日志服务
@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const ctx = context || this.context || 'Application';
    return `[${timestamp}] [${level}] [${ctx}] ${message}`;
  }

  log(message: string, context?: string) {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  info(message: string, context?: string) {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  debug(message: string, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  warn(message: string, context?: string) {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.formatMessage(LogLevel.ERROR, message, context));
    if (trace) {
      console.error(trace);
    }
  }

  // 记录操作日志
  logOperation(operation: string, userId?: number, details?: Record<string, any>) {
    const detailStr = details ? JSON.stringify(details) : '';
    const userStr = userId ? `用户ID:${userId}` : '系统';
    this.info(`[操作] ${operation} | ${userStr} | ${detailStr}`, 'Operation');
  }

  // 记录排班日志
  logScheduling(action: string, weekId: number, details?: Record<string, any>) {
    const detailStr = details ? JSON.stringify(details) : '';
    this.info(`[排班] ${action} | 周ID:${weekId} | ${detailStr}`, 'Scheduling');
  }

  // 记录 API 请求日志
  logRequest(method: string, url: string, body?: any, userId?: number) {
    const bodyStr = body ? JSON.stringify(body).substring(0, 500) : '';
    const userStr = userId ? `用户ID:${userId}` : '匿名';
    this.info(`[请求] ${method} ${url} | ${userStr} | ${bodyStr}`, 'Request');
  }

  // 记录 API 响应日志
  logResponse(method: string, url: string, statusCode: number, duration: number) {
    this.info(`[响应] ${method} ${url} | 状态:${statusCode} | 耗时:${duration}ms`, 'Response');
  }

  // 记录数据库操作日志
  logDatabase(operation: string, entity: string, id?: number | string, details?: Record<string, any>) {
    const idStr = id ? `ID:${id}` : '';
    const detailStr = details ? JSON.stringify(details) : '';
    this.debug(`[数据库] ${operation} ${entity} ${idStr} | ${detailStr}`, 'Database');
  }

  // 记录业务异常日志
  logBusinessError(operation: string, error: string, details?: Record<string, any>) {
    const detailStr = details ? JSON.stringify(details) : '';
    this.warn(`[业务异常] ${operation} | ${error} | ${detailStr}`, 'Business');
  }

  // 记录系统异常日志
  logSystemError(operation: string, error: Error, details?: Record<string, any>) {
    const detailStr = details ? JSON.stringify(details) : '';
    this.error(
      `[系统异常] ${operation} | ${error.message} | ${detailStr}`,
      error.stack,
      'System'
    );
  }

  // 记录性能日志
  logPerformance(operation: string, duration: number, threshold: number = 1000) {
    if (duration > threshold) {
      this.warn(`[性能警告] ${operation} 耗时 ${duration}ms，超过阈值 ${threshold}ms`, 'Performance');
    } else {
      this.debug(`[性能] ${operation} 耗时 ${duration}ms`, 'Performance');
    }
  }

  // 记录安全相关日志
  logSecurity(event: string, userId?: number, ip?: string, details?: Record<string, any>) {
    const detailStr = details ? JSON.stringify(details) : '';
    const userStr = userId ? `用户ID:${userId}` : '匿名';
    this.info(`[安全] ${event} | ${userStr} | IP:${ip || '未知'} | ${detailStr}`, 'Security');
  }
}
