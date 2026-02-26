import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User } from '../entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    isActive: true,
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('应该成功登录并返回 token', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.login('admin', 'admin123');

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
    });

    it('用户名不存在时应抛出异常', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login('nonexistent', 'password'))
        .rejects
        .toThrow(UnauthorizedException);
    });

    it('密码错误时应抛出异常', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.login('admin', 'wrongpassword'))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('应该返回用户信息', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
    });

    it('用户不存在时应抛出异常', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile(999))
        .rejects
        .toThrow(UnauthorizedException);
    });
  });
});
