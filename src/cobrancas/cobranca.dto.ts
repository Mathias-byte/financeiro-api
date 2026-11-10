import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, MaxLength, IsNumber, IsEnum, IsDateString, IsUrl, Matches, ValidateIf } from 'class-validator';
import { SituacaoCobranca, FormaPagamento } from '../generated/prisma/client';
export class CreateCobrancaDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Min(1) @Max(4294967295)
  imovelId!: number;
  @ApiPropertyOptional({ example: "Taxa condominial" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(255)
  descricao?: string;
  @ApiProperty({ example: "2026-10-01" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  competencia!: string;
  @ApiProperty({ example: 500 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(99999999.99)
  valor!: number;
  @ApiProperty({ example: "2026-10-10" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  vencimento!: string;
  @ApiPropertyOptional({ example: "PENDENTE", enum: SituacaoCobranca })
  @ValidateIf((_object, value) => value !== undefined) @IsEnum(SituacaoCobranca)
  situacao?: SituacaoCobranca;
  @ApiPropertyOptional({ example: 1, description: "1 = ativo, 0 = inativo" })
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(1)
  status?: number;
}
export class UpdateCobrancaDto extends PartialType(CreateCobrancaDto, { skipNullProperties: false }) {}
