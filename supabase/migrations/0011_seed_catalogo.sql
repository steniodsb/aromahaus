-- ================================================================
-- 0011 — Catálogo de demonstração da Aroma Haus
--
-- Oito fragrâncias autorais em quatro formatos, mais três kits. É conteúdo
-- de vitrine: serve para a loja nascer navegável e apresentável, e para o
-- painel ter o que mostrar. Tudo é editável em Admin → Produtos; apagar daqui
-- não quebra nada.
--
-- As imagens vivem em /public/produtos e /public/home. Quando chegarem as
-- fotos de estúdio, basta subir pelo painel: o campo aceita URL do Storage.
--
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ================================================================

-- ----------------------------------------------------------------
-- Produtos: fragrância × formato
-- ----------------------------------------------------------------
with f(slug, nome, familia, topo, corpo, fundo, intensidade, ambientes, descricao, pos) as (
  values
    ('linho-branco', 'Linho Branco', 'Fresco',
     array['Bergamota','Pera'], array['Algodão','Lírio-branco'], array['Almíscar branco','Cedro'],
     2, array['quarto','closet','banheiro'],
     'O cheiro de roupa de cama limpa secando no sol. Almíscar branco e algodão sobre um fundo de cedro, discreto o bastante para ficar ligado o dia inteiro sem cansar.', 1),

    ('flor-de-figo', 'Flor de Figo', 'Verde',
     array['Figo verde','Limão-siciliano'], array['Folha de figueira','Jasmim'], array['Leite de coco','Sândalo'],
     3, array['sala','cozinha'],
     'A folha da figueira amassada entre os dedos: verde, leitosa e um pouco amarga. Fecha em coco e sândalo, e deixa a casa com ar de fim de tarde no litoral.', 2),

    ('ambar-haus', 'Âmbar Haus', 'Âmbar',
     array['Pimenta rosa','Bergamota'], array['Âmbar','Incenso'], array['Baunilha bourbon','Patchouli'],
     4, array['sala','escritorio'],
     'A fragrância da casa. Âmbar, incenso e baunilha bourbon abertos por pimenta rosa: quente, envolvente e levemente defumada, feita para a sala no inverno.', 3),

    ('rosa-palida', 'Rosa Pálida', 'Floral',
     array['Lichia','Pêssego'], array['Rosa damascena','Peônia'], array['Almíscar','Madeira clara'],
     3, array['quarto','banheiro'],
     'Rosa damascena e peônia abertas por lichia e pêssego, sem nenhum traço adocicado. É a mesma rosa que está em relevo na cerâmica dos nossos frascos.', 4),

    ('couro-e-vetiver', 'Couro & Vetiver', 'Amadeirado',
     array['Cardamomo','Zimbro'], array['Couro','Íris'], array['Vetiver','Musgo de carvalho'],
     5, array['escritorio','sala'],
     'Couro macio, íris e vetiver, com cardamomo na abertura. A fragrância mais marcante da casa, pensada para escritórios, halls e entradas de pé-direito alto.', 5),

    ('cha-branco-e-pera', 'Chá Branco & Pera', 'Cítrico',
     array['Pera williams','Bergamota'], array['Chá branco','Frésia'], array['Almíscar','Âmbar claro'],
     2, array['banheiro','quarto'],
     'Pera williams e chá branco, leves e transparentes. Limpa o ar sem ocupar espaço: é a escolha certa para banheiros, lavabos e ambientes pequenos.', 6),

    ('lavanda-de-provence', 'Lavanda de Provence', 'Herbal',
     array['Lavandin','Limão'], array['Lavanda','Sálvia'], array['Fava tonka','Cedro'],
     3, array['quarto','banheiro'],
     'Lavanda verdadeira, com sálvia e um fundo de fava tonka que tira o lado medicinal. Herbácea e calma, feita para o quarto e para a hora de desacelerar.', 7),

    ('baunilha-e-sandalo', 'Baunilha & Sândalo', 'Gourmand',
     array['Amêndoa','Bergamota'], array['Baunilha de Madagascar','Heliotrópio'], array['Sândalo','Benjoim'],
     4, array['sala','quarto'],
     'Baunilha de Madagascar e sândalo cremoso, com amêndoa na abertura. Doce sem ser enjoativa: é o cheiro de casa cheia, de domingo que não acaba.', 8)
),
fmt(chave, cat_slug, rotulo, prefixo, sku_fmt, preco, volume, peso, larg, alt, comp, imagens, texto) as (
  values
    ('difusor', 'difusores', 'Difusor de Varetas', 'difusor', 'DIF',
     189.90::numeric, null::int, 700, 10.0::numeric, 24.0::numeric, 10.0::numeric,
     array['/produtos/difusor-vidro.webp','/produtos/difusor-ceramico.webp'],
     'Difusor de varetas em frasco de vidro, com tampa dourada e laço de cetim. Perfuma de forma contínua, sem chama e sem tomada: a intensidade se regula no número de varetas, então comece com cinco e vá somando. Vire as varetas uma vez por semana para reavivar o perfume.'),

    ('home-spray', 'home-sprays', 'Home Spray', 'home-spray', 'SPR',
     139.90::numeric, 250::int, 650, 9.0::numeric, 20.0::numeric, 9.0::numeric,
     array['/produtos/home-spray.webp'],
     'Home spray em frasco de cerâmica branca com rosas em relevo e válvula cromada, feito para ficar à vista e não guardado no armário. Borrife a um palmo de distância, de preferência em cortinas e almofadas: é no tecido que o perfume se segura por mais tempo.'),

    ('sabonete', 'sabonetes-liquidos', 'Sabonete Líquido', 'sabonete', 'SAB',
     119.90::numeric, 250::int, 700, 9.0::numeric, 20.0::numeric, 9.0::numeric,
     array['/produtos/sabonete-liquido.webp'],
     'Sabonete líquido em frasco de cerâmica branca com rosas em relevo e válvula pump. Fórmula suave com glicerina vegetal, que limpa sem repuxar e deixa o perfume nas mãos depois do enxágue.'),

    ('refil', 'refis', 'Refil de Difusor', 'refil', 'REF',
     109.90::numeric, 250::int, 400, 7.0::numeric, 16.0::numeric, 7.0::numeric,
     array['/produtos/refil.webp'],
     'Refil de 250 ml para o seu difusor Aroma Haus. Mesma essência, menos vidro e menos preço: esvazie o frasco, complete com o refil e troque as varetas por um jogo novo.')
)
insert into public.products (
  category_id, name, slug, description, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, images, featured,
  fragrance, olfactory_family, notes_top, notes_heart, notes_base, intensity, rooms, volume_ml,
  seo_title, seo_description
)
select
  c.id,
  fmt.rotulo || ' — ' || f.nome,
  fmt.prefixo || '-' || f.slug,
  fmt.texto || E'\n\n' || f.descricao,
  'AH-' || fmt.sku_fmt || '-' || upper(left(replace(f.slug, '-', ''), 6)),
  fmt.preco,
  -- Promoção em duas fragrâncias, para a vitrine ter o que marcar.
  case when f.pos in (2, 6) then round(fmt.preco * 1.22, 2) end,
  18 + ((f.pos * 7) % 23),
  fmt.peso, fmt.larg, fmt.alt, fmt.comp,
  fmt.imagens,
  (fmt.chave = 'difusor' and f.pos in (1, 3, 5))
    or (fmt.chave = 'home-spray' and f.pos in (2, 6)),
  f.nome, f.familia, f.topo, f.corpo, f.fundo, f.intensidade::smallint, f.ambientes, fmt.volume,
  fmt.rotulo || ' ' || f.nome,
  left(f.descricao, 150)
