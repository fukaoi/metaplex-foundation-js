import { createSerializerFromBeet } from '@/types';
import { AllowList, allowListBeet } from '@metaplex-foundation/mpl-candy-guard';
import { CandyGuardManifest } from './core';

/** TODO */
export type AllowListGuardSettings = AllowList;

/** @internal */
export const allowListGuardManifest: CandyGuardManifest<AllowList> = {
  name: 'allowList',
  settingsBytes: 32,
  settingsSerializer: createSerializerFromBeet(allowListBeet),
};
