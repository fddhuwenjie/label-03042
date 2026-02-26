import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, MinLength, MaxLength, Min, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

// 创建教师 DTO
export class CreateTeacherDto {
  @IsString({ message: '教师姓名必须是字符串' })
  @MinLength(2, { message: '教师姓名至少2个字符' })
  @MaxLength(20, { message: '教师姓名最多20个字符' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsOptional()
  @IsNumber({}, { message: '学科ID必须是数字' })
  @Min(1, { message: '学科ID必须大于0' })
  subjectId?: number;

  @IsOptional()
  @IsArray({ message: '任教班级ID必须是数组' })
  @IsNumber({}, { each: true, message: '班级ID必须是数字' })
  @ArrayMaxSize(20, { message: '任教班级数量不能超过20个' })
  teachingClassIds?: number[];

  @IsOptional()
  @IsBoolean({ message: '是否可参与第三阶段必须是布尔值' })
  canStage3?: boolean;
}

// 更新教师 DTO
export class UpdateTeacherDto {
  @IsOptional()
  @IsString({ message: '教师姓名必须是字符串' })
  @MinLength(2, { message: '教师姓名至少2个字符' })
  @MaxLength(20, { message: '教师姓名最多20个字符' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsNumber({}, { message: '学科ID必须是数字' })
  @Min(1, { message: '学科ID必须大于0' })
  subjectId?: number;

  @IsOptional()
  @IsArray({ message: '任教班级ID必须是数组' })
  @IsNumber({}, { each: true, message: '班级ID必须是数字' })
  @ArrayMaxSize(20, { message: '任教班级数量不能超过20个' })
  teachingClassIds?: number[];

  @IsOptional()
  @IsBoolean({ message: '是否可参与第三阶段必须是布尔值' })
  canStage3?: boolean;
}

// 批量设置第三阶段教师 DTO
export class SetStage3TeachersDto {
  @IsArray({ message: '教师ID必须是数组' })
  @IsNumber({}, { each: true, message: '教师ID必须是数字' })
  @ArrayMaxSize(100, { message: '一次最多设置100名教师' })
  teacherIds: number[];
}
