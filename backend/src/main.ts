import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // 全局响应拦截器（统一响应格式）
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // 设置全局前缀
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 8042;
  await app.listen(port);
  
  console.log(`[${new Date().toISOString()}] [INFO] 课后服务排班系统已启动`);
  console.log(`[${new Date().toISOString()}] [INFO] 服务端口: ${port}`);
  console.log(`[${new Date().toISOString()}] [INFO] API 前缀: /api`);
}
bootstrap();
