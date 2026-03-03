import { IsString, IsNumber, IsOptional, IsArray, Min, Max, MinLength, MaxLength, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Transform } from 'class-transformer';

// 创建班级 DTO
export class CreateClassDto {
  @IsString({ message: '班级名称必须是字符串' })
  @MinLength(2, { message: '班级名称至少2个字符' })
  @MaxLength(30, { message: '班级名称最多30个字符' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString({ message: '年级必须是字符串' })
  @MinLength(2, { message: '年级名称至少2个字符' })
  @MaxLength(10, { message: '年级名称最多10个字符' })
  @Transform(({ value }) => value?.trim())
  grade: string;

  @IsNumber({}, { message: '班级序号必须是数字' })
  @Min(1, { message: '班级序号最小为1' })
  @Max(50, { message: '班级序号最大为50' })
  classNumber: number;

  @IsOptional()
  @IsNumber({}, { message: '班主任ID必须是数字' })
  @Min(1, { message: '班主任ID必须大于0' })
  headTeacherId?: number;
}

// 更新班级 DTO
export class UpdateClassDto {
  @IsOptional()
  @IsString({ message: '班级名称必须是字符串' })
  @MinLength(2, { message: '班级名称至少2个字符' })
  @MaxLength(30, { message: '班级名称最多30个字符' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString({ message: '年级必须是字符串' })
  @MinLength(2, { message: '年级名称至少2个字符' })
  @MaxLength(10, { message: '年级名称最多10个字符' })
  @Transform(({ value }) => value?.trim())
  grade?: string;

  @IsOptional()
  @IsNumber({}, { message: '班级序号必须是数字' })
  @Min(1, { message: '班级序号最小为1' })
  @Max(50, { message: '班级序号最大为50' })
  classNumber?: number;

  @IsOptional()
  @IsNumber({}, { message: '班主任ID必须是数字' })
  @Min(1, { message: '班主任ID必须大于0' })
  headTeacherId?: number;
}

// 批量创建班级 DTO
export class BatchCreateClassDto {
  @IsArray({ message: '年级必须是数组' })
  @ArrayMinSize(1, { message: '至少选择一个年级' })
  @ArrayMaxSize(10, { message: '年级数量不能超过10个' })
  @IsString({ each: true, message: '年级必须是字符串' })
  grades: string[];

  @IsNumber({}, { message: '每年级班级数必须是数字' })
  @Min(1, { message: '每年级班级数最小为1' })
  @Max(20, { message: '每年级班级数最大为20' })
  classCountPerGrade: number;
}

// 设置班主任 DTO
export class SetHeadTeacherDto {
  @IsOptional()
  @IsNumber({}, { message: '教师ID必须是数字' })
  @Min(1, { message: '教师ID必须大于0' })
  teacherId?: number | null;
}
