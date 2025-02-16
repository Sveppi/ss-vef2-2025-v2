import express from 'express';
import { router } from './routers.js';

const app = express();

app.use(express.urlencoded({ extended: true }));

const viewsPath = new URL('./views', import.meta.url).pathname;
app.set('views', viewsPath);
app.set('view engine', 'ejs');

app.use('/', router);

const hostname = '127.0.0.1';
const port = 3000;

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
