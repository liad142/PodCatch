-- Add images column to admin_todos (array of image URLs)
alter table admin_todos add column images text[] not null default '{}';
