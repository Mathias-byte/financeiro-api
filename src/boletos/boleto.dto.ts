import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsInt, Min, Max, IsString, MaxLength, IsNumber, IsEnum, IsDateString, IsUrl, Matches, ValidateIf } from 'class-validator';
import { SituacaoCobranca, FormaPagamento } from '../generated/prisma/client';
export class CreateBoletoDto {
  @ApiProperty({ example: 1 })
  @IsInt() @Min(1) @Max(4294967295)
  cobrancaId!: number;
  @ApiPropertyOptional({ example: "DEMONSTRACAO-001" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(255)
  codigoBarras?: string;
  @ApiPropertyOptional({ example: "DEMO-001" })
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(255)
  linhaDigitavel?: string;
  @ApiPropertyOptional({ example: "https://example.com/boleto.pdf" })
  @ValidateIf((_object, value) => value !== undefined) @IsUrl() @MaxLength(500)
  urlPdf?: string;
  @ApiPropertyOptional({ example: 1, description: "1 = ativo, 0 = inativo" })
  @ValidateIf((_object, value) => value !== undefined) @IsInt() @Min(0) @Max(1)
  status?: number;
}
export class UpdateBoletoDto extends PartialType(CreateBoletoDto, { skipNullProperties: false }) {}
