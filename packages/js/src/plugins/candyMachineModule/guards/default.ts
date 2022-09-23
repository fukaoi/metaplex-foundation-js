import { Option } from '@/utils';
import { AllowListGuardSettings } from './allowList';
import { BotTaxGuardSettings } from './botTax';
import { CandyGuardsMintSettings, CandyGuardsSettings } from './core';
import { EndSettingsGuardSettings } from './endSettings';
import { GatekeeperGuardSettings } from './gatekeeper';
import { LamportsGuardSettings } from './lamports';
import { LiveDateGuardSettings } from './liveDate';
import { MintLimitGuardSettings } from './mintLimit';
import { NftPaymentGuardSettings } from './nftPayment';
import { SplTokenGuardMintSettings, SplTokenGuardSettings } from './splToken';
import { ThirdPartySignerGuardSettings } from './thirdPartySigner';
import { WhitelistGuardSettings } from './whitelist';

export type DefaultCandyGuardSettings = CandyGuardsSettings & {
  botTax: Option<BotTaxGuardSettings>;
  lamports: Option<LamportsGuardSettings>;
  splToken: Option<SplTokenGuardSettings>;
  liveDate: Option<LiveDateGuardSettings>;
  thirdPartySigner: Option<ThirdPartySignerGuardSettings>;
  whitelist: Option<WhitelistGuardSettings>;
  gatekeeper: Option<GatekeeperGuardSettings>;
  endSettings: Option<EndSettingsGuardSettings>;
  allowList: Option<AllowListGuardSettings>;
  mintLimit: Option<MintLimitGuardSettings>;
  nftPayment: Option<NftPaymentGuardSettings>;
};

export type DefaultCandyGuardMintSettings = CandyGuardsMintSettings & {
  // botTax: no mint settings
  // lamports: no mint settings
  splToken: Option<SplTokenGuardMintSettings>;
  // liveDate: no mint settings
  thirdPartySigner: Option<{}>; // TODO
  whitelist: Option<{}>; // TODO
  gatekeeper: Option<{}>; // TODO
  // endSettings: no mint settings // TODO
  allowList: Option<{}>; // TODO
  mintLimit: Option<{}>; // TODO
  nftPayment: Option<{}>; // TODO
};

/** @internal */
export const defaultCandyGuardNames: string[] = [
  'botTax',
  'lamports',
  'splToken',
  'liveDate',
  'thirdPartySigner',
  'whitelist',
  'gatekeeper',
  'endSettings',
  'allowList',
  'mintLimit',
  'nftPayment',
];

/** @internal */
export const emptyDefaultCandyGuardSettings: {
  [key in keyof DefaultCandyGuardSettings]: null;
} = defaultCandyGuardNames.reduce((acc, name) => {
  acc[name] = null;
  return acc;
}, {} as { [key in keyof DefaultCandyGuardSettings]: null });
