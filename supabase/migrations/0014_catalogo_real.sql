-- ================================================================
-- 0014 — Catálogo real da Aroma Haus
--
-- A vitrine de demonstração (0011) tinha oito fragrâncias em cada formato.
-- A linha de verdade é menor: um produto por formato, com os preços de
-- venda definidos pela cliente.
--
--   Sabonete Líquido 250 ml ........ R$ 220
--   Difusor de Varetas 250 ml ...... R$ 260
--   Home Spray 250 ml .............. R$ 240
--   Difusor de Porcelana 500 ml .... R$ 580
--   Refil de Difusor 250 ml ........ R$ 150
--
-- O difusor de porcelana (flor no lugar das varetas) ganha categoria própria.
-- Os produtos de demonstração e os kits não são apagados: ficam inativos e
-- voltam em Admin → Produtos se for o caso.
--
-- Idempotente.
-- ================================================================

-- ----------------------------------------------------------------
-- Categoria do difusor de porcelana, logo depois dos de varetas
-- ----------------------------------------------------------------
insert into public.categories (name, slug, type, description, position)
values ('Difusor de Porcelana', 'difusores-porcelana', 'difusor',
        'Flor de porcelana no lugar das varetas: a essência sobe pelas pétalas.', 2)
on conflict (slug) do nothing;

update public.categories set position = 3 where slug = 'home-sprays';
update public.categories set position = 4 where slug = 'sabonetes-liquidos';
update public.categories set position = 5 where slug = 'refis';
update public.categories set position = 6, is_active = false where slug = 'kits-presentes';

-- ----------------------------------------------------------------
-- Um produto por formato. Aproveita a linha de demonstração que tinha mais
-- avaliações, para as notas continuarem aparecendo.
-- ----------------------------------------------------------------
update public.products p set
  slug = v.novo_slug, name = v.nome, sku = v.sku, price = v.preco,
  compare_at_price = null, volume_ml = 250, featured = v.destaque,
  fragrance = null, olfactory_family = null,
  notes_top = '{}', notes_heart = '{}', notes_base = '{}',
  description = v.descricao, seo_title = v.nome, seo_description = left(v.descricao, 150),
  is_active = true
from (values
  ('difusor-ambar-haus', 'difusor-de-varetas', 'Difusor de Varetas 250 ml', 'AH-DIF-250', 260.00::numeric, true,
   'Difusor de varetas em frasco de vidro, com tampa dourada e laço de cetim. Perfuma de forma contínua, sem chama e sem tomada: a intensidade se regula no número de varetas, então comece com cinco e vá somando. Vire as varetas uma vez por semana para reavivar o perfume.'),
  ('home-spray-flor-de-figo', 'home-spray', 'Home Spray 250 ml', 'AH-SPR-250', 240.00::numeric, false,
   'Home spray em frasco de cerâmica branca com rosas em relevo e válvula cromada, feito para ficar à vista e não guardado no armário. Borrife a um palmo de distância, de preferência em cortinas e almofadas: é no tecido que o perfume se segura por mais tempo.'),
  ('sabonete-rosa-palida', 'sabonete-liquido', 'Sabonete Líquido 250 ml', 'AH-SAB-250', 220.00::numeric, false,
   'Sabonete líquido em frasco de cerâmica branca com rosas em relevo e válvula pump. Fórmula suave com glicerina vegetal, que limpa sem repuxar e deixa o perfume nas mãos depois do enxágue.'),
  ('refil-ambar-haus', 'refil-difusor', 'Refil de Difusor 250 ml', 'AH-REF-250', 150.00::numeric, false,
   'Refil de 250 ml para o seu difusor Aroma Haus. Mesma essência, menos vidro e menos preço: esvazie o frasco, complete com o refil e troque as varetas por um jogo novo.')
) as v(slug_antigo, novo_slug, nome, sku, preco, destaque, descricao)
where p.slug = v.slug_antigo;

-- O difusor de varetas passa a ter um tamanho só (o de 500 ml é o de porcelana).
update public.product_variants pv set is_active = false
from public.products p
where p.id = pv.product_id and p.slug = 'difusor-de-varetas';

insert into public.products (
  category_id, name, slug, description, sku, price, stock,
  weight_g, width_cm, height_cm, length_cm, images, featured, volume_ml,
  seo_title, seo_description
)
select c.id, 'Difusor de Porcelana 500 ml', 'difusor-porcelana',
  'Difusor de 500 ml em frasco de vidro quadrado, com uma flor de porcelana no lugar das varetas: a essência sobe pelas pétalas e perfuma o ambiente de forma contínua, sem chama e sem tomada. Acabamento com laço de cetim e detalhe dourado. É peça de decoração tanto quanto de perfume.',
  'AH-DIF-PORC-500', 580.00, 10, 1300, 12.0, 30.0, 12.0,
  array['/produtos/difusor-porcelana.webp'], true, 500,
  'Difusor de Porcelana 500 ml',
  'Difusor de 500 ml com flor de porcelana no lugar das varetas: a essência sobe pelas pétalas e perfuma o ambiente, sem chama e sem tomada.'
from public.categories c
where c.slug = 'difusores-porcelana'
on conflict (slug) do nothing;

-- Todo o resto da demonstração sai da vitrine.
update public.products set is_active = false
where slug not in ('difusor-de-varetas', 'difusor-porcelana', 'home-spray', 'sabonete-liquido', 'refil-difusor');
