import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVercel = !!process.env.VERCEL;
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');
const prettyPrint = process.env.LOG_PRETTY === 'true' && !isVercel;

// Never use pino-pretty in Vercel (serverless) or production
export const logger = pino({
  level: logLevel,
  ...(!isVercel && prettyPrint && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
