import "server-only";
import { formatBRL } from "@/lib/utils";
import { getStoreInfo } from "@/lib/store";

/** true se o Resend estiver configurado. */
export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

interface SendArgs {
  /** Um endereço, ou vários separados por vírgula. */
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envia um e-mail via Resend (HTTP, sem SDK).
 *
 * Nunca lança: e-mail não pode derrubar um checkout que já cobrou o cliente.
 * Mas TAMBÉM nunca falha calado — antes esta função devolvia `false` sem uma
 * linha de log, e a loja passou semanas sem entregar nenhum e-mail sem que
 * nada aparecesse em lugar nenhum. Todo caminho de falha loga o motivo.
 */
export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY ausente — "${subject}" não foi enviado para ${to}`);
    return false;
  }
  if (!to) {
    console.warn(`[email] destinatário vazio — "${subject}" não foi enviado`);
    return false;
  }

  // Vários destinatários numa string só: é como o admin digita no painel
  // ("eu@x.com, socio@x.com") e evita um tipo novo só para isso.
  const destinatarios = to
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (!destinatarios.length) {
    console.warn(`[email] nenhum destinatário válido — "${subject}" não foi enviado`);
    return false;
  }

  const store = await getStoreInfo();
  const from = process.env.RESEND_FROM || `${store.name} <${store.email}>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: destinatarios,
        subject,
        html,
        reply_to: replyTo || store.email,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[email] Resend recusou "${subject}" para ${to} (HTTP ${res.status}, from="${from}"): ${body}`,
      );
      // 403 aqui é quase sempre o mesmo caso: domínio não verificado, então o
      // Resend só entrega para o dono da conta. Ver SETUP.md.
      if (res.status === 403) {
        console.error(
          "[email] ⚠️ Domínio não verificado no Resend — NENHUM cliente recebe e-mail. " +
            "Verifique um domínio em resend.com/domains e ajuste RESEND_FROM.",
        );
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[email] falha de rede ao enviar "${subject}" para ${to}:`, err);
    return false;
  }
}

// ── Templates ───────────────────────────────────────────────────────────────

// Dourado champagne e tinta quente — os mesmos tokens do site. Cor de
// e-mail é escrita à mão porque cliente de e-mail não lê variável CSS.
const BRAND = "#a5854a"; // champagne-600
const INK = "#2b2722"; // linen-900

/**
 * Escapa texto para dentro do HTML do e-mail.
 *
 * Tudo que entra nestes templates é interpolado em template string, sem
 * nenhuma camada de framework no caminho: um nome de cliente com
 * `<img src=x onerror=...>` ia inteiro para a caixa de entrada — a dele e,
 * nos avisos de pedido, a do lojista. Nome, endereço, motivo de recusa do
 * gateway e nome de produto são todos texto de fora.
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Só deixa passar http(s) num `href`.
 *
 * O link do boleto vem do gateway. `javascript:` num e-mail não executa na
 * maioria dos clientes, mas executa no webmail de alguns e no navegador de
 * quem abre o e-mail "no browser" — e não custa nada barrar aqui.
 */
