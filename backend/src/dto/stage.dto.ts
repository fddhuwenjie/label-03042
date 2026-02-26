import { IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 阶段班级数量项
export class StageClassCountItem {
  @IsNumber({}, { message: '阶段序号必须是数字' })
  @Min(1, { message: '阶段序号最小为1' })
  @Max(3, { message: '阶段序号最大为3' })
  stageNumber: number;

  @IsNumber({}, { message: '班级数量必须是数字' })
  @Min(0, { message: '班级数量最小为0' })
  classCount: number;
}

// 更新阶段班级数量 DTO
export class UpdateStageClassCountsDto {
  @IsArray({ message: '数据必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => StageClassCountItem)
  data: StageClassCountItem[];
}
