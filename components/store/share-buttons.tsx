"use client";

import { useState } from "react";
import { MessageCircle, Link2, Check } from "lucide-react";

export function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function shareWhatsApp() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-linen-600">Compartilhar:</span>
      <button
        onClick={shareWhatsApp}
        className="inline-flex items-center gap-1.5 text-linen-600 transition-colors hover:text-champagne-700"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </button>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-1.5 text-linen-600 transition-colors hover:text-champagne-700"
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Link copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
