import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useIAP, isUserCancelledError, type Product, type Purchase } from 'expo-iap';
import { requireOptionalNativeModule } from 'expo-modules-core';

/** Create these as consumable one-time products in both stores at the USD prices below. */
export const TIP_PRODUCTS = [
  { id: 'tip_099', usd: '$0.99' },
  { id: 'tip_299', usd: '$2.99' },
  { id: 'tip_599', usd: '$5.99' },
  { id: 'tip_999', usd: '$9.99' },
] as const;

const TIP_IDS = TIP_PRODUCTS.map((tip) => tip.id);
export const isTipProduct = (id: string): boolean => TIP_IDS.includes(id as typeof TIP_IDS[number]);

/** An adult-level question keeps purchasing out of the child's ordinary settings flow. */
export function newTipChallenge(rng: () => number = Math.random) {
  const a = 31 + Math.floor(rng() * 59);
  const b = 13 + Math.floor(rng() * 17);
  return { a, b, answer: a * b };
}

export interface TipStore {
  connected: boolean;
  products: Pick<Product, 'id' | 'displayPrice'>[];
  busy: boolean;
  message: string | null;
  buy: (id: string) => Promise<void>;
}

const TipContext = createContext<TipStore>({
  connected: false,
  products: [],
  busy: false,
  message: 'Tips require an App Store or Google Play build.',
  buy: async () => {},
});

export const useTips = (): TipStore => useContext(TipContext);

export function TipProvider({ children, nativeAvailable = !!requireOptionalNativeModule('ExpoIap') }: {
  children: React.ReactNode;
  nativeAvailable?: boolean;
}) {
  // expo-iap registers native listeners before its connection try/catch. Do
  // not mount that hook in Expo Go or an older binary lacking the module.
  if (!nativeAvailable) return <>{children}</>;
  return <NativeTipProvider>{children}</NativeTipProvider>;
}

function NativeTipProvider({ children }: { children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const buying = useRef(false);
  const finishing = useRef(new Set<string>());
  const purchaseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const releaseCheckout = () => {
    if (purchaseTimeout.current !== null) clearTimeout(purchaseTimeout.current);
    purchaseTimeout.current = null;
    buying.current = false;
    setBusy(false);
  };

  useEffect(() => () => {
    if (purchaseTimeout.current !== null) clearTimeout(purchaseTimeout.current);
  }, []);

  const complete = useCallback(async (purchase: Purchase) => {
    if (!isTipProduct(purchase.productId) || purchase.purchaseState !== 'purchased') return;
    const key = `${purchase.store}:${purchase.id}`;
    if (finishing.current.has(key)) return;
    finishing.current.add(key);
    try {
      // Tips grant no coins, levels, or other entitlement. Consume immediately
      // so the same amount can be tipped again and Android does not refund it.
      await finishTransaction({ purchase, isConsumable: true });
      setMessage('Thank you for supporting Have Fun Learning!');
    } catch {
      finishing.current.delete(key); // a replay may retry an unfinished transaction
      setMessage('Your tip could not be completed. Please try again later.');
    } finally {
      releaseCheckout();
    }
  }, []);

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: (purchase) => { void complete(purchase); },
    onPurchaseError: (error) => {
      releaseCheckout();
      if (!isUserCancelledError(error)) setMessage('The store could not complete this tip. Please try again.');
    },
    onError: () => setMessage('The store is unavailable right now. Please try again later.'),
  });

  useEffect(() => {
    if (!connected) return;
    void fetchProducts({ skus: TIP_IDS, type: 'in-app' }).catch(() => {
      setMessage('Tip options could not be loaded from the store.');
    });
  }, [connected, fetchProducts]);

  const buy = useCallback(async (id: string) => {
    if (!connected || !isTipProduct(id) || !products.some((product) => product.id === id) || buying.current) return;
    buying.current = true;
    setBusy(true);
    setMessage(null);
    // A deferred family approval may not produce a callback in this session.
    // Never leave the Settings buttons disabled indefinitely.
    purchaseTimeout.current = setTimeout(() => {
      releaseCheckout();
      setMessage('Waiting for the store to confirm your tip. You can check back later.');
    }, 60_000);
    try {
      await requestPurchase({
        request: { apple: { sku: id }, google: { skus: [id] } },
        type: 'in-app',
      });
    } catch (error) {
      releaseCheckout();
      if (!isUserCancelledError(error)) setMessage('The store could not start this tip. Please try again.');
    }
  }, [connected, products, requestPurchase]);

  return (
    <TipContext.Provider value={{ connected, products, busy, message, buy }}>
      {children}
    </TipContext.Provider>
  );
}
