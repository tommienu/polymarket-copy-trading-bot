import moment from 'moment';
import { ENV } from '../config/env';
import { UserActivityInterface } from '../interfaces/User';
import { getUserActivityModel, getUserPositionModel } from '../models/userHistory';
import fetchData from '../utils/fetchData';
import { logger } from '../utils/logger';
import { POLYMARKET_API } from '../constants/api';

const USER_ADDRESS = ENV.USER_ADDRESS;
const TOO_OLD_TIMESTAMP = ENV.TOO_OLD_TIMESTAMP;
const FETCH_INTERVAL = ENV.FETCH_INTERVAL;
const PROXY_WALLET = ENV.PROXY_WALLET;

if (!USER_ADDRESS) {
    throw new Error('USER_ADDRESS is not defined');
}

const UserActivity = getUserActivityModel(USER_ADDRESS);
const UserPosition = getUserPositionModel(USER_ADDRESS);

let temp_trades: UserActivityInterface[] = [];
let isRunning = true;

const init = async () => {
    try {
        temp_trades = (await UserActivity.find().exec()).map((trade) => trade as UserActivityInterface);
        logger.info(`Loaded ${temp_trades.length} existing trades from database`);
    } catch (error) {
        logger.error('Error initializing trade monitor:', error);
        throw error;
    }
};

const fetchTradeData = async (): Promise<void> => {
    try {
        const cutoffTime = moment().subtract(TOO_OLD_TIMESTAMP, 'hours').unix() * 1000;
        
        // Fetch user activities from Polymarket API
        const activities: UserActivityInterface[] = await fetchData(
            POLYMARKET_API.ACTIVITIES(USER_ADDRESS, 100)
        );

        if (!Array.isArray(activities)) {
            logger.warn('Invalid response from Polymarket API, expected array');
            return;
        }

        let newTradesCount = 0;
        let updatedTradesCount = 0;

        for (const activity of activities) {
            // Skip if too old
            if (activity.timestamp && activity.timestamp < cutoffTime) {
                continue;
            }

            // Only process TRADE type activities
            if (activity.type !== 'TRADE') {
                continue;
            }

            // Check if trade already exists
            const existingTrade = await UserActivity.findOne({
                transactionHash: activity.transactionHash,
            }).exec();

            if (!existingTrade) {
                // New trade - add to database
                const newTrade = new UserActivity({
                    ...activity,
                    proxyWallet: PROXY_WALLET,
                    bot: false,
                    botExcutedTime: 0,
                });
                await newTrade.save();
                newTradesCount++;
                logger.info(`New trade detected: ${activity.transactionHash} - ${activity.side} ${activity.size} @ ${activity.price}`);
            } else if (!existingTrade.bot) {
                // Trade exists but not executed yet - update if needed
                await UserActivity.updateOne(
                    { _id: existingTrade._id },
                    { $set: activity }
                ).exec();
                updatedTradesCount++;
            }
        }

        if (newTradesCount > 0 || updatedTradesCount > 0) {
            logger.info(`Fetched trades: ${newTradesCount} new, ${updatedTradesCount} updated`);
        }
    } catch (error) {
        logger.error('Error fetching trade data:', error);
        // Don't throw - continue monitoring even if one fetch fails
    }
};

const tradeMonitor = async (): Promise<void> => {
    logger.info(`Trade Monitor started - polling every ${FETCH_INTERVAL} second(s)`);
    logger.info(`Target user wallet: ${USER_ADDRESS}`);
    
    try {
        await init(); // Load existing trades before server restart
    } catch (error) {
        logger.error('Failed to initialize trade monitor:', error);
        throw error;
    }

    while (isRunning) {
        try {
            await fetchTradeData();
        } catch (error) {
            logger.error('Error in trade monitor loop:', error);
        }
        
        // Wait for next interval
        await new Promise((resolve) => setTimeout(resolve, FETCH_INTERVAL * 1000));
    }
    
    logger.info('Trade Monitor stopped');
};

export const stopTradeMonitor = (): void => {
    isRunning = false;
    logger.info('Trade Monitor stop requested');
};

export default tradeMonitor;
