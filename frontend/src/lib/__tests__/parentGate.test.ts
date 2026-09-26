/** Android's screen pinning switch requires the device PIN to turn off. */
const mockCredentialAvailable = jest.fn();
const mockConfirmCredential = jest.fn();

jest.mock('../../../modules/app-lock', () => ({
  deviceCredentialAvailable: () => mockCredentialAvailable(),
  confirmDeviceCredential: (reason: string) => mockConfirmCredential(reason),
}));

import { askGrownUp, gateAvailable } from '../parentGate';

beforeEach(() => {
  jest.clearAllMocks();
  mockCredentialAvailable.mockReturnValue(true);
  mockConfirmCredential.mockResolvedValue(true);
});

it('asks for the device credential when one is enrolled', async () => {
  await expect(gateAvailable()).resolves.toBe(true);
  await expect(askGrownUp('Unlock the tablet')).resolves.toEqual({ allowed: true, asked: true });
  expect(mockConfirmCredential).toHaveBeenCalledWith('Unlock the tablet');
});

it('refuses cancelled or failed credential checks', async () => {
  mockConfirmCredential.mockResolvedValue(false);
  await expect(askGrownUp('Unlock the tablet')).resolves.toEqual({ allowed: false });
});

it('fails closed if the device prompt throws', async () => {
  mockConfirmCredential.mockRejectedValue(new Error('no activity'));
  await expect(askGrownUp('Unlock the tablet')).resolves.toEqual({ allowed: false });
});

it('allows the switch when no device credential is configured', async () => {
  mockCredentialAvailable.mockReturnValue(false);
  await expect(gateAvailable()).resolves.toBe(false);
  await expect(askGrownUp('Unlock the tablet')).resolves.toEqual({ allowed: true, asked: false });
  expect(mockConfirmCredential).not.toHaveBeenCalled();
});
