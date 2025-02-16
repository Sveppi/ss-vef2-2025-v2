CREATE TABLE IF NOT EXISTS public.categories (
  id serial primary key,
  name varchar(64) not null unique,
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE IF NOT EXISTS public.questions (
  id serial primary key,
  category_id integer not null references categories(id),
  question varchar(512) not null,
  created timestamp with time zone not null default current_timestamp
);

CREATE TABLE IF NOT EXISTS public.answers (
  id serial primary key,
  question_id integer not null references questions(id),
  answer varchar(512) not null,
  correct boolean not null,
  created timestamp with time zone not null default current_timestamp
);
