import { Module } from '@nestjs/common';
import { DespesaController } from './despesa.controller';
import { DespesaService } from './despesa.service';
@Module({ controllers: [DespesaController], providers: [DespesaService] })
export class DespesaModule {}
