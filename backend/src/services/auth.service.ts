import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

// 认证服务
@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  // 模块初始化时创建默认管理员账户
  async onModuleInit() {
    const adminExists = await this.userRepository.findOne({
      where: { username: 'admin' },
    });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await this.userRepository.save({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('默认管理员账户已创建: admin / admin123');
    }
  }

  // 用户登录
  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username, isActive: true },
    });
    
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    
    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  // 获取当前用户信息
  async getProfile(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
