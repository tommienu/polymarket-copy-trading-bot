import { ClobClient } from '@polymarket/clob-client';
import { UserActivityInterface, UserPositionInterface } from '../interfaces/User';
import { ENV } from '../config/env';
import { getUserActivityModel } from '../models/userHistory';
import fetchData from '../utils/fetchData';
import spinner from '../utils/spinner';
import getMyBalance from '../utils/getMyBalance';
import postOrder from '../utils/postOrder';
import { logger } from '../utils/logger';
import { POLYMARKET_API } from '../constants/api';

const USER_ADDRESS = ENV.USER_ADDRESS;
const RETRY_LIMIT = ENV.RETRY_LIMIT;
const PROXY_WALLET = ENV.PROXY_WALLET;

let temp_trades: UserActivityInterface[] = [];
let isRunning = true;

const UserActivity = getUserActivityModel(USER_ADDRESS);

const readTempTrade = async (): Promise<void> => {
    try {
        temp_trades = (
            await UserActivity.find({
                $and: [
                    { type: 'TRADE' },
                    { bot: false },
                    { $or: [
                        { botExcutedTime: { $exists: false } },
                        { botExcutedTime: { $lt: RETRY_LIMIT } }
                    ]}
                ],
            }).exec()
        ).map((trade) => trade as UserActivityInterface);
    } catch (error) {
        logger.error('Error reading trades from database:', error);
        throw error;
    }
};

const determineTradeCondition = (
    trade: UserActivityInterface,
    my_position: UserPositionInterface | undefined,
    user_position: UserPositionInterface | undefined
): string => {
    // Determine the trading condition based on trade side and positions
    if (trade.side === 'BUY') {
        return 'buy';
    } else if (trade.side === 'SELL') {
        // If user has no position after selling, it's a merge (closing position)
        if (!user_position || user_position.size === 0) {
            return 'merge';
        }
        return 'sell';
    }
    
    // Default to buy if side is unclear
    logger.warn(`Unknown trade side: ${trade.side}, defaulting to buy`);
    return 'buy';
};

const doTrading = async (clobClient: ClobClient): Promise<void> => {
    for (const trade of temp_trades) {
        try {
            logger.info(`Processing trade: ${trade.transactionHash} - ${trade.side} ${trade.size} @ ${trade.price}`);
            
            // Fetch current positions
            const my_positions: UserPositionInterface[] = await fetchData(
                POLYMARKET_API.POSITIONS(PROXY_WALLET)
            );
            const user_positions: UserPositionInterface[] = await fetchData(
                POLYMARKET_API.POSITIONS(USER_ADDRESS)
            );
            
            const my_position = my_positions.find(
                (position: UserPositionInterface) => position.conditionId === trade.conditionId
            );
            const user_position = user_positions.find(
                (position: UserPositionInterface) => position.conditionId === trade.conditionId
            );
            
            // Get balances
            const my_balance = await getMyBalance(PROXY_WALLET);
            const user_balance = await getMyBalance(USER_ADDRESS);
            
            logger.info(`My balance: ${my_balance} USDC | User balance: ${user_balance} USDC`);
            logger.debug(`My position: ${JSON.stringify(my_position)}`);
            logger.debug(`User position: ${JSON.stringify(user_position)}`);
            
            // Determine trading condition
            const condition = determineTradeCondition(trade, my_position, user_position);
            logger.info(`Trade condition determined: ${condition}`);
            
            // Execute the trade
            await postOrder(
                clobClient,
                condition,
                my_position,
                user_position,
                trade,
                my_balance,
                user_balance
            );
            
            logger.success(`Trade executed successfully: ${trade.transactionHash}`);
        } catch (error) {
            logger.error(`Error executing trade ${trade.transactionHash}:`, error);
            // Increment retry count
            await UserActivity.updateOne(
                { _id: trade._id },
                { $inc: { botExcutedTime: 1 } }
            ).exec();
        }
    }
};

const tradeExecutor = async (clobClient: ClobClient): Promise<void> => {
    logger.info('Trade Executor started');
    logger.info(`My wallet: ${PROXY_WALLET}`);

    while (isRunning) {
        try {
            await readTempTrade();
            
            if (temp_trades.length > 0) {
                logger.info(`💥 Found ${temp_trades.length} new transaction(s) to execute 💥`);
                spinner.stop();
                await doTrading(clobClient);
                
                // Small delay between batches
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } else {
                spinner.start('Waiting for new transactions');
                // Wait a bit before checking again
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        } catch (error) {
            logger.error('Error in trade executor loop:', error);
            spinner.stop();
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }
    
    spinner.stop();
    logger.info('Trade Executor stopped');
};

export const stopTradeExecutor = (): void => {
    isRunning = false;
    logger.info('Trade Executor stop requested');
};

export default tradeExecutor;
