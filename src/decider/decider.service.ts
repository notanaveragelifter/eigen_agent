import { Injectable, Logger } from '@nestjs/common';
import { GrokService } from '../grok/grok.service';
import { WatcherSignal, DeciderOutput } from '../common/interfaces';

@Injectable()
export class DeciderService {
  private readonly logger = new Logger(DeciderService.name);

  constructor(private readonly grokService: GrokService) { }

  async evaluateSignals(signals: WatcherSignal[]): Promise<DeciderOutput> {
    this.logger.log(`DECIDER: Evaluating ${signals.length} signals for market viability...`);

    if (signals.length === 0) {
      return { approvedMarkets: [], rejectedSignals: [] };
    }

    const currentTime = new Date().toISOString();
    const prompt = `
      Current Time: ${currentTime}

      Evaluate the following candidate signals for prediction market viability.
      IMPORTANT: You MUST approve EXACTLY ONE market. Choose the highest quality signal.
      
      A signal should be approved only if it is:
      1. Binary resolvable (YES/NO).
      2. Clear and unambiguous.
      3. Time-bounded (between ${currentTime} and 1 year from now).
      4. Has a clear public oracle source.
      5. Safe and compliant (no violence, death, or personal harm).

      Signals:
      ${JSON.stringify(signals, null, 2)}

      Return a JSON object with the following schema:
      {
        "approvedMarkets": [
          {
            "topic": "string",
            "category": "SPORTS | POLITICS",
            "question": "string (Clear YES/NO question)",
            "resolutionTime": "ISO string",
            "oracleSource": "string"
          }
        ],
        "rejectedSignals": [
          {
            "topic": "string",
            "reason": "string"
          }
        ]
      }
    `;

    const systemPrompt = 'You are the DECIDER component of an autonomous prediction market agent. Your job is to filter signals for quality, safety, and resolvability.';

    try {
      const response = await this.grokService.chat(prompt, systemPrompt);
      const data: DeciderOutput = JSON.parse(response);

      this.logger.log(`DECIDER: Approved ${data.approvedMarkets.length} markets, rejected ${data.rejectedSignals.length} signals.`);
      return data;
    } catch (error) {
      this.logger.error('DECIDER: Failed to evaluate signals', error);
      return { approvedMarkets: [], rejectedSignals: [] };
    }
  }
}
