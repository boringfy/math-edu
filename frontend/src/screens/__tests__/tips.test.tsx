import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { useIAP } from 'expo-iap';
import { emptyProfiles } from '../../lib/profiles';
import { TIP_PRODUCTS, TipProvider } from '../../lib/tips';
import { DEFAULT_SETTINGS } from '../../types';
import SettingsScreen from '../SettingsScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockUseIAP = useIAP as jest.Mock;
const requestPurchase = jest.fn(async () => undefined);
let tree: ReactTestRenderer;
const localPrice = (usd: string) => `€${usd.slice(1).replace('.', ',')}`;

const button = (label: string) => tree.root.find((node) => node.props.accessibilityLabel === label);
const press = async (label: string) => act(async () => { button(label).props.onPress(); });

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0);
  mockUseIAP.mockImplementation(() => ({
    connected: true,
    products: TIP_PRODUCTS.map((tip) => ({ id: tip.id, displayPrice: localPrice(tip.usd) })),
    fetchProducts: jest.fn(async () => undefined),
    requestPurchase,
    finishTransaction: jest.fn(async () => undefined),
  }));
  await act(async () => {
    tree = create(
      <TipProvider nativeAvailable>
        <SettingsScreen
          profiles={emptyProfiles()}
          onAddProfile={() => {}}
          onRenameProfile={() => {}}
          onRemoveProfile={() => {}}
          settings={DEFAULT_SETTINGS}
          onChange={() => {}}
          grades={{ math: 1, logic: 1, reading: 1 }}
          onGradeChange={() => {}}
          onBack={() => {}}
        />
      </TipProvider>,
    );
  });
});

afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
});

it('keeps tip products behind a grown-up question and rejects an incorrect answer', async () => {
  expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Send €0,99 tip')).toHaveLength(0);
  await press('Open grown-up options');
  expect(JSON.stringify(tree.toJSON())).toContain('31');
  expect(JSON.stringify(tree.toJSON())).toContain('13');
  await act(async () => { button('Grown-up answer').props.onChangeText('1'); });
  await press('Continue to tips');
  expect(JSON.stringify(tree.toJSON())).toContain('Ask a grown-up to help');
  expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Send €0,99 tip')).toHaveLength(0);
});

it('shows all four store-priced options after the right answer and starts the selected purchase', async () => {
  await press('Open grown-up options');
  await act(async () => { button('Grown-up answer').props.onChangeText('403'); });
  await press('Continue to tips');
  for (const tip of TIP_PRODUCTS) {
    expect(button(`Send ${localPrice(tip.usd)} tip`)).toBeTruthy();
  }
  await press('Send €5,99 tip');
  expect(requestPurchase).toHaveBeenCalledWith({
    request: { apple: { sku: 'tip_599' }, google: { skus: ['tip_599'] } },
    type: 'in-app',
  });
  await press('Close tips');
  expect(tree.root.findAll((node) => node.props.accessibilityLabel === 'Send €0,99 tip')).toHaveLength(0);
});
