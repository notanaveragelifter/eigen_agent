import { Injectable, Logger } from '@nestjs/common';
import { PnpService } from '../pnp/pnp.service';
import { ApprovedMarket, CreatorOutput, CreatedMarket } from '../common/interfaces';

@Injectable()
export class CreatorService {
    private readonly logger = new Logger(CreatorService.name);

    constructor(private readonly pnpService: PnpService) { }

    async createMarkets(approvedMarkets: ApprovedMarket[]): Promise<CreatorOutput> {
        this.logger.log(`CREATOR: Executing market creation for ${approvedMarkets.length} approved markets...`);

        const output: CreatorOutput = {
            createdMarkets: [],
            errors: [],
        };

        if (approvedMarkets.length === 0) {
            return output;
        }

        for (const market of approvedMarkets) {
            try {
                const result = await this.pnpService.createV2Market({
                    question: market.question,
                    initialLiquidity: BigInt(1000000), // Default 1 USDC
                    endTime: BigInt(Math.floor(new Date(market.resolutionTime).getTime() / 1000)),
                    collateralMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
                });

                const created: CreatedMarket = {
                    marketId: result.marketAddress,
                    question: market.question,
                    category: market.category,
                    resolutionTime: market.resolutionTime,
                };

                output.createdMarkets.push(created);
                this.logger.log(`CREATOR: Market created successfully: ${created.marketId}`);
            } catch (error) {
                const errorMsg = `Failed to create market "${market.topic}": ${error.message}`;
                this.logger.error(`CREATOR: ${errorMsg}`);
                output.errors.push(errorMsg);
            }
        }

        return output;
    }
}
