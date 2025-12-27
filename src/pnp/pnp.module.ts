import { Module } from '@nestjs/common';
import { PnpService } from './pnp.service';
import { PnpController } from './pnp.controller';

@Module({
    controllers: [PnpController],
    providers: [PnpService],
    exports: [PnpService],
})
export class PnpModule { }
