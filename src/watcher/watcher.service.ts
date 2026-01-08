import { Injectable, Logger } from '@nestjs/common';
import { GrokService } from '../grok/grok.service';
import { WatcherOutput } from '../common/interfaces';

@Injectable()
export class WatcherService {
  private readonly logger = new Logger(WatcherService.name);

  constructor(private readonly grokService: GrokService) { }

  async fetchSignals(): Promise<WatcherOutput> {
    this.logger.log('WATCHER: Fetching signals using Grok API...');

    const currentTime = new Date().toISOString();
    const prompt = `
      Current Time: ${currentTime}

      You are monitoring Twitter/X trends related to geopolitics, wars, and military conflicts.
      
      Track trending geopolitical narratives such as:
      - Wars, invasions, military escalations
      - Defense ministries, armed forces, and intelligence agencies
      - Statements from governments, presidents, defense secretaries, NATO, UN
      - Credible journalists, analysts, and official handles
      
      Examples: "US invade Greenland", "Iran–Israel escalation", "China Taiwan blockade"
      
      IGNORE:
      - Memes, sarcasm, propaganda, or unverifiable rumors
      - Opinion pieces without factual basis
      - Vague speculation
      
      Extract event candidates that imply a future binary outcome.
      IMPORTANT: All expectedResolutionDate values MUST be in the future (after ${currentTime}).
      
      Return a JSON object with the following schema:
      {
        "signals": [
          {
            "topic": "string (factual description of the geopolitical event)",
            "category": "GEOPOLITICS | MILITARY | WAR",
            "expectedResolutionDate": "ISO string (MUST be in the future)",
            "confidence": number (0.0 - 1.0),
            "sources": ["string (credible Twitter handles, news agencies, official accounts)"]
          }
        ]
      }
    `;

    const systemPrompt = 'You are the WATCHER component of an autonomous prediction-market creation agent specialized in geopolitics, wars, and military conflicts. Your job is to continuously monitor Twitter/X trends and extract observable signals that imply future binary outcomes.';

    try {
      const response = await this.grokService.chat(prompt, systemPrompt);
      const data: WatcherOutput = JSON.parse(response);

      this.logger.log(`WATCHER: Found ${data.signals.length} candidate signals.`);
      return data;
    } catch (error) {
      this.logger.error('WATCHER: Failed to fetch signals', error);
      return { signals: [] };
    }
  }
}
