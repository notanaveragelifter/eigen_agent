import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WatcherService } from '../watcher/watcher.service';
import { DeciderService } from '../decider/decider.service';
import { CreatorService } from '../creator/creator.service';
import { TraderService } from '../trader/trader.service';
import { AgentCycleResult } from '../common/interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AgentService {
    private readonly logger = new Logger(AgentService.name);

    constructor(
        private readonly watcher: WatcherService,
        private readonly decider: DeciderService,
        private readonly creator: CreatorService,
        private readonly trader: TraderService,
    ) { }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCron() {
        this.logger.log('Starting scheduled modular agent cycle...');
        await this.run();
    }

    async run(): Promise<AgentCycleResult> {
        const cycleId = uuidv4();
        this.logger.log(`Agent cycle ${cycleId} started...`);

        const result: AgentCycleResult = {
            cycleId,
            status: 'success',
            watcherSignals: { signals: [] },
            approvedMarkets: [],
            createdMarkets: [],
            trades: [],
            errors: [],
        };

        try {
            // 1. WATCHER fetches signals
            result.watcherSignals = await this.watcher.fetchSignals();

            // 2. DECIDER filters and approves
            const deciderOutput = await this.decider.evaluateSignals(result.watcherSignals.signals);
            result.approvedMarkets = deciderOutput.approvedMarkets;

            // 3. CREATOR creates markets
            const creatorOutput = await this.creator.createMarkets(result.approvedMarkets);
            result.createdMarkets = creatorOutput.createdMarkets;
            result.errors.push(...creatorOutput.errors);

            // 4. TRADER participates (Skipped for now as per user request)
            // const traderOutput = await this.trader.participateInMarkets(result.createdMarkets);
            // result.trades = traderOutput.trades;

            // Determine final status
            if (result.errors.length > 0) {
                result.status = result.createdMarkets.length > 0 ? 'partial' : 'failed';
            }

        } catch (error) {
            this.logger.error(`Agent cycle ${cycleId} failed`, error);
            result.status = 'failed';
            result.errors.push(`Cycle failed: ${error.message}`);
        }

        this.logger.log(`Agent cycle ${cycleId} completed. Status: ${result.status}`);
        return result;
    }
}
