import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应格式接口
 */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 响应拦截器
 * 统一包装成功响应为 { code, data, message } 格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => {
        // 如果响应已经是标准格式，直接返回
        if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
          return data;
        }
        
        // 包装为标准格式
        return {
          code: 0,
          data: data ?? null,
          message: '操作成功',
        };
      }),
    );
  }
}
