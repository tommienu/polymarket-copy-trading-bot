import { ethers } from 'ethers';
import { ClobClient } from '@polymarket/clob-client';
import { SignatureType } from '@polymarket/order-utils';
import { ENV } from '../config/env';
import { logger } from './logger';

const PROXY_WALLET = ENV.PROXY_WALLET;
const PRIVATE_KEY = ENV.PRIVATE_KEY;
const CLOB_HTTP_URL = ENV.CLOB_HTTP_URL;

const createClobClient = async (): Promise<ClobClient> => {
    try {
        const chainId = 137; // Polygon mainnet
        const host = CLOB_HTTP_URL as string;
        const wallet = new ethers.Wallet(PRIVATE_KEY as string);
        
        logger.info('Initializing CLOB client...');
        logger.debug(`Wallet address: ${wallet.address}`);
        logger.debug(`Proxy wallet: ${PROXY_WALLET}`);
        
        // Create initial client without API key
        let clobClient = new ClobClient(
            host,
            chainId,
            wallet,
            undefined,
            SignatureType.POLY_PROXY,
            PROXY_WALLET as string
        );

        // Suppress console.error during API key creation (CLOB client is verbose)
        const originalConsoleError = console.error;
        console.error = function () {};
        
        let creds = await clobClient.createApiKey();
        console.error = originalConsoleError;
        
        if (creds.key) {
            logger.success('API Key created successfully');
        } else {
            logger.info('API Key not created, attempting to derive...');
            creds = await clobClient.deriveApiKey();
            logger.success('API Key derived successfully');
        }

        // Create final client with API credentials
        clobClient = new ClobClient(
            host,
            chainId,
            wallet,
            creds,
            SignatureType.POLY_PROXY,
            PROXY_WALLET as string
        );
        
        logger.success('CLOB client initialized successfully');
        return clobClient;
    } catch (error) {
        logger.error('Failed to create CLOB client:', error);
        throw error;
    }
};

export default createClobClient;
