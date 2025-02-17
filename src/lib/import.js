import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xss from 'xss';

export async function runSqlScript(scriptPath, pool) {
  try {
    const sql = await fs.promises.readFile(scriptPath, 'utf8');
    await pool.query(sql);
    console.log(`SQL script ${scriptPath} executed successfully.`);
  } catch (err) {
    console.error(`Error executing SQL script ${scriptPath}:`, err);
  }
}

export async function initDatabase(pool) {
  try {
    const moduleUrl = import.meta.url;
    const moduleDir = path.dirname(fileURLToPath(moduleUrl));
    const rootDir = path.join(moduleDir, '../..');
    const schemaPath = path.join(rootDir, 'sql', 'schema.sql');
    const importPath = path.join(rootDir, 'sql', 'insert.sql');

    await runSqlScript(schemaPath, pool);
    await runSqlScript(importPath, pool);

    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

export async function loadQuestionData() {
  const moduleUrl = import.meta.url;
  const moduleDir = path.dirname(fileURLToPath(moduleUrl));
  const dataDir = path.join(moduleDir, '..', '..', 'data');
  const files = await fs.promises.readdir(dataDir);

  const questions = [];

  for (const file of files) {
    if (path.extname(file) === '.json') {
      const filePath = path.join(dataDir, file);
      const fileData = await fs.promises.readFile(filePath, 'utf8');
      const { title, questions: fileQuestions } = JSON.parse(fileData);

      questions.push(...fileQuestions.map((q) => ({ ...q, category: title })));
    }
  }

  return questions;
}

// bæta inn gömlu spurningunum í gagnagrunninn
export async function seedDatabase(pool) {
  try {
    await pool.query('BEGIN');

    const questions = await loadQuestionData();

    for (const question of questions) {
      // Find the category ID
      const { rows: categoryRows } = await pool.query(
        'SELECT id FROM categories WHERE name = $1',
        [question.category],
      );
      const categoryId = categoryRows[0]?.id;

      // Sanitize the question and answers
      const sanitizedQuestion = xss(question.question);
      const sanitizedAnswers = question.answers.map((answer) => ({
        answer: xss(answer.answer),
        correct: answer.correct,
      }));

      // Check if the question already exists
      const { rows: existingQuestionRows } = await pool.query(
        'SELECT id FROM questions WHERE category_id = $1 AND question = $2',
        [categoryId, sanitizedQuestion],
      );
      if (existingQuestionRows.length > 0) {
        continue; // Skip inserting the question if it already exists
      }

      // Insert the question
      const { rows: questionRows } = await pool.query(
        'INSERT INTO questions (category_id, question) VALUES ($1, $2) RETURNING id',
        [categoryId, sanitizedQuestion],
      );
      const questionId = questionRows[0].id;

      // Insert the answers
      for (const answer of sanitizedAnswers) {
        await pool.query(
          'INSERT INTO answers (question_id, answer, correct) VALUES ($1, $2, $3)',
          [questionId, answer.answer, answer.correct],
        );
      }
    }

    await pool.query('COMMIT');
    console.log('Database seeded successfully!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error seeding database:', err);
  }
}
