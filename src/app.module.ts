import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PnpModule } from './pnp/pnp.module';
import { AgentModule } from './agent/agent.module';
import { FeeDeploymentModule } from './fee-deployment/fee-deployment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PnpModule,
    AgentModule,
    FeeDeploymentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
