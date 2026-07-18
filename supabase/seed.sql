-- Development seed for the Bandung MVP.
-- This file contains fictional demo places matching src/data/mockPlaces.ts.
-- It is safe to run repeatedly: rows are matched by slug.

begin;

insert into public.places (
  slug,
  name,
  category,
  price_range,
  halal_status,
  description,
  address,
  area,
  latitude,
  longitude,
  publication_status,
  is_featured
)
values
(
  'warung-senja-braga',
  'Warung Senja Braga',
  'makanan',
  'murah',
  'halal',
  'Tempat makan sederhana dengan menu berganti setiap hari. Datang lebih awal untuk menikmati lauk favorit sebelum habis.',
  'Jl. Braga Dalam No. 18',
  'Sumur Bandung',
  -6.917500,
  107.609800,
  'approved',
  true
),
(
  'kedai-rasadago',
  'Kedai Rasa Dago',
  'makanan',
  'sedang',
  'halal',
  'Kedai kecil yang menyajikan hidangan hangat dan sambal racikan sendiri. Cocok untuk makan santai setelah menjelajah Dago.',
  'Jl. Sekeloa Selatan No. 7',
  'Coblong',
  -6.887800,
  107.613200,
  'approved',
  true
),
(
  'kopi-purnama',
  'Kopi Purnama Kecil',
  'minuman',
  'sedang',
  'halal',
  'Kedai minuman mungil dengan biji kopi lokal dan pilihan teh rempah. Tempatnya terbatas, tetapi suasananya selalu akrab.',
  'Jl. Ciumbuleuit Gang 4 No. 11',
  'Cidadap',
  -6.866800,
  107.604200,
  'approved',
  false
),
(
  'seblak-sore-antapani',
  'Seblak Sore Antapani',
  'makanan',
  'murah',
  'halal',
  'Seblak dengan topping sederhana yang dimasak satu per satu. Pilihan level pedas tersedia dari santai sampai menantang.',
  'Jl. Terusan Jakarta No. 42',
  'Antapani',
  -6.910100,
  107.666100,
  'approved',
  false
),
(
  'wedang-kembang-rasa',
  'Wedang Kembang Rasa',
  'minuman',
  'murah',
  'halal',
  'Pilihan wedang dan minuman rempah dengan rasa ringan. Sering menjadi tempat singgah warga sekitar selepas magrib.',
  'Jl. Pahlawan No. 25',
  'Cibeunying Kaler',
  -6.884700,
  107.635900,
  'approved',
  false
),
(
  'dapur-kecil-cibaduyut',
  'Dapur Kecil Cibaduyut',
  'makanan',
  'mahal',
  'non_halal',
  'Dapur dengan menu peranakan dan racikan gurih yang dibuat dalam jumlah terbatas setiap harinya.',
  'Jl. Cibaduyut Raya No. 108',
  'Bojongloa Kidul',
  -6.957200,
  107.587800,
  'approved',
  false
)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  price_range = excluded.price_range,
  halal_status = excluded.halal_status,
  description = excluded.description,
  address = excluded.address,
  area = excluded.area,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  publication_status = excluded.publication_status,
  is_featured = excluded.is_featured,
  updated_at = now();

with seed_hours(slug, open_time, close_time, sunday_closed) as (
  values
    ('warung-senja-braga', time '10:00', time '21:30', true),
    ('kedai-rasadago', time '11:00', time '22:00', false),
    ('kopi-purnama', time '08:00', time '18:00', true),
    ('seblak-sore-antapani', time '15:00', time '23:00', false),
    ('wedang-kembang-rasa', time '17:00', time '23:30', false),
    ('dapur-kecil-cibaduyut', time '11:00', time '20:00', true)
)
insert into public.place_hours (
  place_id,
  day_of_week,
  is_closed,
  is_24_hours,
  open_time,
  close_time
)
select
  p.id,
  days.day_of_week::smallint,
  seed_hours.sunday_closed and days.day_of_week = 0,
  false,
  case when seed_hours.sunday_closed and days.day_of_week = 0 then null::time else seed_hours.open_time end,
  case when seed_hours.sunday_closed and days.day_of_week = 0 then null::time else seed_hours.close_time end
from seed_hours
join public.places p on p.slug = seed_hours.slug
cross join generate_series(0, 6) as days(day_of_week)
on conflict (place_id, day_of_week) do update set
  is_closed = excluded.is_closed,
  is_24_hours = excluded.is_24_hours,
  open_time = excluded.open_time,
  close_time = excluded.close_time,
  updated_at = now();

commit;
