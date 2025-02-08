CREATE TABLE IF NOT EXISTS public.categories (
  id serial primary key,
  name varchar(64) not null unique,
  created timestamp with time zone not null default current_timestamp
);
