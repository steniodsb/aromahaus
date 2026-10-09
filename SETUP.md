# Aroma Haus — Guia de conexão (o que falta ligar)

A loja está **100% funcional em código**. Falta apenas preencher credenciais e rodar 1 migração.
Tudo abaixo é "só colar chave / preencher campo". Nenhuma linha de código a mais.

> Enquanto uma integração não estiver conectada, a loja **não quebra**: o frete vira
> "a combinar", o pagamento cai no WhatsApp e os e-mails simplesmente não são enviados.

---

## 1. Banco de dados (Supabase) — **obrigatório**

Rodar as migrações no SQL Editor do Supabase (ou `supabase db push`), na ordem:

```
supabase/migrations/0003_ecommerce_automation.sql
supabase/migrations/0004_checkout_transparente.sql
supabase/migrations/0005_cupons_regras_frete.sql
supabase/migrations/0006_newsletter.sql
supabase/migrations/0007_estoque_paginas_faq.sql
supabase/migrations/0008_log_admins.sql
supabase/migrations/0009_pedidos_arquivar.sql
```

- `0003` — baixa de estoque automática, flags de e-mail e campos de etiqueta.
- `0004` — checkout transparente (CPF, meio de pagamento, dados do Pix/boleto).
- `0005` — **cupons de desconto e regras de frete**. Enquanto ela não rodar,
  `/admin/cupons` e `/admin/frete` não abrem, e todo cupom digitado no checkout
  responde "Cupom inválido" (a loja não quebra, só não tem cupom).
- `0006` — **newsletter em tabela**. ⚠️ Rode ASSIM QUE fizer deploy: o código
  novo grava em `newsletter_subscribers`, então enquanto a tabela não existir
  o formulário do rodapé responde "Não foi possível inscrever agora" e o
  inscrito se perde. A migração já traz quem estava no array antigo.
- `0007` — histórico de estoque, páginas institucionais e FAQ editáveis. Sem
  ela, `/admin/estoque` e `/admin/paginas` não salvam (a loja segue servindo o
  texto embutido, sem quebrar).
- `0008` — registro de atividade do painel. Sem ela, `/admin/equipe` abre mas
  a lista de atividade fica vazia.
- `0009` — arquivar pedidos. Sem ela a lista de pedidos continua funcionando
  (a tela detecta e recua), só o botão Arquivar não aparece.

As migrações `0001` e `0002` já devem ter sido aplicadas.

**Criar o admin:** só é preciso SQL para o PRIMEIRO admin. Depois disso, use
**Admin → Equipe e atividade** para promover ou remover acesso pela tela.

```sql
update public.profiles set is_admin = true where id = 'UUID_DO_USUARIO';
```

---

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)

Copie de `.env.example`. As que importam agora:

| Variável | Onde pega | Obrigatória? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | ✅ (já configurado) |
| `NEXT_PUBLIC_SITE_URL` | URL de produção (`https://aromahaus.vercel.app`) | ✅ |
| `MERCADOPAGO_ACCESS_TOKEN` | MP → Suas integrações → Credenciais | pagamento |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | idem | pagamento |
| `MERCADOPAGO_WEBHOOK_SECRET` | MP → Webhooks → assinatura secreta | pagamento |
| `MELHORENVIO_BASE_URL` | sandbox ou `https://www.melhorenvio.com.br` | frete |
| `MELHORENVIO_TOKEN` | Melhor Envio → Configurações → Tokens | frete |
| `RESEND_API_KEY` | resend.com → API Keys | e-mails |
| `RESEND_FROM` | ex.: `Aroma Haus <pedidos@seudominio.com.br>` | e-mails |
| `STORE_EMAIL` | fallback de quem recebe os avisos da loja | e-mails |

> O destinatário dos avisos (novo pedido pago, estoque baixo) se troca em
> **Admin → Configurações → E-mail para avisos da loja**, sem redeploy. A env
> `STORE_EMAIL` só vale enquanto esse campo estiver em branco.
>
> ⚠ O endereço precisa ser uma caixa que EXISTE e recebe. O Resend só envia —
> ter o domínio verificado nele não cria `pedidos@seudominio`.

---

## 3. Mercado Pago — pagamento (Pix, boleto, cartão)