function safeUrl(url: string | null | undefined, fallback = "#"): string {
  try {
    const u = new URL(String(url));
    return u.protocol === "http:" || u.protocol === "https:" ? esc(u.toString()) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Base pública para as imagens do e-mail.
 *
 * Cliente de e-mail busca a imagem do servidor DELE, então `localhost` nunca
 * resolve — em dev o logo apareceria quebrado. Quando o site está rodando num
 * host não público, caímos para a produção, que serve os mesmos arquivos de
 * `public/`.
 */
const EMAIL_ASSETS_FALLBACK = "https://aromahaus.steniowebdesigner.com";

function assetsBase(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname;
    const local = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    return local ? EMAIL_ASSETS_FALLBACK : siteUrl.replace(/\/$/, "");
  } catch {
    return EMAIL_ASSETS_FALLBACK;
  }
}

/**
 * Cabeçalho com o logo.
 *
 * PNG, não SVG: boa parte dos clientes de e-mail não renderiza SVG. Largura e
 * altura explícitas porque vários ignoram CSS de dimensão e, sem isso, a
 * imagem entra em tamanho natural (860px) e estoura o card. Servida em 860px
 * e exibida em 215px, fica nítida em tela retina.
 *
 * O `alt` é estilizado de propósito: Gmail e Outlook bloqueiam imagem externa
 * por padrão, então no primeiro carregamento o que aparece é esse texto — ele
 * precisa parecer a marca, não um alt quebrado.
 */
function logoHeader(store: { name: string; siteUrl: string }) {
  const src = `${assetsBase(store.siteUrl)}/brand/aroma-haus-logo.png`;
  return `<div style="text-align:center;padding:8px 0 24px;">
      <a href="${safeUrl(store.siteUrl)}" style="text-decoration:none;">
        <img src="${safeUrl(src)}" alt="${esc(store.name)}" width="215" height="40"
             style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;width:215px;height:auto;max-width:215px;font-size:20px;letter-spacing:4px;color:${BRAND};" />
      </a>
    </div>`;
}

interface EmailOrder {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  subtotal: number | string;
  shipping_cost: number | string;
  discount?: number | string | null;
  total: number | string;
  shipping_service?: string | null;
  tracking_code?: string | null;
  shipping_address?: Record<string, string> | null;
}

interface EmailItem {
  name_snapshot: string;
  unit_price: number | string;
  qty: number;
}

function shell(store: Awaited<ReturnType<typeof getStoreInfo>>, title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    ${logoHeader(store)}
    <div style="background:#fff;border-radius:14px;padding:32px;border:1px solid #e4e4e7;">
      <h1 style="margin:0 0 16px;font-size:20px;color:#18181b;">${esc(title)}</h1>
      ${body}
    </div>
    <p style="text-align:center;color:#a1a1aa;font-size:12px;margin:24px 0 4px;">
      ${esc(store.name)} — pedido feito em <a href="${safeUrl(store.siteUrl)}" style="color:${BRAND};text-decoration:none;">${esc(store.siteUrl.replace(/^https?:\/\//, ""))}</a>
    </p>
    <p style="text-align:center;color:#a1a1aa;font-size:12px;margin:0;">Dúvidas? Responda este e-mail ou fale no WhatsApp.</p>
  </div>
</body></html>`;
}

function itemsTable(items: EmailItem[]) {
  const rows = items
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${esc(it.name_snapshot)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#71717a;text-align:center;">x${it.qty}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatBRL(Number(it.unit_price) * it.qty)}</td>
      </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">${rows}</table>`;
}

function totals(order: EmailOrder) {
  const disc = Number(order.discount ?? 0);
  return `<table style="width:100%;font-size:14px;margin-top:8px;">
    <tr><td style="color:#71717a;padding:2px 0;">Subtotal</td><td style="text-align:right;">${formatBRL(Number(order.subtotal))}</td></tr>
    <tr><td style="color:#71717a;padding:2px 0;">Frete${order.shipping_service ? ` (${esc(order.shipping_service)})` : ""}</td><td style="text-align:right;">${formatBRL(Number(order.shipping_cost))}</td></tr>
    ${disc > 0 ? `<tr><td style="color:#71717a;padding:2px 0;">Desconto</td><td style="text-align:right;">- ${formatBRL(disc)}</td></tr>` : ""}
    <tr><td style="font-weight:700;padding-top:8px;border-top:1px solid #e4e4e7;">Total</td><td style="text-align:right;font-weight:700;padding-top:8px;border-top:1px solid #e4e4e7;">${formatBRL(Number(order.total))}</td></tr>
  </table>`;
}

function button(href: string, text: string) {
  return `<div style="text-align:center;margin:24px 0 8px;">
    <a href="${safeUrl(href)}" style="display:inline-block;background:${INK};color:#fbf9f6;text-decoration:none;font-weight:500;padding:14px 32px;border-radius:999px;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${esc(text)}</a>
  </div>`;
}

/**
 * Bloco com um código para o cliente copiar (Pix copia-e-cola, linha digitável
 * do boleto). `word-break` é obrigatório: são strings de 100+ caracteres sem
 * espaço, que estouram a largura no mobile sem isso.
 */
function codeBlock(label: string, code: string) {
  return `<div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:10px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 8px;color:#71717a;font-size:13px;">${esc(label)}</p>
    <p style="margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5;word-break:break-all;color:#18181b;">${esc(code)}</p>
  </div>`;
}

async function baseCtx(order: EmailOrder) {
  const store = await getStoreInfo();
  const orderUrl = `${store.siteUrl}/pedido/${order.id}`;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const hi = order.customer_name
    ? `Olá, ${esc(order.customer_name.split(" ")[0])}!`
    : "Olá!";
  return { store, orderUrl, shortId, hi };
}

/** Pedido recebido — aguardando pagamento. */
export async function sendOrderReceivedEmail(order: EmailOrder, items: EmailItem[]) {
  if (!order.customer_email) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Recebemos o seu pedido <strong>#${shortId}</strong>. Assim que o pagamento for confirmado, começamos a preparar o envio.</p>
    ${itemsTable(items)}
    ${totals(order)}
    ${button(orderUrl, "Acompanhar pedido")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `Pedido #${shortId} recebido — ${store.name}`,
    html: shell(store, "Recebemos o seu pedido 🎉", body),
  });
}

/** Pagamento aprovado. */
export async function sendOrderPaidEmail(order: EmailOrder, items: EmailItem[]) {
  if (!order.customer_email) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Boas notícias: o pagamento do pedido <strong>#${shortId}</strong> foi <strong style="color:#16a34a;">aprovado</strong>. Já estamos preparando o seu envio.</p>
    ${itemsTable(items)}
    ${totals(order)}
    ${button(orderUrl, "Ver detalhes do pedido")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `Pagamento aprovado — Pedido #${shortId}`,
    html: shell(store, "Pagamento aprovado ✅", body),
  });
}

/** Pedido enviado — com rastreio. */
export async function sendOrderShippedEmail(order: EmailOrder) {
  if (!order.customer_email) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const track = order.tracking_code;
  const trackBlock = track
    ? `<div style="background:#f4f4f5;border-radius:10px;padding:16px;margin:16px 0;text-align:center;">
        <p style="margin:0 0 4px;color:#71717a;font-size:13px;">Código de rastreio</p>
        <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:1px;">${esc(track)}</p>
      </div>`
    : "";
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">O seu pedido <strong>#${shortId}</strong> foi <strong>enviado</strong>${order.shipping_service ? ` via ${esc(order.shipping_service)}` : ""}! 🚚</p>
    ${trackBlock}
    ${button(orderUrl, "Acompanhar entrega")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `Pedido #${shortId} a caminho 🚚`,
    html: shell(store, "Seu pedido está a caminho 🚚", body),
  });
}

/** Atualização genérica de status (entregue / cancelado / reembolsado). */
export async function sendOrderStatusEmail(order: EmailOrder, status: string) {
  if (!order.customer_email) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const copy: Record<string, { title: string; msg: string }> = {
    delivered: {
      title: "Pedido entregue ✅",
      msg: `O pedido <strong>#${shortId}</strong> foi marcado como <strong>entregue</strong>. Esperamos que aproveite! Qualquer dúvida, é só responder este e-mail.`,
    },
    canceled: {
      title: "Pedido cancelado",
      msg: `O pedido <strong>#${shortId}</strong> foi <strong>cancelado</strong>. Se tiver qualquer dúvida ou for um engano, fale com a gente.`,
    },
    refunded: {
      title: "Pedido reembolsado",
      msg: `O reembolso do pedido <strong>#${shortId}</strong> foi processado. O valor pode levar alguns dias para aparecer, conforme o meio de pagamento.`,
    },
  };
  const c = copy[status];
  if (!c) return false;
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">${c.msg}</p>
    ${button(orderUrl, "Ver pedido")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `${c.title.replace(/[^\p{L}\p{N} ]/gu, "").trim()} — Pedido #${shortId}`,
    html: shell(store, c.title, body),
  });
}