from f
cross join fmt
join public.categories c on c.slug = fmt.cat_slug
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Variantes de tamanho — só os difusores têm duas medidas
-- ----------------------------------------------------------------
insert into public.product_variants (
  product_id, label, volume_ml, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, position
)
select p.id, v.label, v.volume, p.sku || '-' || v.volume, v.preco,
       case when p.compare_at_price is not null then round(v.preco * 1.22, 2) end,
       v.estoque, v.peso, v.larg, v.alt, v.comp, v.pos
from public.products p
join public.categories c on c.id = p.category_id and c.slug = 'difusores'
cross join (values
  ('250 ml', 250, 189.90::numeric, 16, 700, 10.0::numeric, 24.0::numeric, 10.0::numeric, 1),
  ('500 ml', 500, 279.90::numeric,  9, 1200, 12.0::numeric, 28.0::numeric, 12.0::numeric, 2)
) as v(label, volume, preco, estoque, peso, larg, alt, comp, pos)
where not exists (
  select 1 from public.product_variants pv where pv.product_id = p.id and pv.label = v.label
);

-- ----------------------------------------------------------------
-- Kits
-- ----------------------------------------------------------------
insert into public.products (
  category_id, name, slug, description, sku, price, compare_at_price, stock,
  weight_g, width_cm, height_cm, length_cm, images, featured,
  fragrance, olfactory_family, intensity, rooms,
  seo_title, seo_description
)
select c.id, k.nome, k.slug, k.descricao, k.sku, k.preco, k.de, k.estoque,
       k.peso, 25.0, 30.0, 18.0, k.imagens, true,
       k.fragrancia, k.familia, k.intensidade::smallint, k.ambientes,
       k.nome, left(k.descricao, 150)
