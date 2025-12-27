import { Injectable, Logger } from '@nestjs/common';
import { GrokService } from '../grok/grok.service';
import { PnpService } from '../pnp/pnp.service';
import { CreatedMarket, TraderOutput, Trade } from '../common/interfaces';

@Injectable()
export class TraderService {
    private readonly logger = new Logger(TraderService.name);

    constructor(
        private readonly grokService: GrokService,
        private readonly pnpService: PnpService,
    ) { }

    async participateInMarkets(createdMarkets: CreatedMarket[]): Promise<TraderOutput> {
        this.logger.log(`TRADER: Evaluating participation for ${createdMarkets.length} new markets...`);

        const output: TraderOutput = {
            trades: [],
        };

        if (createdMarkets.length === 0) {
            return output;
        }

        for (const market of createdMarkets) {
            try {
                // 1. Get sentiment from Grok
                const sentimentPrompt = `
          Analyze the sentiment and provide a directional bias for the following prediction market question:
          "${market.question}"

          Return a JSON object:
          {
            "bias": "YES | NO",
            "confidence": number (0.0 - 1.0),
            "reasoning": "string"
          }
        `;

                const response = await this.grokService.chat(sentimentPrompt, 'You are the TRADER component of an autonomous prediction market agent.');
                const sentiment = JSON.parse(response);

                this.logger.log(`TRADER: Sentiment for "${market.question}" is ${sentiment.bias} with ${sentiment.confidence} confidence.`);

                // 2. Execute trade
                const tradeAmount = BigInt(1000000); // 1 USDC
                const signature = await this.pnpService.trade({
                    marketAddress: market.marketId,
                    amount: tradeAmount,
                    outcome: sentiment.bias as 'YES' | 'NO',
                });

                const trade: Trade = {
                    marketId: market.marketId,
                    action: 'BUY',
                    outcome: sentiment.bias as 'YES' | 'NO',
                    amount: tradeAmount.toString(),
                };

                output.trades.push(trade);
                this.logger.log(`TRADER: Executed ${trade.action} on market ${trade.marketId}. Signature: ${signature}`);
            } catch (error) {
                this.logger.error(`TRADER: Failed to participate in market ${market.marketId}`, error);
            }
        }

        return output;
    }
}
