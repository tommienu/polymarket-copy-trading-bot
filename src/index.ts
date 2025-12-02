import connectDB from './config/db';
import { ENV } from './config/env';
import createClobClient from './utils/createClobClient';
import tradeExecutor, { stopTradeExecutor } from './services/tradeExecutor';
import tradeMonitor, { stopTradeMonitor } from './services/tradeMonitor';
import { logger } from './utils/logger';

const USER_ADDRESS = ENV.USER_ADDRESS;
const PROXY_WALLET = ENV.PROXY_WALLET;

let clobClient: Awaited<ReturnType<typeof createClobClient>> | null = null;
let isShuttingDown = false;

const gracefulShutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) {
        return;
    }
    
    isShuttingDown = true;
    logger.warn(`Received ${signal}, initiating graceful shutdown...`);
    
    try {
        // Stop trade monitor and executor
        stopTradeMonitor();
        stopTradeExecutor();
        
        logger.info('Services stopped, waiting for cleanup...');
        
        // Give services time to finish current operations
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        logger.success('Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

export const main = async (): Promise<void> => {
    try {
        // Setup graceful shutdown handlers
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        
        // Handle uncaught errors
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            gracefulShutdown('uncaughtException');
        });
        
        process.on('unhandledRejection', (reason) => {
            logger.error('Unhandled rejection:', reason);
        });
        
        // Connect to database
        logger.info('Connecting to database...');
        await connectDB();
        
        // Display configuration
        logger.info('='.repeat(60));
        logger.info('Polymarket Copy Trading Bot');
        logger.info('='.repeat(60));
        logger.info(`Target User Wallet: ${USER_ADDRESS}`);
        logger.info(`My Wallet: ${PROXY_WALLET}`);
        logger.info('='.repeat(60));
        
        // Initialize CLOB client
        clobClient = await createClobClient();
        
        // Start services (run in parallel)
        logger.info('Starting services...');
        const monitorPromise = tradeMonitor();
        const executorPromise = tradeExecutor(clobClient);
        
        // Wait for both services (they run indefinitely)
        await Promise.all([monitorPromise, executorPromise]);
    } catch (error) {
        logger.error('Fatal error in main:', error);
        await gracefulShutdown('fatal-error');
    }
};

// Start the application
if (require.main === module) {
    main().catch((error) => {
        logger.error('Failed to start application:', error);
        process.exit(1);
    });
}
