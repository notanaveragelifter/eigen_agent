export interface WatcherSignal {
    topic: string;
    category: 'SPORTS' | 'POLITICS';
    expectedResolutionDate: string;
    confidence: number;
    sources: string[];
}

export interface WatcherOutput {
    signals: WatcherSignal[];
}

export interface ApprovedMarket {
    topic: string;
    category: 'SPORTS' | 'POLITICS';
    question: string;
    resolutionTime: string;
    oracleSource: string;
}

export interface RejectedSignal {
    topic: string;
    reason: string;
}

export interface DeciderOutput {
    approvedMarkets: ApprovedMarket[];
    rejectedSignals: RejectedSignal[];
}

export interface CreatedMarket {
    marketId: string;
    question: string;
    category: 'SPORTS' | 'POLITICS';
    resolutionTime: string;
}

export interface CreatorOutput {
    createdMarkets: CreatedMarket[];
    errors: string[];
}

export interface Trade {
    marketId: string;
    action: 'BUY' | 'SELL' | 'PROVIDE_LIQUIDITY';
    outcome: 'YES' | 'NO';
    amount: string;
}

export interface TraderOutput {
    trades: Trade[];
}

export interface AgentCycleResult {
    cycleId: string;
    status: 'success' | 'partial' | 'failed';
    watcherSignals: WatcherOutput;
    approvedMarkets: ApprovedMarket[];
    createdMarkets: CreatedMarket[];
    trades: Trade[];
    errors: string[];
}
