import { IsString, IsBoolean, IsOptional, IsNumber, IsArray, Min, Max } from 'class-validator';

// 创建学科 DTO
export class CreateSubjectDto {
  @IsString({ message: '学科名称必须是字符串' })
  name: string;

  @IsOptional()
  @IsBoolean({ message: '是否主科必须是布尔值' })
  isMain?: boolean;
}

// 更新学科 DTO
export class UpdateSubjectDto {
  @IsOptional()
  @IsString({ message: '学科名称必须是字符串' })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: '是否主科必须是布尔值' })
  isMain?: boolean;
}

// 设置学科校验日 DTO
export class SetExcludeDateDto {
  @IsNumber({}, { message: '学科ID必须是数字' })
  subjectId: number;

  @IsNumber({}, { message: '星期必须是数字' })
  @Min(1, { message: '星期最小为1（周一）' })
  @Max(5, { message: '星期最大为5（周五）' })
  dayOfWeek: number;

  @IsOptional()
  @IsString({ message: '备注必须是字符串' })
  remark?: string;
}

// 批量设置校验日 DTO
export class BatchSetExcludeDatesDto {
  @IsArray({ message: '数据必须是数组' })
  data: SetExcludeDateDto[];
}