1. Pegue o **Access Token** e a **Public Key** (produção) e coloque nas envs.
2. Em **Webhooks**, cadastre a URL:
   `https://SEU-SITE/api/mercadopago/webhook`  — evento **Pagamentos**.
3. Copie a **assinatura secreta** gerada e ponha em `MERCADOPAGO_WEBHOOK_SECRET`.

O que já funciona automaticamente ao aprovar o pagamento:
- pedido muda para **pago**;
- **estoque baixa** sozinho (uma vez só);
- cliente recebe **e-mail de pagamento aprovado**;
- você recebe **e-mail de novo pedido**.

---

## 4. Melhor Envio — frete e etiquetas

1. Gere o **token** e ponha em `MELHORENVIO_TOKEN` (comece no **sandbox** para testar).
2. No painel: **Admin → Configurações → Frete & remetente**, preencha o **endereço de origem completo**
   (CEP, rua, número, bairro, cidade, UF, CNPJ/CPF). Isso é o remetente das etiquetas.
3. Cálculo de frete no checkout já funciona assim que houver token + CEP de origem.
4. Para despachar: **Admin → Pedidos → (pedido) → "Gerar etiqueta Melhor Envio"**.
   Ele compra a etiqueta (usa o **saldo da conta** Melhor Envio), gera o PDF, salva o rastreio
   e envia o **e-mail de "pedido enviado"** para o cliente.
   - Deixe **saldo** na conta Melhor Envio, senão o checkout da etiqueta falha.
   - Para produção, troque `MELHORENVIO_BASE_URL` para `https://www.melhorenvio.com.br`.
   - ⚠️ Em **produção**, o Melhor Envio exige o **CNPJ/CPF do remetente** (Configurações → Frete)
     e o **CPF do destinatário** — este já é coletado no checkout e enviado na etiqueta.

---

## 5. Resend — e-mails automáticos

1. Crie a conta, **verifique seu domínio** (DNS) e gere a `RESEND_API_KEY`.
2. Defina `RESEND_FROM` com um remetente do domínio verificado.

E-mails que a loja dispara sozinha:
- **Pedido recebido** (ao finalizar o checkout);
- **Pagamento aprovado** (webhook do MP);
- **Pedido enviado** com rastreio (ao gerar etiqueta ou marcar como "enviado");
- **Entregue / cancelado / reembolsado** (ao mudar o status no painel);
- **Aviso ao lojista** de novo pedido pago.

### E-mail de "esqueci a senha" — **não passa pelo Resend**

O link de redefinição é enviado pelo **Supabase Auth**, não pelo código da loja.
No SMTP padrão do Supabase ele **só chega para e-mails de membros do projeto**
(e no limite de ~2 por hora), então para clientes ele simplesmente nunca chega.
Configure o SMTP próprio em **Supabase → Authentication → Emails → SMTP Settings**
(dá para usar o mesmo Resend):

| Campo | Valor |
|---|---|
| Host | `smtp.resend.com` |
| Porta | `465` |
| Usuário | `resend` |
| Senha | a `RESEND_API_KEY` |
| Sender | o mesmo remetente do `RESEND_FROM` (domínio verificado) |

Depois, em **Authentication → URL Configuration**:
- **Site URL**: `https://aromahaus.vercel.app` (ou o domínio final);
- **Redirect URLs**: adicione `https://aromahaus.vercel.app/auth/confirm`
  (e `http://localhost:3000/auth/confirm` para testar local).

Para conferir se saiu, veja **Logs → Auth** no Supabase.

---

## 6. Pixels / marketing (opcional)

**Admin → Marketing**: cole os IDs (GA4, GTM, Google Ads, Meta Pixel) ou HTML extra.
As tags entram só na loja (o painel admin nunca é rastreado).

---

## Resumo do que testar depois de conectar

1. Rodar migração `0003` + criar admin.
2. Colocar envs na Vercel e **redeploy**.
3. Comprar um produto de teste → confere e-mail "recebido".
4. Pagar (sandbox MP) → confere status "pago", estoque baixado e e-mail "aprovado".
5. Preencher origem do frete → gerar etiqueta → confere PDF, rastreio e e-mail "enviado".
