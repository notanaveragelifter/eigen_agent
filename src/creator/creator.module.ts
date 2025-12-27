import { Module } from '@nestjs/common';
import { CreatorService } from './creator.service';
import { PnpModule } from '../pnp/pnp.module';

@Module({
    imports: [PnpModule],
    providers: [CreatorService],
    exports: [CreatorService],
})
export class CreatorModule { }
