import { ethers } from 'ethers';
import { ENV } from '../config/env';
import { logger } from './logger';

const RPC_URL = ENV.RPC_URL;
const USDC_CONTRACT_ADDRESS = ENV.USDC_CONTRACT_ADDRESS;

const USDC_ABI = ['function balanceOf(address owner) view returns (uint256)'];

const getMyBalance = async (address: string): Promise<number> => {
    try {
        const rpcProvider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, rpcProvider);
        const balance_usdc = await usdcContract.balanceOf(address);
        const balance_usdc_real = ethers.utils.formatUnits(balance_usdc, 6);
        const balance = parseFloat(balance_usdc_real);
        
        logger.debug(`Balance for ${address}: ${balance} USDC`);
        return balance;
    } catch (error) {
        logger.error(`Error fetching balance for ${address}:`, error);
        throw error;
    }
};

export default getMyBalance;
