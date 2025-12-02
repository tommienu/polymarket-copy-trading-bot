import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import { UserActivityInterface, UserPositionInterface } from '../interfaces/User';
import { getUserActivityModel } from '../models/userHistory';
import { ENV } from '../config/env';
import { logger } from './logger';

const RETRY_LIMIT = ENV.RETRY_LIMIT;
const USER_ADDRESS = ENV.USER_ADDRESS;
const UserActivity = getUserActivityModel(USER_ADDRESS);

const postOrder = async (
    clobClient: ClobClient,
    condition: string,
    my_position: UserPositionInterface | undefined,
    user_position: UserPositionInterface | undefined,
    trade: UserActivityInterface,
    my_balance: number,
    user_balance: number
) => {
    //Merge strategy
    if (condition === 'merge') {
        logger.info('Executing merge strategy...');
        if (!my_position) {
            logger.warn('No position to merge, marking trade as processed');
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        }
        let remaining = my_position.size;
        let retry = 0;
        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                logger.warn('No bids found for merge, marking trade as processed');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            logger.debug(`Max price bid: ${JSON.stringify(maxPriceBid)}`);
            let order_arges;
            if (remaining <= parseFloat(maxPriceBid.size)) {
                order_arges = {
                    side: Side.SELL,
                    tokenID: my_position.asset,
                    amount: remaining,
                    price: parseFloat(maxPriceBid.price),
                };
            } else {
                order_arges = {
                    side: Side.SELL,
                    tokenID: my_position.asset,
                    amount: parseFloat(maxPriceBid.size),
                    price: parseFloat(maxPriceBid.price),
                };
            }
            logger.info(`Posting merge order: ${order_arges.side} ${order_arges.amount} @ ${order_arges.price}`);
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                logger.success(`Order executed successfully. Remaining: ${remaining - order_arges.amount}`);
                remaining -= order_arges.amount;
            } else {
                retry += 1;
                logger.warn(`Order failed (attempt ${retry}/${RETRY_LIMIT}):`, resp);
            }
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else if (condition === 'buy') {       //Buy strategy
        logger.info('Executing buy strategy...');
        const ratio = my_balance / (user_balance + trade.usdcSize);
        logger.debug(`Balance ratio: ${ratio}`);
        let remaining = trade.usdcSize * ratio;
        let retry = 0;
        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.asks || orderBook.asks.length === 0) {
                logger.warn('No asks found for buy, marking trade as processed');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const minPriceAsk = orderBook.asks.reduce((min, ask) => {
                return parseFloat(ask.price) < parseFloat(min.price) ? ask : min;
            }, orderBook.asks[0]);

            logger.debug(`Min price ask: ${JSON.stringify(minPriceAsk)}`);
            if (parseFloat(minPriceAsk.price) - 0.05 > trade.price) {
                logger.warn(`Price difference too large (${parseFloat(minPriceAsk.price) - trade.price}), skipping trade`);
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }
            let order_arges;
            if (remaining <= parseFloat(minPriceAsk.size) * parseFloat(minPriceAsk.price)) {
                order_arges = {
                    side: Side.BUY,
                    tokenID: trade.asset,
                    amount: remaining,
                    price: parseFloat(minPriceAsk.price),
                };
            } else {
                order_arges = {
                    side: Side.BUY,
                    tokenID: trade.asset,
                    amount: parseFloat(minPriceAsk.size) * parseFloat(minPriceAsk.price),
                    price: parseFloat(minPriceAsk.price),
                };
            }
            logger.info(`Posting merge order: ${order_arges.side} ${order_arges.amount} @ ${order_arges.price}`);
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                logger.success(`Order executed successfully. Remaining: ${remaining - order_arges.amount}`);
                remaining -= order_arges.amount;
            } else {
                retry += 1;
                logger.warn(`Order failed (attempt ${retry}/${RETRY_LIMIT}):`, resp);
            }
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else if (condition === 'sell') {          //Sell strategy
        logger.info('Executing sell strategy...');
        let remaining = 0;
        if (!my_position) {
            logger.warn('No position to sell, marking trade as processed');
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
            return;
        } else if (!user_position) {
            remaining = my_position.size;
        } else {
            const ratio = trade.size / (user_position.size + trade.size);
            logger.debug(`Sell ratio: ${ratio}`);
            remaining = my_position.size * ratio;
        }
        let retry = 0;
        while (remaining > 0 && retry < RETRY_LIMIT) {
            const orderBook = await clobClient.getOrderBook(trade.asset);
            if (!orderBook.bids || orderBook.bids.length === 0) {
                logger.warn('No bids found for sell, marking trade as processed');
                await UserActivity.updateOne({ _id: trade._id }, { bot: true });
                break;
            }

            const maxPriceBid = orderBook.bids.reduce((max, bid) => {
                return parseFloat(bid.price) > parseFloat(max.price) ? bid : max;
            }, orderBook.bids[0]);

            logger.debug(`Max price bid: ${JSON.stringify(maxPriceBid)}`);
            let order_arges;
            if (remaining <= parseFloat(maxPriceBid.size)) {
                order_arges = {
                    side: Side.SELL,
                    tokenID: trade.asset,
                    amount: remaining,
                    price: parseFloat(maxPriceBid.price),
                };
            } else {
                order_arges = {
                    side: Side.SELL,
                    tokenID: trade.asset,
                    amount: parseFloat(maxPriceBid.size),
                    price: parseFloat(maxPriceBid.price),
                };
            }
            logger.info(`Posting merge order: ${order_arges.side} ${order_arges.amount} @ ${order_arges.price}`);
            const signedOrder = await clobClient.createMarketOrder(order_arges);
            const resp = await clobClient.postOrder(signedOrder, OrderType.FOK);
            if (resp.success === true) {
                retry = 0;
                logger.success(`Order executed successfully. Remaining: ${remaining - order_arges.amount}`);
                remaining -= order_arges.amount;
            } else {
                retry += 1;
                logger.warn(`Order failed (attempt ${retry}/${RETRY_LIMIT}):`, resp);
            }
        }
        if (retry >= RETRY_LIMIT) {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true, botExcutedTime: retry });
        } else {
            await UserActivity.updateOne({ _id: trade._id }, { bot: true });
        }
    } else {
        logger.error(`Unsupported trade condition: ${condition}`);
        await UserActivity.updateOne({ _id: trade._id }, { bot: true });
    }
};

export default postOrder;