from (values
  ('Kit Boas-Vindas — Âmbar Haus', 'kit-boas-vindas-ambar-haus',
   'O difusor de 250 ml e o home spray da mesma fragrância, na caixa de presente da casa. O difusor cuida do perfume de fundo, que fica; o spray resolve o antes das visitas. Acompanha cartão em papel algodão para a sua mensagem.',
   'AH-KIT-AMBAR', 299.90::numeric, 329.80::numeric, 12, 1400,
   array['/produtos/difusor-vidro.webp','/produtos/home-spray.webp'],
   'Âmbar Haus', 'Âmbar', 4, array['sala','escritorio']),

  ('Kit Lavabo — Rosa Pálida', 'kit-lavabo-rosa-palida',
   'Sabonete líquido e home spray em cerâmica branca com rosas em relevo, para o lavabo inteiro falar a mesma língua. É o kit que mais sai como presente de casa nova.',
   'AH-KIT-ROSA', 239.90::numeric, 259.80::numeric, 15, 1450,
   array['/produtos/sabonete-liquido.webp','/produtos/home-spray.webp'],
   'Rosa Pálida', 'Floral', 3, array['banheiro']),

  ('Kit Presente Haus — Couro & Vetiver', 'kit-presente-haus-couro-vetiver',
   'O difusor de 500 ml com um refil de 250 ml, para quem não quer pensar nisso de novo tão cedo. Mais de um ano de perfume na mesma fragrância, na caixa de presente da casa.',
   'AH-KIT-COURO', 369.90::numeric, 389.80::numeric, 8, 1700,
   array['/produtos/difusor-vidro.webp','/produtos/refil.webp'],
   'Couro & Vetiver', 'Amadeirado', 5, array['escritorio','sala'])
) as k(nome, slug, descricao, sku, preco, de, estoque, peso, imagens, fragrancia, familia, intensidade, ambientes)
join public.categories c on c.slug = 'kits-presentes'
on conflict (slug) do nothing;

-- ----------------------------------------------------------------
-- Cupom de primeira compra
--
-- A barra de vantagens da home anuncia PRIMEIRAHAUS em toda página. Sem o
-- registro aqui, o cliente digitava o código no checkout e recebia "cupom
-- inválido" — a loja prometendo na capa o que não entrega no caixa.
--
-- `first_order_only` é checado em `lib/coupons.ts` contra os pedidos pagos
-- do e-mail, então ele não vira desconto permanente.
-- ----------------------------------------------------------------
insert into public.coupons (
  code, description, type, value, max_discount,
  min_subtotal, first_order_only, max_uses_per_customer, is_active
) values (
  'PRIMEIRAHAUS',
  '5% de desconto na primeira compra',
  'percent', 5, 60,
  0, true, 1, true
)
on conflict do nothing;

