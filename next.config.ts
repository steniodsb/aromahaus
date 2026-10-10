import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "fngomuacesdhphjfyczj.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // Thumbnails dos vídeos do YouTube (seção Nosso canal em /sobre)
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
    ],
  },
  // O header `X-Powered-By: Next.js` só serve para dizer a um scanner qual
  // CVE tentar primeiro.
  poweredByHeader: false,

  /**
   * Cabeçalhos de segurança.
   *
   * Não há `script-src` aqui, e isso é deliberado: a loja injeta script
   * inline (gtag, fbq, o bootstrap do Next e o campo "código adicional" do
   * painel), então qualquer `script-src` que funcionasse precisaria de
   * `unsafe-inline` — o que não protege de nada e dá falsa sensação de CSP.
   * O que está abaixo são as diretivas que funcionam SEM nonce e que de
   * fato fecham ataques reais:
   *
   *  - `frame-ancestors`: ninguém põe o checkout dentro de um iframe para
   *    capturar clique (clickjacking). É o substituto moderno do
   *    X-Frame-Options, que vai junto para navegador antigo.
   *  - `base-uri`: impede que um `<base>` injetado reescreva TODO link e
   *    `src` relativo da página para outro host.
   *  - `form-action`: um formulário injetado não consegue postar os dados
   *    do cliente para fora. O checkout é todo `fetch`/Secure Fields, então
   *    nada legítimo posta para terceiro.
   *  - `object-src`: sem Flash/applet, não há motivo para permitir.
   *  - `upgrade-insecure-requests`: um asset http:// cadastrado por engano
   *    no painel não quebra o cadeado nem vira ponto de interceptação.
   *
   * HSTS fica de fora de propósito: a Vercel já o envia nos domínios dela,
   * e definir aqui atrapalharia quem apontar um domínio só em http durante
   * a propagação de DNS.
   */
  async headers() {
    const csp = [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      // Páginas de conta, pedido e painel nunca devem ficar em cache de CDN
      // ou de proxy: são dados de UMA pessoa. Uma entrada por prefixo, e não
      // um grupo `(conta|pedido|admin)`: o path-to-regexp v8 que o Next 16
      // usa não aceita mais regex dentro do parâmetro, e a rota seria
      // rejeitada no build.
      ...["conta", "pedido", "admin"].map((prefixo) => ({
        source: `/${prefixo}/:path*`,
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      })),
    ];
  },

  async redirects() {
    return [
      // "Nosso canal" agora vive dentro de Quem somos.
      { source: "/videos", destination: "/sobre", permanent: false },
    ];
  },
};

export default nextConfig;
