import express from 'express';
import { router } from './routers.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const app = express();

app.use(express.urlencoded({ extended: true }));

const viewsPath = new URL('./views', import.meta.url).pathname;
const path = dirname(fileURLToPath(import.meta.url));
app.set('views', viewsPath);
app.set('view engine', 'ejs');

app.use('/', router);
app.use(express.static(join(path, '../public')));

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


