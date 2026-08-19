import { app } from './app';
import { env } from './config/env';
import { getPool } from './db/pool';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  const pool = getPool();
  const port = env.PORT;

  const server = app.listen(port, () => {
    logger.info(`Moroccan Hammam Management API listening on port ${port} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close(async () => {
      try {
        await pool.end();
        logger.info('Database pool closed. Goodbye.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    });
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});