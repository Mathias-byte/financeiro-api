import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, MaxLength, IsNumber, IsEnum, IsDateString, IsUrl, Matches, ValidateIf } from 'class-validator';
import { SituacaoCobranca, FormaPagamento } from '../generated/prisma/client';
export class CreateDespesaDto {
  @ApiPropertyOptional({ example: "Limpeza" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(255)
  descricao?: string;
  @ApiPropertyOptional({ example: "Empresa de limpeza" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(150)
  fornecedor?: string;
  @ApiProperty({ example: 150 })
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(99999999.99)
  valor!: number;
  @ApiProperty({ example: "2026-10-06" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true })
  data!: string;
  @ApiPropertyOptional({ example: "MANUTENCAO" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(100)
  categoria?: string;
  @ApiPropertyOptional({ example: 1, description: "1 = ativo, 0 = inativo" })
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(1)
  status?: number;
}
export class UpdateDespesaDto extends PartialType(CreateDespesaDto, { skipNullProperties: false }) {}
