import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CreatorService } from './creator.service';
import { PnpModule } from '../pnp/pnp.module';

@Module({
    imports: [ConfigModule, PnpModule],
    providers: [CreatorService],
    exports: [CreatorService],
})
export class CreatorModule { }
