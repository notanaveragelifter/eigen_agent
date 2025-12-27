import { Module } from '@nestjs/common';
import { TraderService } from './trader.service';
import { GrokModule } from '../grok/grok.module';
import { PnpModule } from '../pnp/pnp.module';

@Module({
    imports: [GrokModule, PnpModule],
    providers: [TraderService],
    exports: [TraderService],
})
export class TraderModule { }
