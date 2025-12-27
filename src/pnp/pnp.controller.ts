import { Controller, Post, Body } from '@nestjs/common';
import { PnpService } from './pnp.service';

@Controller('pnp')
export class PnpController {
    constructor(private readonly pnpService: PnpService) { }

    @Post('create-market')
    async createMarket(
        @Body() body: {
            question: string;
            initialLiquidity: string; // Using string to handle large numbers from JSON
            endTime: string;
            collateralMint: string;
        },
    ) {
        return await this.pnpService.createV2Market({
            question: body.question,
            initialLiquidity: BigInt(body.initialLiquidity),
            endTime: BigInt(body.endTime),
            collateralMint: body.collateralMint,
        });
    }
}
