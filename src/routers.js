import express from 'express';
import { categoriesFromDatabase, questionsFromDatabase, answersFromDatabase, categoryFromDatabase } from './lib/db.js';
import { Database } from './lib/db.client.js';
import { environment } from './lib/environment.js';
import { logger } from './lib/logger.js';
import { symbolSwap } from './lib/html.js';

export const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await categoriesFromDatabase();
    console.log('categories:', categories);
    if (categories.length === 0) {
      return res.status(500).render('error', {
        error: 'Villa kom upp við að sækja flokka',
      });
    }
    res.render('index', { title: "Forsíða", categories });
  } catch (e) {
    console.error('Error fetching categories:', e);
    res.status(500).render('error', {
      error: 'Villa kom upp við að sækja flokka',
    });
  }
});

// bæta við nýjum flokki
router.get('/form-category', (req, res) => {
  res.render('form', { title: 'Bæta við flokk' });
});

router.post('/form-category', async (req, res) => {
  const name = symbolSwap(req.body.name);
  console.log(name);

  // validation fyrir nafn af flokk
  // what if too long
  if (name.length > 64) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      errors: ['Nafn á flokk má ekki vera lengra en 64 stafir'],
    });
    return;
  }
  // what if empty
  if (!name || name.length === 0) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      errors: ['Nafn á flokk má ekki vera tómt'],
    });
    return;
  }
  // what if already exists
  const categories = await categoriesFromDatabase();
  if (!categories) {
    res.render('error', { title: 'Villa við að sækja gögn' });
    return;
  }
  const categoryExists = categories.some(
    (category) => category.name.toLowerCase() === name.toLowerCase()
  );
  if (categoryExists) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      errors: ['Flokkur með þessu nafni er nú þegar til'],
    });
    return;
  }
  // ef validation klikkar, láta vita

  // ef validation er ok, bæta við í gagnagrunn
  const env = environment(process.env, logger);
  if (!env) {
    process.exit(1);
  }

  const db = new Database(env.connectionString, logger);
  db.open();

  const result = await db.query('INSERT INTO categories (name) VALUES ($1)', [
    name,
  ]);

  console.log(result);

  res.render('form-created', { title: 'Flokkur búinn til' });
});

// bæta við nýrri spurningu

router.get('/spurningar/:category', async (req, res) => {
  const categoryId = req.params.category;

  try {
    // Fetch the category name
    const category = await categoryFromDatabase(categoryId);
    if (!category) {
      return res.status(404).render('error', {
        title: 'Flokkur ekki fundinn',
        error: 'Umbeðinn flokkur fannst ekki',
      });
    }

    // Fetch the questions
    const questions = await questionsFromDatabase(categoryId);
    if (!questions) {
      return res.status(500).render('error', {
        title: 'Villa kom upp',
        error: 'Villa kom upp við að sækja spurningar',
      });
    }

    // Fetch the answers for each question
    const answers = await Promise.all(questions.map(async (question) => {
      const questionAnswers = await answersFromDatabase(question.id);
      return { ...question, answers: questionAnswers };
    }));

    // Organize the data
    const questionAnswers = answers.reduce((acc, question) => {
      acc[question.id] = question.answers;
      return acc;
    }, {});

    console.log('cat:', category);
    console.log('name:', category.name);
    res.render('category', { title: category.name, questions, questionAnswers });
  } catch (e) {
    console.error('Error fetching category:', e);
    res.status(500).render('error', {
      title: 'Villa kom upp',
      error: 'Villa kom upp við að sækja flokk',
    });
  }
});

// Catch-all route
router.get('/*', (req, res) => {
  res.status(404).render('error', {
    title: 'Síða ekki fundin',
    error: 'Umbeðin síða fannst ekki',
  });
});
