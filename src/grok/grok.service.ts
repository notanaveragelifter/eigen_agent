import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class GrokService {
    private readonly logger = new Logger(GrokService.name);
    private readonly apiKey: string;
    private readonly apiUrl = 'https://api.x.ai/v1/chat/completions'; // Assuming standard OpenAI-like endpoint for Grok

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('GROK_API_KEY') || '';
    }

    async chat(prompt: string, systemPrompt?: string): Promise<string> {
        const mockMode = this.configService.get<string>('MOCK_MODE') === 'true';

        if (!this.apiKey && !mockMode) {
            this.logger.warn('GROK_API_KEY not configured. Returning empty response.');
            return '';
        }

        if (mockMode) {
            this.logger.log('MOCK_MODE: Returning mock response');
            if (prompt.includes('Identify trending sports events')) {
                return JSON.stringify({
                    signals: [
                        {
                            topic: 'India vs Australia Cricket Final',
                            category: 'SPORTS',
                            expectedResolutionDate: '2026-03-15T00:00:00Z',
                            confidence: 0.95,
                            sources: ['https://www.icc-cricket.com']
                        },
                        {
                            topic: 'US Senate Infrastructure Bill',
                            category: 'POLITICS',
                            expectedResolutionDate: '2025-06-30T00:00:00Z',
                            confidence: 0.85,
                            sources: ['https://www.congress.gov']
                        }
                    ]
                });
            }
            if (prompt.includes('Evaluate the following candidate signals')) {
                return JSON.stringify({
                    approvedMarkets: [
                        {
                            topic: 'India vs Australia Cricket Final',
                            category: 'SPORTS',
                            question: 'Will India win the ICC Champions Trophy Final on or before March 15, 2026?',
                            resolutionTime: '2026-03-15T00:00:00Z',
                            oracleSource: 'https://www.icc-cricket.com'
                        }
                    ],
                    rejectedSignals: [
                        {
                            topic: 'US Senate Infrastructure Bill',
                            reason: 'Too speculative at this stage'
                        }
                    ]
                });
            }
            if (prompt.includes('Analyze the sentiment')) {
                return JSON.stringify({
                    bias: 'YES',
                    confidence: 0.8,
                    reasoning: 'India has a strong home advantage and recent form.'
                });
            }
            return '{}';
        }

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'grok-3', // Updated from grok-beta
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt },
                    ],
                    response_format: { type: 'json_object' },
                },
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            return response.data.choices[0].message.content;
        } catch (error) {
            this.logger.error('Grok API request failed', error.response?.data || error.message);
            throw error;
        }
    }
}
