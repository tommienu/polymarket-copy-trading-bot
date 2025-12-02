import mongoose from 'mongoose';
import { ENV } from './env';
import { logger } from '../utils/logger';

const uri = ENV.MONGO_URI || 'mongodb://localhost:27017/polymarket_copytrading';

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(uri);
        logger.success('MongoDB connected successfully');
        
        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });
        
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });
        
        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });
    } catch (error) {
        logger.error('MongoDB connection error:', error);
        throw error;
    }
};

export default connectDB;
