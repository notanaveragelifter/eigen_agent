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
}
