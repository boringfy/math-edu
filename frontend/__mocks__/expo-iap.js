/** StoreKit and Google Play Billing need a signed native build; Jest uses this boundary. */
const fetchProducts = jest.fn(async () => undefined);
const requestPurchase = jest.fn(async () => undefined);
const finishTransaction = jest.fn(async () => undefined);

module.exports = {
  useIAP: jest.fn(() => ({
    connected: false,
    products: [],
    fetchProducts,
    requestPurchase,
    finishTransaction,
  })),
  isUserCancelledError: (error) => error?.code === 'user-cancelled',
};