-- ----------------------------------------------------------------
-- Avaliações de demonstração
--
-- Sem nota nenhuma a vitrine fica com o espaço das estrelas vazio e parece
-- quebrada. Ficam como `approved` e sem `user_id` — são conteúdo de exemplo,
-- não compras reais; apagar em Admin → Avaliações quando chegarem as de verdade.
-- ----------------------------------------------------------------
insert into public.reviews (product_id, author_name, rating, title, body, verified_purchase, status, created_at)
select p.id, r.autor, r.nota, r.titulo, r.texto, r.verificada, 'approved', now() - (r.dias || ' days')::interval
from (values
  ('difusor-ambar-haus', 'Marina C.', 5, 'Virou o cheiro da nossa casa',
   'Comprei para a sala e em dois dias a casa inteira estava com esse cheiro. Quente, sem ser doce demais. Já é o segundo frasco.', true, 6),
  ('difusor-ambar-haus', 'Rodrigo P.', 4, 'Ótimo, mas forte',
   'Fragrância linda. Só recomendo começar com quatro varetas em ambiente pequeno, com as oito que vêm na caixa fica intenso demais.', true, 19),
  ('difusor-rosa-palida', 'Helena M.', 5, 'Delicado de verdade',
   'Tinha medo de ser aquela rosa de sabonete antigo e não é nada disso. Fica fresco, limpo. O frasco é lindo no quarto.', true, 11),
  ('difusor-linho-branco', 'Camila A.', 5, 'Exatamente o que eu procurava',
   'Cheiro de lençol limpo, sem enjoar. Deixo no closet e abro a porta só para sentir.', true, 27),
  ('home-spray-flor-de-figo', 'Patrícia L.', 5, 'O preferido da casa',
   'Uso depois de cozinhar e resolve na hora. O vidro de cerâmica é muito bonito, fica na bancada.', true, 9),
  ('home-spray-cha-branco-e-pera', 'Juliana R.', 4, 'Leve e discreto',
   'Perfeito para o lavabo. Some um pouco rápido no ar, mas em toalha e cortina segura bem.', false, 15),
  ('sabonete-rosa-palida', 'Ana Beatriz', 5, 'As visitas sempre perguntam',
   'O frasco é uma peça de decoração. E o sabonete não resseca as mãos, que era o meu medo.', true, 22),
  ('sabonete-linho-branco', 'Fernanda T.', 5, 'Já comprei de novo',
   'Rende muito mais do que eu esperava e o cheiro fica nas mãos sem brigar com o perfume.', true, 34),
  ('refil-ambar-haus', 'Thiago M.', 5, 'Economia que vale',
   'Mesmo perfume do frasco original por bem menos. Chegou bem embalado, sem vazar nada.', true, 8),
  ('difusor-couro-e-vetiver', 'Gustavo F.', 5, 'Para o escritório, perfeito',
   'Amadeirado e seco, nada de doce. Clientes elogiam assim que entram na sala.', true, 13),
  ('kit-lavabo-rosa-palida', 'Letícia N.', 5, 'Presente certeiro',
   'Dei para a minha sogra na casa nova. A embalagem já vem pronta para presente, não precisei fazer nada.', true, 5)
) as r(prod, autor, nota, titulo, texto, verificada, dias)
join public.products p on p.slug = r.prod
where not exists (
  select 1 from public.reviews x where x.product_id = p.id and x.author_name = r.autor
);

-- ----------------------------------------------------------------
-- Blog — três pautas que respondem o que o cliente pergunta antes de comprar
-- ----------------------------------------------------------------
insert into public.blog_posts (title, slug, excerpt, content, cover_url, author, tags, status, published_at, seo_title, seo_description)
select b.titulo, b.slug, b.resumo, b.conteudo, b.capa, 'Aroma Haus', b.tags, 'published',
       now() - (b.dias || ' days')::interval, b.seo_t, b.seo_d
