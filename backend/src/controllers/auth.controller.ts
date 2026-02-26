import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LoginDto } from '../dto';

/**
 * 认证控制器
 * 
 * 处理用户认证相关的 HTTP 请求，包括：
 * - 用户登录
 * - 获取当前用户信息
 * 
 * @class AuthController
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 用户登录
   * 
   * @description 验证用户凭据并返回 JWT 访问令牌
   * @param body - 登录请求体，包含用户名和密码
   * @returns 包含 access_token 和用户信息的对象
   * @throws UnauthorizedException 当用户名或密码错误时
   * 
   * @example
   * POST /auth/login
   * {
   *   "username": "admin",
   *   "password": "admin123"
   * }
   */
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  /**
   * 获取当前用户信息
   * 
   * @description 根据 JWT Token 获取当前登录用户的详细信息
   * @param req - 请求对象，包含已解析的用户信息
   * @returns 用户信息对象（不包含密码）
   * @throws UnauthorizedException 当用户不存在时
   * 
   * @example
   * GET /auth/profile
   * Authorization: Bearer <token>
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }
}
