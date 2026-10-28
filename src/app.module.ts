import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
   /** adicionar somente estas linhas do construtor  **/
  constructor() {
    console.log("Aplicação iniciada!");
    console.log("Banco:", process.env.DATABASE_URL);
    console.log("API Key:", process.env.API_KEY);
    console.log("JWT Secret:", process.env.JWT_SECRET);   
  }
   /** fim do adicionar  **/
}
