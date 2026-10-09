-- =============================================================
-- Aroma Haus — categorias e configurações iniciais
-- Idempotente: usa ON CONFLICT (slug) DO NOTHING.
-- =============================================================

-- ---------- Categorias (o formato do produto) ----------
--
-- A vitrine é organizada por formato, não por fragrância: quem chega já sabe
-- se quer um difusor ou um sabonete, e só depois escolhe o cheiro. A
-- fragrância vira filtro, e vive em `products.fragrance`.
insert into public.categories (name, slug, type, description, position) values
  ('Difusores de Varetas', 'difusores', 'difusor',
   'Perfume contínuo, sem chama e sem tomada. As varetas puxam a essência e devolvem o cheiro no tempo do ambiente.', 1),
  ('Home Sprays', 'home-sprays', 'home_spray',
   'O borrifo que muda a sala em um segundo. Para antes das visitas, depois de cozinhar, ou só porque sim.', 2),
  ('Sabonetes Líquidos', 'sabonetes-liquidos', 'sabonete',
   'Frasco de cerâmica com rosas em relevo, para ficar à vista no lavabo. Fórmula suave, com glicerina.', 3),
  ('Refis', 'refis', 'refil',
   'Recarregue o difusor que já é seu. Mesmo perfume, menos vidro, menos preço.', 4),
  ('Kits & Presentes', 'kits-presentes', 'kit',
   'Combinações prontas para presentear — ou para começar a perfumar a casa de uma vez só.', 5)
on conflict (slug) do nothing;

-- ---------- Configurações ----------
insert into public.settings (key, value) values
  ('store', jsonb_build_object(
     'name', 'Aroma Haus',
     'email', 'contato@aromahaus.com.br',
     'whatsapp', '',
     'instagram', 'aromahaus'
   )),
  ('shipping', jsonb_build_object('free_shipping_threshold', 299, 'from_cep', '')),
  ('banners', '[]'::jsonb)
on conflict (key) do nothing;
