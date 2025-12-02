/**
 * Polymarket API endpoints
 */
export const POLYMARKET_API = {
    BASE_URL: 'https://data-api.polymarket.com',
    POSITIONS: (userAddress: string) => `${POLYMARKET_API.BASE_URL}/positions?user=${userAddress}`,
    ACTIVITIES: (userAddress: string, limit = 100) => 
        `${POLYMARKET_API.BASE_URL}/users/${userAddress}/activities?type=TRADE&limit=${limit}`,
} as const;

/**
 * Polygon network configuration
 */
export const POLYGON = {
    CHAIN_ID: 137,
    USDC_CONTRACT: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
} as const;

/**
 * Trading constants
 */
export const TRADING = {
    MAX_PRICE_DIFFERENCE: 0.05, // Maximum price difference to execute trade
    DEFAULT_FETCH_INTERVAL: 1, // seconds
    DEFAULT_TOO_OLD_TIMESTAMP: 24, // hours
    DEFAULT_RETRY_LIMIT: 3,
} as const;

