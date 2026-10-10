import Script from "next/script";
import { PIXEL_FORMATOS, type Pixels } from "@/lib/store-defaults";

/**
 * Um id de pixel só pode conter letra, número, hífen e underscore.
 *
 * Os ids entram DENTRO de uma string JavaScript (`fbq('init','<id>')`), então
 * um apóstrofo fecha a string e o resto do campo passa a ser código rodando
 * em toda a loja, checkout incluído. Em vez de escapar, o que é frágil, o
 * campo é recusado por inteiro quando não parece um id: um pixel que não
 * mede é um problema de marketing, um pixel adulterado é um problema de
 * cartão de crédito.
 */
function idPixel(valor: string | null | undefined, formato: RegExp): string {
  const v = (valor ?? "").trim();
  return formato.test(v) ? v : "";
}

/**
 * Injeta as tags de marketing cadastradas no admin (Configurações → Marketing).
 * Renderizado só no layout da loja — o painel admin nunca é rastreado.
 * Cada integração só aparece quando o respectivo ID está preenchido.
 */
export function SiteScripts({ pixels }: { pixels: Pixels | null }) {
  if (!pixels) return null;
  const gtm_id = idPixel(pixels.gtm_id, PIXEL_FORMATOS.gtm_id.regex);
  const ga4_id = idPixel(pixels.ga4_id, PIXEL_FORMATOS.ga4_id.regex);
  const google_ads_id = idPixel(pixels.google_ads_id, PIXEL_FORMATOS.google_ads_id.regex);
  const meta_pixel_id = idPixel(pixels.meta_pixel_id, PIXEL_FORMATOS.meta_pixel_id.regex);
  // `head_html` é escape hatch declarado: código que o LOJISTA cola. Fica
  // cru de propósito — é o ponto do campo. O que protege a loja aqui é a
  // migração 0013: antes dela, qualquer cliente cadastrado conseguia virar
  // admin com um PATCH e escrever neste campo.
  const { head_html } = pixels;

  return (
    <>
      {/* Google Tag Manager */}
      {gtm_id && (
        <>
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm_id}');`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtm_id}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      )}

      {/* Google Analytics 4 / Google Ads (gtag.js) */}
      {(ga4_id || google_ads_id) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4_id || google_ads_id}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${
              ga4_id ? `gtag('config','${ga4_id}');` : ""
            }${google_ads_id ? `gtag('config','${google_ads_id}');` : ""}`}
          </Script>
        </>
      )}

      {/* Meta (Facebook) Pixel */}
      {meta_pixel_id && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta_pixel_id}');fbq('track','PageView');`}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${meta_pixel_id}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Código JS adicional (head) — escape hatch para tags avançadas */}
      {head_html?.trim() && (
        <Script id="custom-head" strategy="afterInteractive">
          {head_html}
        </Script>
      )}
    </>
  );
}
