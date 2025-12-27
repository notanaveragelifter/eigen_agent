import { Module } from '@nestjs/common';
import { DeciderService } from './decider.service';
import { GrokModule } from '../grok/grok.module';

@Module({
    imports: [GrokModule],
    providers: [DeciderService],
    exports: [DeciderService],
})
export class DeciderModule { }
