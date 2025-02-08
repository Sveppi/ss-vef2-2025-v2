import express from 'express';
import { categoriesFromDatabase } from './lib/db.js';

export const router = express.Router();

router.get('/', async (req, res) => {
  const categories = await categoriesFromDatabase();

  console.log(categories);
  res.render('index', { title: 'Forsíða', categories });
});

router.get('/spurningar/:category', (req, res) => {
  // TEMP EKKI READY FYRIR PRODUCTION
  const title = req.params.category;
  res.render('category', { title });
});

router.get('/form', (req, res) => {
  res.send('<!doctype><html>foo....');
});
