import { readFile } from 'node:fs/promises';
import { Database } from './lib/db.client.js';
import { environment } from './lib/environment.js';
import { logger as loggerSingleton } from './lib/logger.js';

const SCHEMA_FILE = './sql/schema.sql';
const DROP_SCHEMA_FILE = './sql/drop.sql';
const INSERT_FILE = './sql/insert.sql';

/**
 * @param {Database} db
 * @param {import('./lib/logger.js').Logger} logger
 * @returns {Promise<boolean>}
 */
async function setupDbFromFiles(db, logger) {
  const dropScript = await readFile(DROP_SCHEMA_FILE);
  const createScript = await readFile(SCHEMA_FILE);
  const insertScript = await readFile(INSERT_FILE);

  if (await db.query(dropScript.toString('utf-8'))) {
    logger.info('schema dropped');
  } else {
    logger.info('schema not dropped, exiting');
    return false;
  }

  if (await db.query(createScript.toString('utf-8'))) {
    logger.info('schema created');
  } else {
    logger.info('schema not created');
    return false;
  }

  if (await db.query(insertScript.toString('utf-8'))) {
    logger.info('data inserted');
  } else {
    logger.info('data not inserted');
    return false;
  }

  return true;
}

async function create() {
  const logger = loggerSingleton;
  const env = environment(process.env, logger);

  if (!env) {
    process.exit(1);
  }

  logger.info('starting setup');

  const db = new Database(env.connectionString, logger);
  db.open();

  const resultFromFileSetup = await setupDbFromFiles(db, logger);

  if (!resultFromFileSetup) {
    logger.info('error setting up database from files');
    process.exit(1);
  }

  logger.info('setup complete');
  await db.close();
}

create().catch((err) => {
  console.error('error running setup', err);
});
