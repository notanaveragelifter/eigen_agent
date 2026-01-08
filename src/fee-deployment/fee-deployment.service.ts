import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import bs58 from 'bs58';
import { PnpService } from '../pnp/pnp.service';
import { WatcherService } from '../watcher/watcher.service';
import { DeciderService } from '../decider/decider.service';

@Injectable()
export class FeeDeploymentService {
    private readonly logger = new Logger(FeeDeploymentService.name);
    private readonly stateFilePath = path.join(process.cwd(), 'storage', 'fee_deployment_state.json');
    private readonly connection: Connection;
    private readonly wallet: Keypair | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly pnpService: PnpService,
        private readonly watcherService: WatcherService,
        private readonly deciderService: DeciderService,
    ) {
        const rpcUrl = this.configService.get<string>('RPC_URL') || 'https://api.mainnet-beta.solana.com';
        this.connection = new Connection(rpcUrl, 'confirmed');

        let walletSecretStr = this.configService.get<string>('WALLET_SECRET');
        if (!walletSecretStr) {
            walletSecretStr = this.configService.get<string>('PNP_PRIVATE_KEY');
        }

        if (walletSecretStr) {
            try {
                let secretKey: Uint8Array;
                if (walletSecretStr.trim().startsWith('[')) {
                    secretKey = Uint8Array.from(JSON.parse(walletSecretStr));
                } else {
                    secretKey = bs58.decode(walletSecretStr.trim());
                }
                this.wallet = Keypair.fromSecretKey(secretKey);
                this.logger.log(`Wallet initialized: ${this.wallet.publicKey.toBase58()}`);
            } catch (error) {
                this.logger.error('Failed to parse wallet secret (Expected JSON array or Base58 string)', error);
            }
        } else {
            this.logger.warn('WALLET_SECRET not configured.');
        }
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCron() {
        this.logger.log('CRON: Checking Fee Deployment trigger...');
        await this.runFeeDeployment();
    }

    async runFeeDeployment(force: boolean = false, swapOnly: boolean = false) {
        const mockMode = this.configService.get<string>('MOCK_MODE') === 'true';

        this.logger.log(`FEE DEPLOYMENT: Starting (force=${force}, swapOnly=${swapOnly})`);

        if (!force && !this.shouldExecute()) {
            this.logger.log('TRIGGER: 24 hours have not passed since last execution. Skipping.');
            return;
        }

        if (!this.wallet && !mockMode) {
            this.logger.warn('ABORT: Wallet not initialized and not in MOCK_MODE.');
            return;
        }

        try {
            const tokenMint = this.configService.get<string>('DEVFUN_TOKEN_MINT');
            if (!tokenMint) {
                this.logger.warn('SKIP: DEVFUN_TOKEN_MINT not configured.');
                return;
            }

            const usdcMint = this.configService.get<string>('USDC_MINT') || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            const minUsdcForMarketStr = this.configService.get<string>('MIN_USDC_FOR_MARKET') || '1000000';
            const minUsdcValue = BigInt(minUsdcForMarketStr);

            let balance = 0n;
            let decimals = 9;

            if (mockMode) {
                balance = BigInt(1000000000);
            } else {
                const mintPubKey = new PublicKey(tokenMint);
                const isNativeSol = tokenMint === 'So11111111111111111111111111111111111111112';

                if (isNativeSol) {
                    balance = BigInt(await this.connection.getBalance(this.wallet!.publicKey));
                } else {
                    const mintInfo = await this.connection.getParsedAccountInfo(mintPubKey);
                    if (mintInfo.value && 'parsed' in mintInfo.value.data) {
                        decimals = mintInfo.value.data.parsed.info.decimals;
                    }
                    balance = await this.getTokenBalance(mintPubKey);
                }
            }

            const humanBalance = Number(balance) / Math.pow(10, decimals);
            this.logger.log(`STEP 1: Balance for ${tokenMint}: ${humanBalance}`);

            let amountToSwap = (balance * 20n) / 100n;
            if (force) {
                // For manual swaps, target approximately 1 USDC worth of SOL
                // At ~$135/SOL, 1 USDC ≈ 0.0075 SOL = 7,500,000 lamports
                // Add 10% buffer for slippage: ~8,250,000 lamports
                const targetSolForOneUsdc = BigInt(8_250_000);
                const minSolForSwap = BigInt(5_000_000); // 0.005 SOL minimum

                if (balance > targetSolForOneUsdc) {
                    amountToSwap = targetSolForOneUsdc;
                } else if (balance > minSolForSwap) {
                    amountToSwap = minSolForSwap;
                }
            }

            let receivedUsdc = 0n;
            if (mockMode) {
                receivedUsdc = BigInt(5000000);
            } else {
                const usdcBalanceBefore = await this.getTokenBalance(new PublicKey(usdcMint));

                // Perform swap using calculated amount (ExactIn)
                this.logger.log(`Performing swap for: ${Number(amountToSwap) / 10 ** 9} SOL (targeting ~1 USDC)`);
                const swapSuccess = await this.swapToUsdc(tokenMint, usdcMint, amountToSwap, false);

                const usdcBalanceAfter = await this.getTokenBalance(new PublicKey(usdcMint));
                receivedUsdc = usdcBalanceAfter - usdcBalanceBefore;

                if (!swapSuccess && receivedUsdc < minUsdcValue) {
                    const totalUsdc = await this.getTokenBalance(new PublicKey(usdcMint));
                    if (totalUsdc >= minUsdcValue) {
                        this.logger.log(`Swap did not result in new USDC, but using existing balance: ${Number(totalUsdc) / 1000000} USDC`);
                        receivedUsdc = totalUsdc;
                    } else {
                        this.logger.warn('Insufficient USDC and swap failed.');
                        return;
                    }
                }
            }

            this.logger.log(`STEP 3: Validating available USDC: ${Number(receivedUsdc) / 1000000}`);
            if (receivedUsdc < minUsdcValue) {
                this.logger.warn(`STOP: Insufficient USDC (${Number(receivedUsdc) / 1000000})`);
                return;
            }

            if (swapOnly) {
                this.logger.log('SUCCESS: Swap completed/verified.');
                return;
            }

            const success = await this.createMarketWithFees(receivedUsdc);
            if (success) {
                this.recordSuccess();
                this.logger.log('FEE DEPLOYMENT: Successfully completed.');
            }

        } catch (error) {
            this.logger.error('FEE DEPLOYMENT: Execution failed', error);
        }
    }

    async testSwap() {
        this.logger.log('TEST: Triggering manual swap check...');
        await this.runFeeDeployment(true, true);
    }

    private async swapToUsdc(fromMint: string, toMint: string, amount: bigint, isExactOut = false): Promise<boolean> {
        const apiKey = this.configService.get<string>('JUPITER_API_KEY');
        // Jupiter Paid API uses /swap/v1/ endpoints
        const urls = [
            'https://api.jup.ag/swap/v1/quote',
            'https://api.jup.ag/v6/quote',
            'https://lite-api.jup.ag/v6/quote'
        ];

        const headers: any = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        if (apiKey) headers['X-Api-Key'] = apiKey;

        const inputMintStandard = fromMint.trim();
        const inputMintNative = inputMintStandard === 'So11111111111111111111111111111111111111112'
            ? '11111111111111111111111111111111'
            : inputMintStandard;
        const outputMint = toMint.trim();
        const swapMode = isExactOut ? 'ExactOut' : 'ExactIn';

        let quote: any = null;
        let finalBaseUrl = '';

        // Try different endpoint/mint combinations
        for (const baseUrl of urls) {
            for (const currentInput of [inputMintStandard, inputMintNative]) {
                try {
                    const quoteUrl = `${baseUrl}?inputMint=${currentInput}&outputMint=${outputMint}&amount=${amount.toString()}&slippageBps=100&swapMode=${swapMode}&onlyDirectRoutes=false`;
                    this.logger.log(`Trying Jupiter Quote (${baseUrl}): input=${currentInput}`);

                    const response = await axios.get(quoteUrl, { headers, timeout: 10000 });
                    if (response.data && response.data.outAmount) {
                        quote = response.data;
                        finalBaseUrl = baseUrl.split('/quote')[0];
                        this.logger.log(`Quote found using ${baseUrl} with input ${currentInput}`);
                        break;
                    }
                } catch (e) {
                    const msg = e.response?.data?.message || e.message;
                    this.logger.debug(`Jupiter quote attempt failed (${baseUrl}): ${msg}`);
                }
            }
            if (quote) break;
        }

        if (!quote) {
            this.logger.error('Failed to get swap quote from Jupiter after multiple attempts');
            return false;
        }

        try {
            this.logger.log(`Quote received: ${Number(quote.inAmount) / 10 ** 9} SOL -> ${Number(quote.outAmount) / 10 ** 6} USDC`);
            this.logger.log('Getting swap transaction...');

            const swapResponse = await axios.post(`${finalBaseUrl}/swap`, {
                quoteResponse: quote,
                userPublicKey: this.wallet!.publicKey.toBase58(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 'auto',
            }, { headers, timeout: 20000 });

            const { swapTransaction } = swapResponse.data;
            if (!swapTransaction) {
                this.logger.error('Failed to get swap transaction from Jupiter');
                return false;
            }

            // Step 3: Deserialize and sign transaction
            const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
            transaction.sign([this.wallet!]);

            // Step 4: Send transaction
            this.logger.log(`Sending transaction...`);
            const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
                skipPreflight: false,
                maxRetries: 3,
            });
            this.logger.log(`Transaction sent: ${signature}`);

            // Step 5: Confirm transaction
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');

            if (confirmation.value.err) {
                this.logger.error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
                return false;
            }

            this.logger.log(`Swap successful: ${signature}`);
            return true;
        } catch (error) {
            const status = error.response?.status;
            const errorData = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Swap failed (Status: ${status}): ${errorData}`);
            return false;
        }
    }

    private shouldExecute(): boolean {
        if (!fs.existsSync(this.stateFilePath)) return true;
        try {
            const data = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf8'));
            const lastRun = data.lastExecutionTimestamp || 0;
            return (Math.floor(Date.now() / 1000) - lastRun) >= 86400;
        } catch { return true; }
    }

    private recordSuccess() {
        const dir = path.dirname(this.stateFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.stateFilePath, JSON.stringify({ lastExecutionTimestamp: Math.floor(Date.now() / 1000) }));
    }

    private async getTokenBalance(mint: PublicKey): Promise<bigint> {
        try {
            const ata = await getAssociatedTokenAddress(mint, this.wallet!.publicKey);
            const account = await getAccount(this.connection, ata);
            return account.amount;
        } catch { return 0n; }
    }

    private async createMarketWithFees(usdcAmount: bigint): Promise<boolean> {
        try {
            const signals = await this.watcherService.fetchSignals();
            if (!signals.signals.length) return false;
            const approved = await this.deciderService.evaluateSignals(signals.signals);
            if (!approved.approvedMarkets.length) return false;

            const market = approved.approvedMarkets[0];
            const result = await this.pnpService.createV2Market({
                question: market.question,
                initialLiquidity: usdcAmount,
                endTime: BigInt(Math.floor(new Date(market.resolutionTime).getTime() / 1000)),
                collateralMint: this.configService.get<string>('USDC_MINT') || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            });
            return !!result.marketAddress;
        } catch { return false; }
    }
}
