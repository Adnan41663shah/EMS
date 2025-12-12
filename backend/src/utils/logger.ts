import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloudblitz-crm' },
  transports: [
    // Error log with daily rotation and 1 day retention
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: 1, // Keep only 1 file (today's), auto-deletes yesterday's logs
      zippedArchive: false,
      auditFile: 'logs/.error-audit.json',
    }),
    // Combined log with daily rotation and 1 day retention
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: 1, // Keep only 1 file (today's), auto-deletes yesterday's logs
      zippedArchive: false,
      auditFile: 'logs/.combined-audit.json',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;
