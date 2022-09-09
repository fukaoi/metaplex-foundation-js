import type { Metaplex } from '@/Metaplex';
import { MetaplexPlugin } from '@/types';
import { CandyMachineClient } from './CandyMachineClient';
import {
  allowListGuardManifest,
  botTaxGuardManifest,
  endSettingsGuardManifest,
  gatekeeperGuardManifest,
  lamportsGuardManifest,
  liveDateGuardManifest,
  mintLimitGuardManifest,
  splTokenGuardManifest,
  thirdPartySignerGuardManifest,
  whitelistGuardManifest,
} from './guards';
import {
  createCandyGuardOperation,
  createCandyGuardOperationHandler,
  findCandyGuardByAddressOperation,
  findCandyGuardByAddressOperationHandler,
  findCandyGuardsByAuthorityOperation,
  findCandyGuardsByAuthorityOperationHandler,
  updateCandyGuardOperation,
  updateCandyGuardOperationHandler,
} from './operations';
import { DefaultCandyGuardProgram } from './programs';

/** @group Plugins */
export const candyMachineModule = (): MetaplexPlugin => ({
  install(metaplex: Metaplex) {
    // Client.
    const client = new CandyMachineClient(metaplex);
    metaplex.candyMachines = () => client;

    // Program.
    metaplex.programs().register(DefaultCandyGuardProgram);

    // Default Guards.
    client.guards().register(botTaxGuardManifest);
    client.guards().register(liveDateGuardManifest);
    client.guards().register(lamportsGuardManifest);
    client.guards().register(splTokenGuardManifest);
    client.guards().register(thirdPartySignerGuardManifest);
    client.guards().register(whitelistGuardManifest);
    client.guards().register(gatekeeperGuardManifest);
    client.guards().register(endSettingsGuardManifest);
    client.guards().register(allowListGuardManifest);
    client.guards().register(mintLimitGuardManifest);

    // Operations.
    const op = metaplex.operations();
    op.register(createCandyGuardOperation, createCandyGuardOperationHandler);
    op.register(
      findCandyGuardByAddressOperation(),
      findCandyGuardByAddressOperationHandler
    );
    op.register(
      findCandyGuardsByAuthorityOperation(),
      findCandyGuardsByAuthorityOperationHandler
    );
    op.register(updateCandyGuardOperation, updateCandyGuardOperationHandler);
  },
});

declare module '../../Metaplex' {
  interface Metaplex {
    candyMachines(): CandyMachineClient;
  }
}