/** Aviso ao lojista de novo pedido pago (para agilizar o envio). */
export async function sendAdminNewOrderEmail(order: EmailOrder) {
  const store = await getStoreInfo();
  // O painel manda: a env é só o fallback de quem nunca configurou. Antes era
  // ao contrário, e trocar o destinatário exigia mexer na Vercel e refazer o
  // deploy — para uma informação que muda com a equipe, não com o código.
  const to = store.notificationsEmail;
  if (!to) return false;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const addr = order.shipping_address;
  const body = `
    <p style="margin:0 0 8px;color:#3f3f46;">Novo pedido <strong>pago</strong>: <strong>#${shortId}</strong> — ${formatBRL(Number(order.total))}.</p>
    <p style="margin:0 0 4px;font-size:14px;">Cliente: ${esc(order.customer_name ?? "—")} (${esc(order.customer_email ?? "—")})</p>
    ${addr ? `<p style="margin:0 0 8px;font-size:14px;color:#71717a;">${esc(addr.street)}, ${esc(addr.number)} ${esc(addr.complement ?? "")} — ${esc(addr.district ?? "")}, ${esc(addr.city ?? "")}/${esc(addr.state ?? "")} — CEP ${esc(addr.cep ?? "")}</p>` : ""}
    ${button(`${store.siteUrl}/admin/pedidos/${order.id}`, "Abrir no painel")}`;
  return sendEmail({
    to,
    subject: `🛒 Novo pedido pago #${shortId} — ${formatBRL(Number(order.total))}`,
    html: shell(store, "Novo pedido pago 🛒", body),
  });
}

