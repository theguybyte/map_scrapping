-- Canonical categories taxonomy

create table if not exists public.categories (
  slug       text primary key,
  label_es   text not null,
  source_aliases jsonb not null default '[]'
);

alter table public.categories enable row level security;

drop policy if exists "auth read categories" on public.categories;
create policy "auth read categories" on public.categories
  for select using (auth.role() = 'authenticated');

-- Seed canonical categories for Argentine businesses
insert into public.categories (slug, label_es, source_aliases) values
  ('restaurant',      'Restaurante',                  '["Restaurante","Restaurant","Restaurantes","Restaurante de comida","Parrilla","Parrillada","Asador"]'),
  ('bar',             'Bar / Pub',                    '["Bar","Bares","Pub","Cervecería","Bar de tapas","Bar nocturno"]'),
  ('cafe',            'Café / Cafetería',             '["Café","Cafetería","Cafeteria","Coffee shop","Café bar"]'),
  ('bakery',          'Panadería / Confitería',       '["Panadería","Panaderia","Panadería artesanal","Confitería","Confiteria","Pastelería"]'),
  ('supermarket',     'Supermercado / Almacén',       '["Supermercado","Almacén","Almacen","Autoservicio","Minimarket","Verdulería","Verduleria","Dietética"]'),
  ('pharmacy',        'Farmacia',                     '["Farmacia","Droguería","Farmacia y perfumería","Farmacia de turno"]'),
  ('hospital',        'Hospital / Clínica',           '["Hospital","Clínica","Clinica","Sanatorio","Policlínico","Policlinico","Centro médico","Centro de salud"]'),
  ('gym',             'Gimnasio / Fitness',           '["Gimnasio","Gym","Fitness","Crossfit","Box de crossfit","Musculación"]'),
  ('beauty_salon',    'Estética / Spa',               '["Salón de belleza","Salon de belleza","Estética","Estetica","Spa","Centro estético","Peluquería femenina"]'),
  ('hair_salon',      'Peluquería / Barbería',        '["Peluquería","Peluqueria","Barbería","Barberia","Barber shop","Corte de cabello"]'),
  ('car_repair',      'Taller mecánico',              '["Taller mecánico","Taller mecanico","Taller automotor","Mecánico","Mecanico","Mecánica del automotor","Taller de autos","Gomería","Gomeria","Electricidad del automotor"]'),
  ('car_dealer',      'Concesionaria de autos',       '["Concesionaria","Concesionario","Agencia de autos","Venta de autos","Agencia de vehículos"]'),
  ('hotel',           'Hotel / Alojamiento',          '["Hotel","Motel","Apart hotel","Apart-hotel","Alojamiento","Posada","Hostería","Hostel","Residencial"]'),
  ('real_estate',     'Inmobiliaria',                 '["Inmobiliaria","Inmobiliario","Agencia inmobiliaria","Bienes raíces","Bienes raices"]'),
  ('dentist',         'Odontología',                  '["Odontología","Odontologia","Odontólogo","Odontologo","Clínica dental","Clinica dental","Consultorio odontológico","Dentista"]'),
  ('doctor',          'Médico / Consultorio',         '["Médico","Medico","Consultorio médico","Consultorio","Médico general","Clínica médica"]'),
  ('veterinarian',    'Veterinaria',                  '["Veterinaria","Veterinario","Clínica veterinaria","Pet shop","Veterinaria y pet shop","Veterinaria y Pet shop"]'),
  ('school',          'Escuela / Instituto',          '["Escuela","Colegio","Instituto educativo","Instituto","Jardín de infantes","Jardin de infantes","Jardín maternal","Centro educativo"]'),
  ('clothing_store',  'Tienda de ropa',               '["Tienda de ropa","Ropa","Indumentaria","Boutique","Moda","Local de ropa"]'),
  ('electronics',     'Electrónica / Tecnología',     '["Electrónica","Electronica","Tecnología","Tecnologia","Computadoras","Celulares","Telefonía","Telefonia"]'),
  ('hardware_store',  'Ferretería / Corralón',        '["Ferretería","Ferreteria","Corralón","Corralon","Materiales de construcción","Materiales de construccion","Pinturería"]'),
  ('travel_agency',   'Agencia de viajes',            '["Agencia de viajes","Turismo","Tour operador","Agencia de turismo"]'),
  ('bank',            'Banco / Finanzas',             '["Banco","Entidad bancaria","Caja de crédito","Caja de credito","Financiera","Casa de cambio"]'),
  ('gas_station',     'Estación de servicio',         '["Estación de servicio","Estacion de servicio","Gasolinera","YPF","Shell","Axion","Puma","Estación YPF"]'),
  ('florist',         'Florería',                     '["Florería","Floreria","Flores","Floricultura","Jardín","Vivero"]'),
  ('yoga',            'Yoga / Pilates',               '["Yoga","Pilates","Centro de yoga","Estudio de pilates","Studio de yoga"]'),
  ('lawyer',          'Estudio jurídico',             '["Estudio jurídico","Estudio juridico","Abogado","Abogados","Asesoría legal","Asesoria legal","Escribanía","Escribania"]'),
  ('accountant',      'Contador / Estudio contable',  '["Contador","Estudio contable","Asesoría impositiva","Asesoria impositiva","Contaduría","Contaduria","Asesor impositivo"]'),
  ('photography',     'Fotografía / Estudio',         '["Fotografía","Fotografia","Fotógrafo","Fotografo","Estudio fotográfico","Estudio fotografico"]'),
  ('construction',    'Construcción / Reformas',      '["Construcción","Construccion","Reformas","Empresa constructora","Albañilería","Albanileria","Arquitectura"]'),
  ('other',           'Otro',                         '[]')
on conflict (slug) do nothing;

-- Add category_id FK to leads (keeps raw category text for audit)
alter table public.leads
  add column if not exists category_id text references public.categories(slug);

create index if not exists leads_category_id_idx on public.leads (category_id);

-- Backfill existing rows: exact and case-insensitive alias match
update public.leads l
set category_id = c.slug
from public.categories c
where l.category_id is null
  and l.category is not null
  and exists (
    select 1
    from jsonb_array_elements_text(c.source_aliases) alias
    where lower(alias) = lower(l.category)
  );
