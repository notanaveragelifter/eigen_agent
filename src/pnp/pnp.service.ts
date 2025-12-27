import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PNPClient } from 'pnp-sdk';
import { PublicKey } from '@solana/web3.js';

export interface CreateMarketParams {
    question: string;
    initialLiquidity: bigint;
    endTime: bigint;
    collateralMint: string;
}

export interface CreateMarketResult {
    signature: string;
    marketAddress: string;
}

export interface TradeParams {
    marketAddress: string;
    amount: bigint;
    outcome: 'YES' | 'NO';
}

@Injectable()
export class PnpService implements OnModuleInit {
    private readonly logger = new Logger(PnpService.name);
    private client: PNPClient | null = null;

    constructor(private readonly configService: ConfigService) { }

    onModuleInit() {
        const rpcUrl = this.configService.get<string>('RPC_URL');
        let walletSecretStr = this.configService.get<string>('WALLET_SECRET');

        if (!walletSecretStr) {
            walletSecretStr = this.configService.get<string>('PNP_PRIVATE_KEY');
        }

        if (!rpcUrl || !walletSecretStr) {
            this.logger.warn('RPC_URL or WALLET_SECRET not configured. PNPClient not initialized.');
            return;
        }

        try {
            const walletSecret = JSON.parse(walletSecretStr);
            this.client = new PNPClient(rpcUrl, Uint8Array.from(walletSecret));
            this.logger.log('PNPClient initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize PNPClient', error);
        }
    }

    isInitialized(): boolean {
        return this.client !== null;
    }

    async createV2Market(params: CreateMarketParams): Promise<CreateMarketResult> {
        const mockMode = this.configService.get<string>('MOCK_MODE') === 'true';

        if (!this.client && !mockMode) {
            throw new Error('PNPClient not initialized. Please check your configuration.');
        }

        if (mockMode) {
            this.logger.log(`MOCK_MODE: Simulating market creation for: ${params.question}`);
            return {
                signature: 'mock_signature_' + Math.random().toString(36).substring(7),
                marketAddress: 'mock_market_address_' + Math.random().toString(36).substring(7),
            };
        }

        this.logger.log(`Creating V2 market: ${params.question}`);

        try {
            const client = this.client;
            const result = await client!.market!.createMarket({
                question: params.question,
                initialLiquidity: params.initialLiquidity,
                endTime: params.endTime,
                baseMint: new PublicKey(params.collateralMint),
            });

            this.logger.log('Market created successfully!');
            this.logger.log(`Signature: ${result.signature}`);
            this.logger.log(`Market Address: ${result.market.toBase58()}`);

            return {
                signature: result.signature || '',
                marketAddress: result.market?.toBase58() || '',
            };
        } catch (error) {
            this.logger.error('Failed to create market', error);
            throw error;
        }
    }

    async trade(params: TradeParams): Promise<string> {
        const mockMode = this.configService.get<string>('MOCK_MODE') === 'true';

        if (!this.client && !mockMode) {
            throw new Error('PNPClient not initialized. Please check your configuration.');
        }

        if (mockMode) {
            this.logger.log(`MOCK_MODE: Simulating trade of ${params.amount} on market ${params.marketAddress} for outcome ${params.outcome}`);
            return 'mock_trade_signature_' + Math.random().toString(36).substring(7);
        }

        this.logger.log(`Trading ${params.amount} on market ${params.marketAddress} for outcome ${params.outcome}`);

        try {
            const client = this.client;
            // Using trade method as discovered in node_modules
            const result = await (client!.market! as any).trade({
                market: new PublicKey(params.marketAddress),
                side: params.outcome,
                price: 0.5, // Default price for AMM if not specified
                size: Number(params.amount) / 1000000, // Convert to USDC units
            });

            this.logger.log(`Trade executed successfully! Signature: ${result.signature}`);
            return result.signature;
        } catch (error) {
            this.logger.error('Failed to execute trade', error);
            throw error;
        }
    }
}
