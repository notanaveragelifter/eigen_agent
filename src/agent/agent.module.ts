import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { WatcherModule } from '../watcher/watcher.module';
import { DeciderModule } from '../decider/decider.module';
import { CreatorModule } from '../creator/creator.module';
import { TraderModule } from '../trader/trader.module';
import { FeeDeploymentModule } from '../fee-deployment/fee-deployment.module';

@Module({
    imports: [
        WatcherModule,
        DeciderModule,
        CreatorModule,
        TraderModule,
        FeeDeploymentModule,
    ],
    controllers: [AgentController],
    providers: [AgentService],
    exports: [AgentService],
})
export class AgentModule { }
