import { Text } from 'react-native';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { useIAP, type Purchase } from 'expo-iap';
import { isTipProduct, newTipChallenge, TIP_PRODUCTS, TipProvider, TipStore, useTips } from '../tips';

const mockUseIAP = useIAP as jest.Mock;
const fetchProducts = jest.fn(async () => undefined);
const requestPurchase = jest.fn(async () => undefined);
const finishTransaction = jest.fn(async () => undefined);
let callbacks: Parameters<typeof useIAP>[0];
let tips: TipStore;
let tree: ReactTestRenderer;

function Probe() {
  tips = useTips();
  return <Text>{tips.message}</Text>;
}

const purchase = (productId = 'tip_099') => ({
  store: 'apple', id: 'txn-1', productId, purchaseState: 'purchased',
}) as Purchase;

beforeEach(async () => {
  jest.clearAllMocks();
  mockUseIAP.mockImplementation((options) => {
    callbacks = options;
    return {
      connected: true,
      products: TIP_PRODUCTS.map((tip) => ({ id: tip.id, displayPrice: tip.usd })),
      fetchProducts, requestPurchase, finishTransaction,
    };
  });
  await act(async () => { tree = create(<TipProvider nativeAvailable><Probe /></TipProvider>); });
});

afterEach(() => act(() => tree.unmount()));

it('maps the four requested amounts to unique consumable product IDs', () => {
  expect(TIP_PRODUCTS.map((tip) => tip.usd)).toEqual(['$0.99', '$2.99', '$5.99', '$9.99']);
  expect(new Set(TIP_PRODUCTS.map((tip) => tip.id)).size).toBe(4);
  expect(isTipProduct('tip_299')).toBe(true);
  expect(isTipProduct('not_a_tip')).toBe(false);
  expect(newTipChallenge(() => 0)).toEqual({ a: 31, b: 13, answer: 403 });
});

it('keeps the rest of the app usable when an older build lacks the native store', () => {
  mockUseIAP.mockClear();
  let fallback!: TipStore;
  function FallbackProbe() {
    fallback = useTips();
    return null;
  }
  let other!: ReactTestRenderer;
  act(() => { other = create(<TipProvider nativeAvailable={false}><FallbackProbe /></TipProvider>); });
  expect(mockUseIAP).not.toHaveBeenCalled();
  expect(fallback.connected).toBe(false);
  expect(fallback.message).toContain('App Store or Google Play build');
  act(() => other.unmount());
});

it('fetches only the four in-app products and requests native checkout on both platforms', async () => {
  expect(fetchProducts).toHaveBeenCalledWith({
    skus: TIP_PRODUCTS.map((tip) => tip.id), type: 'in-app',
  });
  await act(async () => { await tips.buy('tip_299'); });
  expect(requestPurchase).toHaveBeenCalledWith({
    request: { apple: { sku: 'tip_299' }, google: { skus: ['tip_299'] } },
    type: 'in-app',
  });
  await act(async () => { await tips.buy('not_a_tip'); });
  expect(requestPurchase).toHaveBeenCalledTimes(1);
});

it('finishes a successful tip as a consumable and thanks the buyer', async () => {
  await act(async () => { callbacks?.onPurchaseSuccess?.(purchase()); });
  expect(finishTransaction).toHaveBeenCalledWith({ purchase: purchase(), isConsumable: true });
  expect(tips.message).toContain('Thank you');
  await act(async () => { callbacks?.onPurchaseSuccess?.(purchase('not_a_tip')); });
  expect(finishTransaction).toHaveBeenCalledTimes(1);
});

it('does not finish an unapproved purchase and releases a stalled checkout', async () => {
  jest.useFakeTimers();
  try {
    await act(async () => { await tips.buy('tip_099'); });
    expect(tips.busy).toBe(true);
    await act(async () => { callbacks?.onPurchaseSuccess?.({ ...purchase(), purchaseState: 'pending' }); });
    expect(finishTransaction).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(60_000));
    expect(tips.busy).toBe(false);
    expect(tips.message).toContain('Waiting for the store');
  } finally {
    jest.useRealTimers();
  }
});

it('shows an error if consuming fails, allowing a replay to retry', async () => {
  finishTransaction.mockRejectedValueOnce(new Error('store unavailable'));
  await act(async () => { callbacks?.onPurchaseSuccess?.(purchase()); });
  expect(tips.message).toContain('could not be completed');
  await act(async () => { callbacks?.onPurchaseSuccess?.(purchase()); });
  expect(finishTransaction).toHaveBeenCalledTimes(2);
});

it('does not confuse a cancelled purchase with a failed one', async () => {
  await act(async () => { callbacks?.onPurchaseError?.({ code: 'user-cancelled' } as never); });
  expect(tips.message).toBeNull();
  await act(async () => { callbacks?.onPurchaseError?.({ code: 'store-error' } as never); });
  expect(tips.message).toContain('could not complete');
});
