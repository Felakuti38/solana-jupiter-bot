import winston from 'winston';
import chalk from 'chalk';
import { MONITORING_CONFIG } from '../config/config';

const customFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  // Color coding for console output
  switch (level) {
    case 'error':
      return chalk.red(msg);
    case 'warn':
      return chalk.yellow(msg);
    case 'info':
      return chalk.blue(msg);
    case 'debug':
      return chalk.gray(msg);
    default:
      return msg;
  }
});

export const logger = winston.createLogger({
  level: MONITORING_CONFIG.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export default logger;