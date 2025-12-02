import axios, { AxiosError } from 'axios';
import { logger } from './logger';

const fetchData = async <T = unknown>(url: string): Promise<T> => {
    try {
        const response = await axios.get<T>(url, {
            timeout: 10000, // 10 second timeout
            headers: {
                'Accept': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            logger.error(`Error fetching data from ${url}:`, {
                status: axiosError.response?.status,
                statusText: axiosError.response?.statusText,
                message: axiosError.message,
            });
        } else {
            logger.error(`Error fetching data from ${url}:`, error);
        }
        throw error;
    }
};

export default fetchData;
