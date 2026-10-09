import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { WhatsAppFloat } from "@/components/site/whatsapp-float";
import { AnnouncementBar } from "@/components/site/announcement-bar";
import { Newsletter } from "@/components/store/newsletter";
import { SiteScripts } from "@/components/site/site-scripts";
import { getPixels } from "@/lib/queries";
import { getCheckoutConfig, getShippingOrigin } from "@/lib/store";
import { StoreConfigProvider } from "@/lib/store-config-context";

export default async function StoreLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [pixels, checkout, shipping] = await Promise.all([
    getPixels(),
    getCheckoutConfig(),
    getShippingOrigin(),
  ]);

  // Uma leitura só, aqui, para toda a loja: barra de avisos, card de produto,
  // carrinho e checkout passam a enxergar exatamente o mesmo número.
  const storeConfig = {
    maxInstallments: checkout.max_installments,
    interestFreeInstallments: checkout.interest_free_installments,
    freeShippingThreshold: shipping.free_shipping_threshold,
  };

  return (
    <StoreConfigProvider value={storeConfig}>
      <SiteScripts pixels={pixels} />
      <AnnouncementBar />
      <Header />
      <main className="flex-1">{children}</main>
      <Newsletter />
      <Footer />
      <WhatsAppFloat />
    </StoreConfigProvider>
  );
}
