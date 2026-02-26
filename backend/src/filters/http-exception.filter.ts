import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * 错误码定义
 */
export const ErrorCodes = {
  // 通用错误 1xxx
  SUCCESS: 0,
  UNKNOWN_ERROR: 1000,
  VALIDATION_ERROR: 1001,
  
  // 认证错误 2xxx
  UNAUTHORIZED: 2001,
  TOKEN_EXPIRED: 2002,
  FORBIDDEN: 2003,
  
  // 资源错误 3xxx
  NOT_FOUND: 3001,
  ALREADY_EXISTS: 3002,
  CONFLICT: 3003,
  
  // 数据库错误 4xxx
  DATABASE_ERROR: 4001,
  DUPLICATE_ENTRY: 4002,
  FOREIGN_KEY_VIOLATION: 4003,
  
  // 业务错误 5xxx
  BUSINESS_ERROR: 5001,
  OPERATION_NOT_ALLOWED: 5002,
};

/**
 * 业务异常基类
 */
export class BusinessException extends HttpException {
  constructor(
    message: string, 
    public readonly code: number = ErrorCodes.BUSINESS_ERROR,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super({ message, code, isBusinessError: true }, statusCode);
  }
}

/**
 * 数据验证异常
 */
export class ValidationException extends BusinessException {
  constructor(message: string, public readonly errors?: string[]) {
    super(message, ErrorCodes.VALIDATION_ERROR, HttpStatus.BAD_REQUEST);
  }
}

/**
 * 资源不存在异常
 */
export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id?: number | string) {
    const message = id ? `${resource}(ID: ${id})不存在` : `${resource}不存在`;
    super(message, ErrorCodes.NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}

/**
 * 数据冲突异常
 */
export class DataConflictException extends BusinessException {
  constructor(message: string) {
    super(message, ErrorCodes.CONFLICT, HttpStatus.CONFLICT);
  }
}

/**
 * 操作不允许异常
 */
export class OperationNotAllowedException extends BusinessException {
  constructor(message: string) {
    super(message, ErrorCodes.OPERATION_NOT_ALLOWED, HttpStatus.FORBIDDEN);
  }
}

/**
 * HTTP 异常过滤器
 * 统一错误响应格式为 { code, data, message }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = ErrorCodes.UNKNOWN_ERROR;
    let message = '服务器内部错误';
    let errors: any = null;

    // 处理 HTTP 异常
    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message || exception.message;
        errors = res.errors || null;
        
        // 如果是业务异常，使用其错误码
        if (res.code !== undefined) {
          code = res.code;
        } else {
          code = this.getErrorCode(exception);
        }
        
        // 处理 class-validator 的验证错误
        if (Array.isArray(res.message)) {
          message = res.message[0];
          errors = res.message;
          code = ErrorCodes.VALIDATION_ERROR;
        }
      } else {
        code = this.getErrorCode(exception);
      }
    } 
    // 处理 TypeORM 查询失败异常
    else if (exception instanceof QueryFailedError) {
      httpStatus = HttpStatus.BAD_REQUEST;
      const err = exception as any;
      
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        message = '数据已存在，请勿重复添加';
        code = ErrorCodes.DUPLICATE_ENTRY;
      } else if (err.code === '23503' || err.message?.includes('foreign key')) {
        message = '关联数据不存在或已被删除';
        code = ErrorCodes.FOREIGN_KEY_VIOLATION;
      } else if (err.code === '23502' || err.message?.includes('not-null')) {
        message = '必填字段不能为空';
        code = ErrorCodes.VALIDATION_ERROR;
      } else {
        message = '数据操作失败，请检查输入数据';
        code = ErrorCodes.DATABASE_ERROR;
      }
      
      console.error(`[${new Date().toISOString()}] [ERROR] 数据库异常:`, {
        code: err.code,
        message: err.message,
      });
    }
    // 处理 TypeORM 实体未找到异常
    else if (exception instanceof EntityNotFoundError) {
      httpStatus = HttpStatus.NOT_FOUND;
      message = '请求的数据不存在';
      code = ErrorCodes.NOT_FOUND;
    }
    // 处理其他错误
    else if (exception instanceof Error) {
      message = this.sanitizeErrorMessage(exception.message);
      code = ErrorCodes.UNKNOWN_ERROR;
      
      console.error(`[${new Date().toISOString()}] [ERROR] 未捕获异常:`, {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        url: request.url,
        method: request.method,
      });
    }

    // 友好的错误消息映射
    const friendlyMessages: Record<number, string> = {
      400: message || '请求参数错误',
      401: '登录已过期，请重新登录',
      403: '没有权限执行此操作',
      404: '请求的资源不存在',
      409: '数据冲突，请检查后重试',
      500: '服务器内部错误，请稍后重试',
    };

    // 统一响应格式
    const responseBody = {
      code,
      data: null,
      message: message || friendlyMessages[httpStatus] || '操作失败',
      ...(errors && { errors }),
      ...(process.env.NODE_ENV !== 'production' && {
        _debug: {
          httpStatus,
          path: request.url,
          timestamp: new Date().toISOString(),
        },
      }),
    };

    response.status(httpStatus).json(responseBody);
  }

  /**
   * 根据异常类型获取错误码
   */
  private getErrorCode(exception: HttpException): number {
    if (exception instanceof BadRequestException) return ErrorCodes.VALIDATION_ERROR;
    if (exception instanceof UnauthorizedException) return ErrorCodes.UNAUTHORIZED;
    if (exception instanceof ForbiddenException) return ErrorCodes.FORBIDDEN;
    if (exception instanceof NotFoundException) return ErrorCodes.NOT_FOUND;
    if (exception instanceof ConflictException) return ErrorCodes.CONFLICT;
    if (exception instanceof InternalServerErrorException) return ErrorCodes.UNKNOWN_ERROR;
    return ErrorCodes.UNKNOWN_ERROR;
  }

  /**
   * 清理错误消息
   */
  private sanitizeErrorMessage(message: string): string {
    const sensitivePatterns = [/password/gi, /token/gi, /secret/gi];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return '操作失败，请稍后重试';
      }
    }
    
    return message.length > 200 ? message.substring(0, 200) + '...' : message;
  }
}
