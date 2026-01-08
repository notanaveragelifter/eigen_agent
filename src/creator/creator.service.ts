import { Injectable, Logger } from '@nestjs/common';
import { PnpService } from '../pnp/pnp.service';
import { ConfigService } from '@nestjs/config';
import { ApprovedMarket, CreatorOutput, CreatedMarket } from '../common/interfaces';

@Injectable()
export class CreatorService {
    private readonly logger = new Logger(CreatorService.name);

    constructor(
        private readonly pnpService: PnpService,
        private readonly configService: ConfigService,
    ) { }

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
                const defaultLiquidity = this.configService.get<string>('DEFAULT_INITIAL_LIQUIDITY') || '1000000';
                const initialLiquidity = (market as any).initialLiquidity ? BigInt((market as any).initialLiquidity) : BigInt(defaultLiquidity);

                const result = await this.pnpService.createV2Market({
                    question: market.question,
                    initialLiquidity: initialLiquidity,
                    endTime: BigInt(Math.floor(new Date(market.resolutionTime).getTime() / 1000)),
                    collateralMint: this.configService.get<string>('USDC_MINT') || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
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
