import { Module } from '@nestjs/common';
import { WatcherService } from './watcher.service';
import { GrokModule } from '../grok/grok.module';

@Module({
    imports: [GrokModule],
    providers: [WatcherService],
    exports: [WatcherService],
})
export class WatcherModule { }
