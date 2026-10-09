-- ================================================================
-- 0012 — Conteúdo institucional da Aroma Haus (páginas + FAQ)
--
-- Gerado a partir de lib/pages-defaults.ts, que é o mesmo texto que a loja
-- serve quando o banco está vazio. Os dois andam juntos de propósito: página
-- institucional que diverge entre código e banco é a que ninguém percebe que
-- está errada.
--
-- Depois do deploy, quem manda é Admin → Páginas e Admin → FAQ.
-- Idempotente: ON CONFLICT (slug) DO NOTHING.
-- ================================================================

insert into public.pages (slug, title, seo_title, seo_description, content) values
  ('termos-de-uso',
   'Termos de uso',
   'Termos de uso',
   'Termos e condições de uso da loja Aroma Haus.',
   'Ao usar a loja **Aroma Haus**, você concorda com os termos abaixo.

## Produtos

Vendemos perfumaria de ambiente: difusores de varetas, home sprays, sabonetes líquidos, refis e kits. As fragrâncias são compostas e envasadas em pequenos lotes, o que significa que pode haver variação sutil de tonalidade do líquido entre lotes — isso é esperado e não afeta a fragrância.

As imagens são ilustrativas. O frasco de cerâmica é feito e pintado à mão; pequenas diferenças de relevo e acabamento fazem parte da peça.

## Pedidos e pagamentos

O pedido é confirmado depois da aprovação do pagamento. Podemos cancelar pedidos com indício de fraude ou com erro evidente de cadastro ou de preço, comunicando o cliente e devolvendo qualquer valor já pago.

## Uso dos produtos

Produtos de perfumaria de ambiente não são para consumo. Mantenha fora do alcance de crianças e animais, não ingira e evite contato com os olhos e com superfícies polidas, envernizadas ou pintadas — a essência pode manchar. Em caso de contato com a pele, lave com água e sabão.

## Propriedade intelectual

A marca, as fragrâncias, os textos e o layout desta loja pertencem à Aroma Haus e não podem ser reproduzidos sem autorização.'),
  ('trocas-e-devolucoes',
   'Trocas e devoluções',
   'Trocas e devoluções',
   'Política de trocas, devoluções e direito de arrependimento da Aroma Haus.',
   '## Direito de arrependimento

Pelo Código de Defesa do Consumidor (art. 49), você pode desistir da compra em até **7 dias corridos** depois de receber o pedido. O produto precisa estar **lacrado e sem uso**, na embalagem original.

Perfumaria é um produto de contato: um difusor já aberto, com as varetas montadas, não pode voltar para o estoque nem ser revendido a outra pessoa. Por isso a devolução por arrependimento vale apenas para itens ainda lacrados.

## Chegou quebrado ou vazando

Acontece — vidro e cerâmica viajam mal. Nos avise em até **7 dias** do recebimento, com uma foto da peça e da caixa. Reenviamos o produto sem custo nenhum para você, e sem precisar devolver o que quebrou.

## Não gostei da fragrância

Fale com a gente. Cheiro é pessoal e sabemos que comprar sem sentir é um salto de fé: dentro de **15 dias**, trocamos por outra fragrância da casa de valor igual — você paga só o frete de volta. O produto precisa estar com pelo menos 80% do conteúdo.

## Como solicitar

Chame no WhatsApp com o número do pedido. Respondemos com as instruções de postagem. O reembolso sai depois de recebermos e conferirmos o produto, pelo mesmo meio de pagamento, em até 10 dias úteis.'),
  ('politica-de-privacidade',
   'Política de privacidade',
   'Política de privacidade',
   'Como a Aroma Haus coleta, usa e protege os seus dados pessoais (LGPD).',
   'A **Aroma Haus** respeita a sua privacidade e trata seus dados conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

## Dados que coletamos

Coletamos o que você nos informa ao criar conta, fazer um pedido ou entrar em contato: nome, e-mail, telefone, CPF e endereço de entrega. Também registramos dados de navegação na loja para entender o que funciona e o que atrapalha.

O CPF é pedido porque o meio de pagamento e a emissão da etiqueta de envio exigem — não o usamos para mais nada.

## Como usamos

Para processar o pedido, calcular e despachar a entrega, dar suporte e cumprir obrigações legais e fiscais. **Não vendemos seus dados a ninguém.**

## Com quem compartilhamos

Apenas com quem é necessário para o pedido existir: o gateway de pagamento, a transportadora e o serviço de e-mail transacional — e sempre no limite do que cada um precisa.

## Mensagem de presente

Quando você escreve uma mensagem de presente, ela é lida pela pessoa que prepara o pedido, impressa no cartão e apagada do painel depois do envio.

## Seus direitos

Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo nosso WhatsApp ou e-mail. Respondemos em até 15 dias.')
on conflict (slug) do nothing;

insert into public.faq_items (question, answer, position) values
  ('Quanto tempo dura um difusor?', 'Um frasco de 250 ml com 5 varetas dura de 3 a 5 meses; o de 500 ml, de 6 a 10. Quanto mais varetas, mais intenso o perfume e mais rápido ele acaba. Ambiente com ar-condicionado ou corrente de ar consome mais depressa.', 1),
  ('Quantas varetas devo usar?', '3 a 4 em lavabo e banheiro, 5 a 6 em quarto, 7 a 8 em sala. Comece com menos e vá somando: dá para aumentar, mas não dá para tirar o perfume do ar depois.', 2),
  ('Preciso virar as varetas?', 'Uma vez por semana basta. Virar reaviva o perfume porque traz para cima a parte já embebida; virar todo dia só faz o frasco acabar antes.', 3),
  ('O refil serve em qualquer frasco?', 'Sim, o refil de 250 ml serve em qualquer difusor Aroma Haus. Esvazie o que sobrou, complete com o refil e troque as varetas — vareta velha já está saturada e não puxa mais.', 4),
  ('Qual a diferença entre difusor e home spray?', 'O difusor é o perfume de fundo: trabalha sozinho por meses e dá à casa um cheiro próprio. O home spray é o de ocasião: age em segundos e vai embora em horas. A maioria dos nossos clientes usa os dois na mesma fragrância.', 5),
  ('Vocês embrulham para presente?', 'Sim, sem custo. Marque a opção no checkout e escrevemos à mão a sua mensagem no cartão. A nota fiscal vai fora da caixa, sem nenhum preço à vista.', 6),
  ('Vocês entregam em todo o Brasil?', 'Sim. O frete é calculado no checkout pelo seu CEP. Vidro e cerâmica vão com proteção dupla, e se chegar quebrado a gente reenvia sem custo.', 7),
  ('Posso usar o home spray direto no tecido?', 'Pode, e é onde ele rende mais — cortina, almofada e roupa de cama seguram o perfume por muito mais tempo que o ar. Borrife a um palmo de distância. Em tecido delicado ou de cor clara, teste antes numa parte escondida.', 8)
on conflict do nothing;
