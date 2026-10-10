"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { revalidarCarrinho } from "@/app/actions/cart";

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

/** O que mudou numa linha do carrinho desde que o cliente a guardou. */
export interface CartChange {
  id: string;
  name: string;
  tipo: "preco" | "indisponivel" | "estoque";
  /** Preenchidos em "preco": valores antigo e novo. */
  de?: number;
  para?: number;
  /** Preenchido em "estoque": quantidade a que a linha foi reduzida. */
  qty?: number;
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
  /**
   * Diferenças encontradas na última reconferência com o banco. A página do
   * carrinho e o checkout mostram isto ao cliente ANTES de ele pagar.
   */
  changes: CartChange[];
  dismissChanges: () => void;
  /** Reconfere agora. Já roda sozinha uma vez, depois da hidratação. */
  revalidate: () => Promise<void>;
}

const STORAGE_KEY = "aroma-haus-cart";

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [changes, setChanges] = useState<CartChange[]>([]);

  // A reconferência roda UMA vez por carregamento. Sem esta trava ela se
  // chamaria de novo a cada correção que ela mesma aplica, porque corrigir
  // muda `items`, que muda a própria função.
  const jaConferiu = useRef(false);

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
    setChanges([]);
  }

  /**
   * Reconfere cada linha contra o banco e corrige o que mudou.
   *
   * Corrige em silêncio o que é só desatualização (nome, imagem, rótulo da
   * variante) e ANUNCIA o que muda a conta do cliente: preço diferente,
   * item que saiu do ar e quantidade que não cabe mais no estoque.
   */
  const revalidate = useCallback(async () => {
    const atuais = items;
    if (!atuais.length) {
      setChanges([]);
      return;
    }
    let linhas;
    try {
      linhas = await revalidarCarrinho(
        atuais.map((i) => ({ id: i.id, productId: i.productId, variantId: i.variantId })),
      );
    } catch {
      // Sem rede, o carrinho continua valendo como estava: o checkout
      // reconfere de novo, no servidor, antes de cobrar.
      return;
    }

    const porId = new Map(linhas.map((l) => [l.id, l.atual]));
    const novasMudancas: CartChange[] = [];

    // A lista nova é montada AQUI, fora do `setItems`.
    //
    // Antes isto morava dentro do updater, que empurrava em `novasMudancas`
    // enquanto mapeava. Updater de estado tem que ser puro: o React chama a
    // função mais de uma vez (em desenvolvimento, sempre), e cada chamada
    // repetia os avisos — o cliente lia "subiu de R$ 279,90 para R$ 299,90"
    // duas vezes, como se fossem dois produtos.
    const novaLista = atuais.flatMap((item) => {
      // Linha que o servidor não conhece (carrinho antigo, id estranho):
      // deixa como está em vez de apagar a compra do cliente.
      if (!porId.has(item.id)) return [item];

      const atual = porId.get(item.id) ?? null;
      if (!atual) {
        novasMudancas.push({ id: item.id, name: item.name, tipo: "indisponivel" });
        return [];
      }

      if (atual.price !== item.price) {
        novasMudancas.push({
          id: item.id,
          name: item.name,
          tipo: "preco",
          de: item.price,
          para: atual.price,
        });
      }

      const qty = Math.max(1, Math.min(item.qty, atual.stock));
      if (qty < item.qty) {
        novasMudancas.push({ id: item.id, name: atual.name, tipo: "estoque", qty });
      }

      return [
        {
          ...item,
          name: atual.name,
          slug: atual.slug,
          price: atual.price,
          stock: atual.stock,
          image: atual.image,
          variantLabel: atual.variantLabel ?? item.variantLabel,
          qty,
        },
      ];
    });

    // Grava sempre: além do preço, isto atualiza nome, foto e rótulo da
    // variante de um carrinho antigo, sem avisar nada ao cliente — não é
    // informação que mude a decisão dele.
    setItems(novaLista);
    setChanges(novasMudancas);
  }, [items]);

  // Uma reconferência assim que o carrinho sai do storage. É aqui que o
  // preço de ontem vira o preço de hoje, antes de o cliente somar a conta de
  // cabeça e achar que o checkout aumentou o valor na cara dele.
  useEffect(() => {
    if (!isReady || jaConferiu.current) return;
    jaConferiu.current = true;
    void revalidate();
  }, [isReady, revalidate]);

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
      changes,
      dismissChanges: () => setChanges([]),
      revalidate,
    };
  }, [items, isReady, changes, revalidate]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
