import chalk from 'chalk';

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    SUCCESS = 'SUCCESS',
    DEBUG = 'DEBUG',
}

class Logger {
    private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
        return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
    }

    info(message: string, ...args: unknown[]): void {
        console.log(chalk.blue(this.formatMessage(LogLevel.INFO, message, ...args)));
    }

    warn(message: string, ...args: unknown[]): void {
        console.warn(chalk.yellow(this.formatMessage(LogLevel.WARN, message, ...args)));
    }

    error(message: string, ...args: unknown[]): void {
        console.error(chalk.red(this.formatMessage(LogLevel.ERROR, message, ...args)));
    }

    success(message: string, ...args: unknown[]): void {
        console.log(chalk.green(this.formatMessage(LogLevel.SUCCESS, message, ...args)));
    }

    debug(message: string, ...args: unknown[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.gray(this.formatMessage(LogLevel.DEBUG, message, ...args)));
        }
    }
}

export const logger = new Logger();

