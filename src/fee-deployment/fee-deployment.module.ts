import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeeDeploymentService } from './fee-deployment.service';
import { PnpModule } from '../pnp/pnp.module';
import { WatcherModule } from '../watcher/watcher.module';
import { DeciderModule } from '../decider/decider.module';

@Module({
    imports: [ConfigModule, PnpModule, WatcherModule, DeciderModule],
    providers: [FeeDeploymentService],
    exports: [FeeDeploymentService],
})
export class FeeDeploymentModule { }
