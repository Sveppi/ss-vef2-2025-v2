import pg from 'pg';

const { DATABASE_URL: connectionString } = process.env;

if (!connectionString) {
  console.error('Missing DATABASE_URL from env');
  process.exit(1);
} else {
  console.info(connectionString);
}

const pool = new pg.Pool({ connectionString });

pool.on('error', (err) => {
  console.error('postgres error, exiting...', err);
  process.exit(1);
});

export async function categoriesFromDatabase() {
  const result = await query('SELECT * FROM categories');
  console.log('result :>> ', result);
  if (result?.rowCount > 0) {
    return result.rows;
  }

  return null;
}

export async function query(q) {
  let client;

  try {
    client = await pool.connect();
  } catch (e) {
    console.error('Unable to connect', e);
    return;
  }

  let result;
  try {
    result = await client.query(q);
    console.log(result);
  } catch (e) {
    console.error('Error selecting', e);
  } finally {
    client.release();
  }

  await pool.end();

  return result;
}