// ── Checkout transparente: Pix, boleto e recusa ─────────────────────────────

/**
 * Pix gerado — manda o copia-e-cola por e-mail.
 *
 * O QR code NÃO vai embutido: ele existe só como data URI (base64) e a maioria
 * dos clientes de e-mail bloqueia `img src="data:"`, o que renderizaria um
 * quadrado quebrado. O copia-e-cola resolve no app do banco e o botão leva pra
 * página do pedido, onde o QR aparece de verdade.
 */
export async function sendOrderPixEmail(
  order: EmailOrder,
  pix: { qr_code?: string | null; ticket_url?: string | null; expires_at?: string | null },
) {
  if (!order.customer_email || !pix.qr_code) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const prazo = pix.expires_at
    ? new Date(pix.expires_at).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : null;
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Falta só o pagamento do pedido <strong>#${shortId}</strong>. Abra o app do seu banco, escolha <strong>Pix copia e cola</strong> e use o código abaixo.</p>
    ${codeBlock("Pix copia e cola", pix.qr_code)}
    ${prazo ? `<p style="margin:0 0 8px;color:#b45309;font-size:14px;">⏱ Este Pix expira em <strong>${prazo}</strong>. Depois disso é preciso refazer o pedido.</p>` : ""}
    ${button(orderUrl, "Ver QR code do pedido")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `Seu Pix do pedido #${shortId} — ${formatBRL(Number(order.total))}`,
    html: shell(store, "Pague com Pix para liberar seu pedido", body),
  });
}

/**
 * Boleto gerado — link do PDF + linha digitável.
 *
 * É o e-mail mais crítico do checkout: o boleto leva até 3 dias úteis pra
 * compensar e, sem este e-mail, quem fecha a aba perde o boleto e o pedido
 * morre em `pending`.
 */
export async function sendOrderBoletoEmail(
  order: EmailOrder,
  boleto: { url?: string | null; barcode?: string | null },
) {
  if (!order.customer_email || !boleto.url) return false;
  const { store, shortId, hi } = await baseCtx(order);
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">O boleto do pedido <strong>#${shortId}</strong> está pronto. Pague em qualquer banco, lotérica ou pelo app.</p>
    ${boleto.barcode ? codeBlock("Linha digitável", boleto.barcode) : ""}
    <p style="margin:0 0 8px;color:#3f3f46;font-size:14px;">Assim que o pagamento compensar (até 3 dias úteis), a gente avisa e começa a preparar o envio.</p>
    ${button(boleto.url, "Abrir boleto (PDF)")}`;
  return sendEmail({
    to: order.customer_email,
    subject: `Boleto do pedido #${shortId} — ${formatBRL(Number(order.total))}`,
    html: shell(store, "Seu boleto está pronto", body),
  });
}

