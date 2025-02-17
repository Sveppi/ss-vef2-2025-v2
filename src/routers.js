import express from 'express';
import xss from 'xss';
import {
  categoriesFromDatabase,
  questionsFromDatabase,
  answersFromDatabase,
  categoryFromDatabase,
  getLatestQuestionId,
  getLatestAnswerId,
  query,
} from './lib/db.js';
import { Database } from './lib/db.client.js';
import { environment } from './lib/environment.js';
import { logger } from './lib/logger.js';
import { validateQuestionForm } from './lib/validate.js';

export const router = express.Router();

// index
router.get('/', async (req, res) => {
  try {
    const categories = await categoriesFromDatabase();
    console.log('categories:', categories);
    if (categories.length === 0) {
      return res.status(500).render('error', {
        error: '500: Villa kom upp við að sækja flokka',
      });
    }
    res.render('index', { title: 'Forsíða', categories });
  } catch (e) {
    console.error('Error fetching categories:', e);
    res.status(500).render('error', {
      error: '500: Villa kom upp við að sækja flokka',
    });
  }
});

// bæta við nýjum flokki
router.get('/form-category', (req, res) => {
  res.render('form-category', { title: 'Bæta við flokk' });
});

router.post('/form-category', async (req, res) => {
  const name = xss(req.body.name);
  console.log(name);

  // validation fyrir nafn á flokk
  // what if too long
  if (name.length > 64) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      error: 'Nafn á flokk má ekki vera lengra en 64 stafir',
    });
    return;
  }
  // what if empty
  if (!name || name.length === 0) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      error: 'Nafn á flokk má ekki vera tómt',
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
    (category) => category.name.toLowerCase() === name.toLowerCase(),
  );
  if (categoryExists) {
    res.render('error', {
      title: 'Villa að bæta við flokk',
      error: 'Flokkur með þessu nafni er nú þegar til',
    });
    return;
  }

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
router.get('/form-question', async (req, res) => {
  const categories = await categoriesFromDatabase();
  res.render('form-question', { title: 'Bæta við spurningu', categories });
});

router.post('/form-question', async (req, res) => {
  const sanitizedData = {
    category: xss(req.body.category),
    question: xss(req.body.question),
    answer1: xss(req.body.answer1),
    answer2: xss(req.body.answer2),
    answer3: xss(req.body.answer3),
    answer4: xss(req.body.answer4),
    answer_correct: xss(req.body.answer_correct),
  };

  const questions = await questionsFromDatabase(sanitizedData.category);
  const validationError = validateQuestionForm(sanitizedData, questions);

  if (validationError) {
    return res.render('error', {
      title: 'Villa að bæta við spurningu',
      error: validationError,
    });
  }

  const {
    category,
    question,
    answer1,
    answer2,
    answer3,
    answer4,
    answer_correct,
  } = sanitizedData;

  try {
    const latestQuestionId = await getLatestQuestionId();
    const latestAnswerId = await getLatestAnswerId();
    console.log('latestQuestionId:', latestQuestionId);
    console.log('latestAnswerId:', latestAnswerId);

    // Insert the question
    const newQuestion = await query(
      'INSERT INTO questions (id, category_id, question) VALUES ($1, $2, $3) RETURNING id',
      [latestQuestionId + 1, category, question],
    );
    const questionId = newQuestion.rows[0].id;

    // Insert the answers
    await query(
      'INSERT INTO answers (id, question_id, answer, correct) VALUES ($1, $2, $3, $4)',
      [latestAnswerId + 1, questionId, answer1, answer_correct === '1'],
    );
    await query(
      'INSERT INTO answers (id, question_id, answer, correct) VALUES ($1, $2, $3, $4)',
      [latestAnswerId + 2, questionId, answer2, answer_correct === '2'],
    );
    await query(
      'INSERT INTO answers (id, question_id, answer, correct) VALUES ($1, $2, $3, $4)',
      [latestAnswerId + 3, questionId, answer3, answer_correct === '3'],
    );
    await query(
      'INSERT INTO answers (id, question_id, answer, correct) VALUES ($1, $2, $3, $4)',
      [latestAnswerId + 4, questionId, answer4, answer_correct === '4'],
    );

    res.render('form-created', { title: 'Spurningu bætt við' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving form data');
  }
});

// spurningasíða
router.get('/spurningar/:category', async (req, res) => {
  const categoryId = req.params.category;

  try {
    // Fetch the category name
    const category = await categoryFromDatabase(categoryId);
    if (!category) {
      return res.status(404).render('error', {
        title: 'Flokkur ekki fundinn',
        error: '404: Umbeðinn flokkur fannst ekki',
      });
    }

    // Fetch the questions
    const questions = await questionsFromDatabase(categoryId);
    if (!questions) {
      return res.status(500).render('error', {
        title: 'Villa kom upp',
        error: '500: Villa kom upp við að sækja spurningar',
      });
    }

    // Fetch the answers for each question
    const answers = await Promise.all(
      questions.map(async (question) => {
        const questionAnswers = await answersFromDatabase(question.id);
        return { ...question, answers: questionAnswers };
      }),
    );

    // Organize the data
    const questionAnswers = answers.reduce((acc, question) => {
      acc[question.id] = question.answers;
      return acc;
    }, {});

    console.log('cat:', category);
    console.log('name:', category.name);
    res.render('category', {
      title: category.name,
      questions,
      questionAnswers,
    });
  } catch (e) {
    console.error('Error fetching category:', e);
    res.status(500).render('error', {
      title: 'Villa kom upp',
      error: '500: Villa kom upp við að sækja flokk',
    });
  }
});

// Catch-all route
router.get('/*', (req, res) => {
  res.status(404).render('error', {
    title: 'Síða ekki fundin',
    error: '404: Umbeðin síða fannst ekki',
  });
});
