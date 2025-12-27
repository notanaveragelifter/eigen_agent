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

      Identify trending sports events and political developments that are breaking or upcoming and high-impact.
      Focus on events that are verifiable and have a clear resolution.
      IMPORTANT: All expectedResolutionDate values MUST be in the future (after ${currentTime}).
      
      Return a JSON object with the following schema:
      {
        "signals": [
          {
            "topic": "string",
            "category": "SPORTS | POLITICS",
            "expectedResolutionDate": "ISO string (MUST be in the future)",
            "confidence": number (0.0 - 1.0),
            "sources": ["string"]
          }
        ]
      }
    `;

    const systemPrompt = 'You are the WATCHER component of an autonomous prediction market agent. Your job is to observe and normalize signals from the world.';

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
