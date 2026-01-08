import { Controller, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentCycleResult } from '../common/interfaces';

@Controller('agent')
export class AgentController {
    constructor(private readonly agentService: AgentService) { }

    /**
     * Triggers the prediction market agent execution
     * POST /agent/run
     */
    @Post('run')
    async run(): Promise<AgentCycleResult> {
        return await this.agentService.run();
    }

    /**
     * Test only the swapping logic (SOL -> USDC)
     * POST /agent/test-swap
     */
    @Post('test-swap')
    async testSwap(): Promise<string> {
        return await this.agentService.testSwap();
    }
}

