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
            if (prompt.includes('geopolitics, wars, and military conflicts')) {
                return JSON.stringify({
                    signals: [
                        {
                            topic: 'Native SOL Territorial Dispute',
                            category: 'GEOPOLITICS',
                            expectedResolutionDate: '2026-06-30T00:00:00Z',
                            confidence: 0.9,
                            sources: ['@ReutersWorld', '@TheEconomist']
                        },
                        {
                            topic: 'South China Sea Freedom of Navigation Operation',
                            category: 'MILITARY',
                            expectedResolutionDate: '2026-03-20T00:00:00Z',
                            confidence: 0.85,
                            sources: ['@USNavy', '@CNN']
                        }
                    ]
                });
            }
            if (prompt.includes('Evaluate the following geopolitical signals')) {
                return JSON.stringify({
                    approvedMarkets: [
                        {
                            topic: 'Native SOL Territorial Dispute',
                            category: 'GEOPOLITICS',
                            question: 'Will the Arctic Council announce a formal agreement on territorial boundaries before June 30, 2026?',
                            resolutionTime: '2026-06-30T00:00:00Z',
                            oracleSource: 'Official statements from the Arctic Council and its member states (USA, Canada, Russia, etc.)',
                            resolutionCriteria: 'A joint communique or treaty signed by at least 5 member states resolving the 2024 boundary disputes.'
                        }
                    ],
                    rejectedSignals: [
                        {
                            topic: 'South China Sea Freedom of Navigation Operation',
                            reason: 'Not binary enough; FONOPS are continuous and often not framed as single event by official sources.'
                        }
                    ]
                });
            }
            if (prompt.includes('Analyze the sentiment')) {
                return JSON.stringify({
                    bias: 'NO',
                    confidence: 0.75,
                    reasoning: 'Tensions remain high and a formal agreement is unlikely in this timeframe given current diplomatic stagnation.'
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