from (values
  ('Quantas varetas usar no difusor (e por que isso muda tudo)',
   'quantas-varetas-usar-no-difusor',
   'A mesma fragrância pode ser discreta ou invasiva dependendo de um detalhe que quase ninguém ajusta: o número de varetas.',
   E'# Quantas varetas usar no difusor\n\nO difusor não tem botão de volume — mas tem. Cada vareta é um canal: quanto mais varetas, mais essência sobe e mais rápido o frasco acaba.\n\n## A regra do ambiente\n\n- **Lavabo e banheiro (até 4 m²):** 3 a 4 varetas.\n- **Quarto (10 a 15 m²):** 5 a 6 varetas.\n- **Sala (20 m² ou mais):** 7 a 8 varetas.\n- **Pé-direito alto ou ambiente integrado:** 8 varetas e, se precisar, um segundo frasco em outro ponto.\n\n## Vire as varetas, mas não todo dia\n\nVirar reaviva o perfume porque traz para cima a parte já embebida. Uma vez por semana basta. Virar todo dia só faz o frasco acabar antes.\n\n## Onde colocar\n\nLonge de janela aberta, ventilador e ar-condicionado: a corrente de ar leva o perfume embora em vez de espalhar. Um aparador no meio da parede funciona melhor do que o peitoril.\n\n## Quanto tempo dura\n\nUm frasco de 250 ml com 5 varetas dura de 3 a 5 meses. Com 8 varetas, de 2 a 3. Quando acabar, use um refil: o frasco e as varetas novas fazem o resto.',
   '/blog/quantas-varetas.webp', array['difusor','como usar','perfumaria de ambiente'], 4,
   'Quantas varetas usar no difusor de ambiente',
   'Guia rápido por metragem: quantas varetas usar no difusor em lavabo, quarto e sala, de quanto em quanto tempo virar e quanto tempo o frasco dura.'),

  ('Como escolher a fragrância certa para cada cômodo',
   'fragrancia-certa-para-cada-comodo',
   'Cozinha, quarto e lavabo pedem famílias olfativas diferentes. Um mapa curto para não errar a compra.',
   E'# Uma fragrância para cada cômodo\n\nPerfumar a casa inteira com o mesmo cheiro raramente funciona. Cada ambiente tem uma função, e o perfume precisa acompanhar.\n\n## Quarto: fresco ou herbal\n\nO quarto pede fragrância que não disputa atenção na hora de dormir. **Linho Branco** e **Lavanda de Provence** cumprem esse papel — almíscar branco e lavanda baixam o ritmo em vez de acelerar.\n\n## Sala: âmbar ou amadeirado\n\nÉ o ambiente onde se recebe, e onde a fragrância pode ser a primeira coisa que a visita percebe. **Âmbar Haus** e **Baunilha & Sândalo** preenchem o espaço sem ficar enjoativos.\n\n## Lavabo e banheiro: cítrico\n\nEspaço pequeno satura rápido. Fragrância leve e transparente, como **Chá Branco & Pera**, limpa o ar sem pesar. Aqui o home spray costuma render mais do que o difusor.\n\n## Cozinha: verde\n\nContra cheiro de comida, o que funciona é verde e cítrico, não doce. **Flor de Figo** é a escolha da casa.\n\n## Escritório: amadeirado seco\n\n**Couro & Vetiver** mantém o ambiente sóbrio. Evite gourmand em sala de trabalho: doce em excesso cansa em jornada longa.',
   '/blog/cada-comodo.webp', array['fragrâncias','guia de compra','decoração'], 12,
   'Qual fragrância usar em cada cômodo da casa',
   'Qual família olfativa combina com quarto, sala, lavabo, cozinha e escritório — e por que a mesma fragrância não serve para a casa inteira.'),

  ('Difusor, home spray ou vela: qual é o seu caso',
   'difusor-home-spray-ou-vela',
   'Os três perfumam, mas resolvem problemas diferentes. A diferença está em quanto tempo o perfume precisa durar.',
   E'# Difusor, home spray ou vela\n\n## Difusor: o perfume de fundo\n\nTrabalha sozinho, 24 horas por dia, por meses. É o que faz a casa ter um cheiro próprio — aquele que a visita sente na porta e o morador já nem percebe. Não tem chama, não usa tomada e não pede nada depois de montado.\n\n**Escolha se:** você quer que a casa tenha uma assinatura olfativa constante.\n\n## Home spray: o perfume de ocasião\n\nAge em segundos e vai embora em horas. É a ferramenta do antes das visitas, do depois de cozinhar, do quarto de hóspedes que ficou fechado a semana toda.\n\n**Escolha se:** você precisa de controle imediato, no momento exato.\n\n**Dica:** borrife em tecido, não no ar. Cortina, almofada e roupa de cama seguram o perfume muito mais tempo.\n\n## Os dois juntos\n\nÉ o que a maioria dos nossos clientes acaba fazendo, e é por isso que os kits combinam difusor e spray da mesma fragrância: o difusor sustenta o fundo, o spray reforça quando precisa. Mesma família olfativa, sem briga entre os dois.\n\n## E a vela?\n\nVela perfuma e aquece a cena, mas exige presença: não dá para acender e sair. Em casa com criança ou animal, o difusor resolve o mesmo problema sem o risco.',
   '/blog/difusor-ou-spray.webp', array['difusor','home spray','guia de compra'], 25,
   'Difusor, home spray ou vela: qual escolher',
   'A diferença prática entre difusor de varetas, home spray e vela perfumada — e em que situação cada um resolve melhor.')
) as b(titulo, slug, resumo, conteudo, capa, tags, dias, seo_t, seo_d)
on conflict (slug) do nothing;
