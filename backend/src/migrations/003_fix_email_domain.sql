-- Migrasi: Ganti domain email lama @alfakhirschool.id → @alfakhirschool.sch.id
UPDATE users
SET email = REPLACE(email, '@alfakhirschool.id', '@alfakhirschool.sch.id')
WHERE email LIKE '%@alfakhirschool.id'
  AND email NOT LIKE '%@alfakhirschool.sch.id';
