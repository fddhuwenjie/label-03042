import { IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';

// 创建排班周 DTO
export class CreateWeekDto {
  @IsNumber({}, { message: '年份必须是数字' })
  @Min(2020, { message: '年份不能早于2020年' })
  @Max(2100, { message: '年份不能晚于2100年' })
  year: number;

  @IsNumber({}, { message: '周数必须是数字' })
  @Min(1, { message: '周数最小为1' })
  @Max(53, { message: '周数最大为53' })
  weekNumber: number;

  @IsDateString({}, { message: '开始日期格式不正确，应为 YYYY-MM-DD' })
  startDate: string;

  @IsDateString({}, { message: '结束日期格式不正确，应为 YYYY-MM-DD' })
  endDate: string;
}

// 更新排班 DTO
export class UpdateScheduleDto {
  @IsOptional()
  @IsNumber({}, { message: '教师ID必须是数字' })
  @Min(1, { message: '教师ID必须大于0' })
  teacherId?: number;

  @IsOptional()
  @IsNumber({}, { message: '班级ID必须是数字' })
  @Min(1, { message: '班级ID必须大于0' })
  classId?: number;
}
