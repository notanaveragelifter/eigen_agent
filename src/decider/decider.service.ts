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

      Evaluate the following geopolitical signals for prediction market viability.
      IMPORTANT: You MUST approve EXACTLY ONE market. Choose the highest quality signal.
      
      A signal should be approved only if it:
      1. Has a clear YES/NO outcome
      2. Has a well-defined time window (between ${currentTime} and 6 months from now)
      3. Can be resolved via credible public sources (official statements, Reuters, AP, UN, government releases)
      4. Does not involve explicit violence encouragement or unsafe content
      5. Is NOT vague, opinion-based, or open-ended
      
      Market Framing Rules:
      - Frame markets in neutral, factual language
      - Avoid sensationalism or leading phrasing
      - Use "Will X happen by DATE?" format
      
      Example valid markets:
      - "Will the United States announce a military operation involving Greenland before March 31, 2026?"
      - "Will NATO formally invoke Article 5 in response to the Ukraine conflict before April 30, 2026?"
      - "Will Israel conduct an officially acknowledged ground operation in Lebanon before February 15, 2026?"

      Signals:
      ${JSON.stringify(signals, null, 2)}

      Return a JSON object with the following schema:
      {
        "approvedMarkets": [
          {
            "topic": "string",
            "category": "GEOPOLITICS | MILITARY | WAR",
            "question": "string (Clear YES/NO question using 'Will X happen by DATE?' format)",
            "resolutionTime": "ISO string",
            "oracleSource": "string (specific credible sources like Reuters, AP, UN, official government statements)",
            "resolutionCriteria": "string (clear criteria for how this market will be resolved)"
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

    const systemPrompt = 'You are the DECIDER component of an autonomous prediction-market creation agent specialized in geopolitics, wars, and military conflicts. Your job is to filter signals for quality, safety, resolvability, and neutral framing. Do not speculate beyond observable signals. Do not generate markets based solely on public opinion or price predictions.';

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
