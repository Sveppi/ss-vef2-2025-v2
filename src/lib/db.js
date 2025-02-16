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
  try {
    const result = await query('SELECT * FROM categories');
    console.log('result :>> ', result);
    if (result?.rowCount > 0) {
      return result.rows;
    }
    return [];
  } catch (e) {
    console.error('Error fetching categories:', e);
    return [];
  }
}
export async function categoryFromDatabase(categoryId) {
  try {
    const result = await query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    console.log('result :>> ', result);
    if (result?.rowCount > 0) {
      return result.rows[0];
    }
    return null;
  } catch (e) {
    console.error('Error fetching category:', e);
    return null;
  }
}

export async function questionsFromDatabase(categoryId) {
  const result = await query(
    'SELECT * FROM questions WHERE category_id = $1', [categoryId]);
  console.log('result :>> ', result);
  if (result?.rowCount > 0) {
    return result.rows;
  }
}

export async function answersFromDatabase(questionId) {
  const result = await query(
    'SELECT * FROM answers WHERE question_id = $1', [questionId]);
  console.log('result :>> ', result);
  if (result?.rowCount > 0) {
    return result.rows;
  }
}

export async function query(q, values = []) {
  let client;

  try {
    client = await pool.connect();
    console.log('Executing query:', q, 'with values:', values);
    const result = await client.query(q, values);
    console.log('Query result:', result);
    return result;
  } catch (e) {
    console.error('Database query error:', e);
    throw e;
  } finally {
    if (client) {
      client.release();
    }
  }
}
