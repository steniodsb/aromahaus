"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  /**
   * Chave do item no carrinho. É o id da VARIANTE quando o produto tem
   * tamanhos, e o id do produto quando não tem — assim o difusor de 250 ml e
   * o de 500 ml convivem como duas linhas, sem somar quantidade errada.
   */
  id: string;
  /** Id do produto, sempre. É por ele que o servidor revalida preço e estoque. */
  productId: string;
  variantId: string | null;
  /** "500 ml". Aparece embaixo do nome no carrinho e na nota. */
  variantLabel: string | null;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  qty: number;
  /** Estoque disponível, usado para travar a quantidade. */
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clear: () => void;
  isReady: boolean;
}

const STORAGE_KEY = "aroma-haus-cart";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Hydrate from localStorage on mount.
  //
  // Tem que ser num efeito mesmo: o servidor não enxerga o localStorage, então
  // ler o carrinho no primeiro render daria HTML diferente no servidor e no
  // cliente (erro de hidratação). Por isso o `isReady` — a UI só mostra o
  // carrinho depois desta passada. O `setState` aqui roda uma vez, na montagem,
  // e é exatamente o caso de "sincronizar com sistema externo" que a regra abre
  // exceção; ela só não consegue enxergar isso porque a leitura é imperativa.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Carrinho salvo antes das variantes não tem `productId`. Em vez de
        // quebrar no checkout, completa com o próprio id — que, naquela época,
        // era mesmo o id do produto.
        const parsed = (JSON.parse(raw) as CartItem[]).map((i) => ({
          ...i,
          productId: i.productId ?? i.id,
          variantId: i.variantId ?? null,
          variantLabel: i.variantLabel ?? null,
        }));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
    setIsReady(true);
  }, []);

  // Persist on change (after hydration)
  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore quota errors
    }
  }, [items, isReady]);

  function addItem(item: Omit<CartItem, "qty">, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const max = item.stock > 0 ? item.stock : Infinity;
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, qty: Math.min(i.qty + qty, max) }
            : i,
        );
      }
      return [...prev, { ...item, qty: Math.min(qty, max) }];
    });
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQty(id: string, qty: number) {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.id !== id) return i;
          const max = i.stock > 0 ? i.stock : Infinity;
          return { ...i, qty: Math.max(1, Math.min(qty, max)) };
        })
        .filter((i) => i.qty > 0),
    );
  }

  function clear() {
    setItems([]);
  }

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return {
      items,
      count,
      subtotal,
      addItem,
      removeItem,
      updateQty,
      clear,
      isReady,
    };
  }, [items, isReady]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