/** Pagamento recusado — explica o motivo e convida a tentar outro meio. */
export async function sendPaymentFailedEmail(order: EmailOrder, reason?: string) {
  if (!order.customer_email) return false;
  const { store, orderUrl, shortId, hi } = await baseCtx(order);
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Não conseguimos aprovar o pagamento do pedido <strong>#${shortId}</strong>.</p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px;margin:16px 0;"><p style="margin:0;color:#b91c1c;font-size:14px;">${esc(reason)}</p></div>` : ""}
    <p style="margin:0 0 8px;color:#3f3f46;">Seus produtos continuam reservados. É só refazer o pedido escolhendo outro cartão ou pagando com Pix.</p>
    ${button(`${store.siteUrl}/carrinho`, "Tentar novamente")}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;text-align:center;">Nenhum valor foi cobrado. <a href="${orderUrl}" style="color:${BRAND};">Ver pedido</a></p>`;
  return sendEmail({
    to: order.customer_email,
    subject: `Não conseguimos aprovar o pagamento — Pedido #${shortId}`,
    html: shell(store, "Pagamento não aprovado", body),
  });
}

// ── Conta e newsletter ──────────────────────────────────────────────────────

/** Boas-vindas depois do cadastro. */
export async function sendWelcomeEmail(user: { name?: string | null; email: string }) {
  if (!user.email) return false;
  const store = await getStoreInfo();
  const hi = user.name ? `Olá, ${esc(user.name.split(" ")[0])}!` : "Olá!";
  const body = `
    <p style="margin:0 0 8px;">${hi}</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Sua conta na <strong>${esc(store.name)}</strong> está pronta. Agora você acompanha seus pedidos, salva endereços e finaliza a compra mais rápido.</p>
    <p style="margin:0 0 8px;color:#3f3f46;">Fazemos perfumaria de ambiente em pequenos lotes: difusores de varetas, home sprays, sabonetes líquidos e refis, em fragrâncias autorais.</p>
    ${button(`${store.siteUrl}/produtos`, "Conhecer as fragrâncias")}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;text-align:center;">Em dúvida sobre qual fragrância combina com o seu ambiente? Responda este e-mail — a gente ajuda a escolher.</p>`;
  return sendEmail({
    to: user.email,
    subject: `Bem-vindo à ${store.name}!`,
    html: shell(store, "Sua conta foi criada 🎉", body),
  });
}

/** Confirmação de inscrição na newsletter. */
export async function sendNewsletterWelcomeEmail(email: string) {
  if (!email) return false;
  const store = await getStoreInfo();
  const body = `
    <p style="margin:0 0 8px;color:#3f3f46;">Inscrição confirmada! Você recebe os lançamentos de fragrância, as promoções e os kits de presente em primeira mão.</p>
    ${button(`${store.siteUrl}/produtos`, "Conhecer a loja")}
    <p style="margin:16px 0 0;color:#71717a;font-size:13px;text-align:center;">Não quer mais receber? Responda este e-mail pedindo pra sair da lista.</p>`;
  return sendEmail({
    to: email,
    subject: `Inscrição confirmada — ${store.name}`,
    html: shell(store, "Você está na lista ✅", body),
  });
}

// ── Avisos operacionais para o lojista ──────────────────────────────────────

/** Aviso ao lojista de produtos com estoque baixo (disparado após uma venda). */
export async function sendAdminLowStockEmail(products: { name: string; stock: number }[]) {
  if (!products.length) return false;
  const store = await getStoreInfo();
  // O painel manda: a env é só o fallback de quem nunca configurou. Antes era
  // ao contrário, e trocar o destinatário exigia mexer na Vercel e refazer o
  // deploy — para uma informação que muda com a equipe, não com o código.
  const to = store.notificationsEmail;
  if (!to) return false;
  const rows = products
    .map(
      (p) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${esc(p.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:${p.stock === 0 ? "#b91c1c" : "#b45309"};">${p.stock === 0 ? "esgotado" : `${p.stock} un.`}</td>
      </tr>`,
    )
    .join("");
  const body = `
    <p style="margin:0 0 8px;color:#3f3f46;">Estes produtos ficaram com estoque baixo depois da última venda:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">${rows}</table>
    ${button(`${store.siteUrl}/admin/produtos`, "Repor estoque")}`;
  return sendEmail({
    to,
    subject: `⚠️ Estoque baixo em ${products.length} produto(s)`,
    html: shell(store, "Estoque baixo ⚠️", body),
  });
}
