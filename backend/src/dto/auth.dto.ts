import { IsString, MinLength } from 'class-validator';

// 登录 DTO
export class LoginDto {
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(1, { message: '用户名不能为空' })
  username: string;

  @IsString({ message: '密码必须是字符串' })
  @MinLength(1, { message: '密码不能为空' })
  password: string;
}
