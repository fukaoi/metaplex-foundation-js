import {
  CandyMachine,
  Metaplex,
  Nft,
  NftWithToken,
  now,
  sol,
  toBigNumber,
  toDateTime,
  token,
} from '@/index';
import { TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { Keypair, PublicKey } from '@solana/web3.js';
import spok, { Specifications } from 'spok';
import test, { Test } from 'tape';
import {
  assertThrows,
  killStuckProcess,
  metaplex,
  spokSameAmount,
  spokSameBignum,
  spokSamePubkey,
} from '../../helpers';
import { createCandyMachine } from './helpers';

killStuckProcess();

test('[candyMachineModule] it can mint from a Candy Machine directly as the mint authority', async (t) => {
  // Given a loaded Candy Machine with a mint authority.
  const mx = await metaplex();
  const candyMachineAuthority = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    withoutCandyGuard: true,
    authority: candyMachineAuthority,
    itemsAvailable: toBigNumber(2),
    symbol: 'CANDY',
    sellerFeeBasisPoints: 123,
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
  });

  // When we mint an NFT from the candy machine using the mint authority.
  const { nft } = await mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      mintAuthority: candyMachineAuthority,
    })
    .run();

  // Then minting was successful.
  await assertMintingWasSuccessful(t, mx, {
    candyMachine,
    collectionUpdateAuthority: collection.updateAuthority.publicKey,
    nft,
    owner: mx.identity().publicKey,
  });
});

test('[candyMachineModule] it cannot mint from a Candy Machine directly if not the mint authority', async (t) => {
  // Given a loaded Candy Machine with a mint authority.
  const mx = await metaplex();
  const candyMachineAuthority = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    withoutCandyGuard: true,
    authority: candyMachineAuthority,
    itemsAvailable: toBigNumber(2),
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
  });

  // When we try to mint an NFT using another mint authority.
  const wrongMintAuthority = Keypair.generate();
  const promise = mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      mintAuthority: wrongMintAuthority,
    })
    .run();

  // Then we expect an error.
  await assertThrows(t, promise, /A has_one constraint was violated/);
});

test('[candyMachineModule] it can mint from a Candy Guard with no guards', async (t) => {
  // Given a loaded Candy Machine with a Candy Guard.
  const mx = await metaplex();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(2),
    symbol: 'CANDY',
    sellerFeeBasisPoints: 123,
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
  });

  // When we mint an NFT from this candy machine.
  const { nft } = await mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
    })
    .run();

  // Then minting was successful.
  await assertMintingWasSuccessful(t, mx, {
    candyMachine,
    collectionUpdateAuthority: collection.updateAuthority.publicKey,
    nft,
    owner: mx.identity().publicKey,
  });
});

test.only('[candyMachineModule] it can mint from a Candy Guard with some guards', async (t) => {
  // Given a loaded Candy Machine with some guards.
  const mx = await metaplex();
  const treasury = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(2),
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
    guards: {
      liveDate: {
        date: toDateTime(now().subn(3600 * 24)), // Yesterday.
      },
      lamports: {
        amount: sol(1),
        destination: treasury.publicKey,
      },
    },
  });

  // When we mint an NFT from this candy machine.
  const { nft } = await mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
    })
    .run();

  // Then minting was successful.
  await assertMintingWasSuccessful(t, mx, {
    candyMachine,
    collectionUpdateAuthority: collection.updateAuthority.publicKey,
    nft,
    owner: mx.identity().publicKey,
  });
});

test.skip("[candyMachineModule] it throws a bot tax error if minting succeeded but we couldn't find the mint NFT", async (t) => {
  //
});

test.skip('[candyMachineModule] it can mint from a Candy Guard with groups', async (t) => {
  //
});

test.skip('[candyMachineModule] it cannot mint using the default guards if the Candy Guard has groups', async (t) => {
  //
});

test.skip('[candyMachineModule] it cannot mint using a labelled group if the Candy Guard has no groups', async (t) => {
  //
});

test.skip('[candyMachineModule] it cannot mint from a Candy Guard with groups if the provided group label does not exist', async (t) => {
  //
});

const assertMintingWasSuccessful = async (
  t: Test,
  metaplex: Metaplex,
  input: {
    candyMachine: CandyMachine;
    collectionUpdateAuthority: PublicKey;
    nft: NftWithToken;
    owner: PublicKey;
    mintedIndex?: number;
  }
) => {
  const candyMachine = input.candyMachine;
  const mintedIndex = input.mintedIndex ?? candyMachine.itemsMinted.toNumber();
  const expectedItemMinted = candyMachine.items[mintedIndex];

  // Then an NFT was created with the right data.
  spok(t, input.nft, {
    $topic: 'Minted NFT',
    model: 'nft',
    name: expectedItemMinted.name,
    uri: expectedItemMinted.uri,
    symbol: candyMachine.symbol,
    sellerFeeBasisPoints: candyMachine.sellerFeeBasisPoints,
    tokenStandard: TokenStandard.NonFungible,
    isMutable: candyMachine.isMutable,
    primarySaleHappened: true,
    updateAuthorityAddress: spokSamePubkey(input.collectionUpdateAuthority),
    creators: [
      {
        address: spokSamePubkey(
          metaplex.candyMachines().pdas().authority({
            candyMachine: candyMachine.address,
          })
        ),
        verified: true,
        share: 0,
      },
      ...candyMachine.creators.map((creator) => ({
        address: spokSamePubkey(creator.address),
        verified: false,
        share: creator.share,
      })),
    ],
    edition: {
      model: 'nftEdition',
      isOriginal: true,
      supply: spokSameBignum(toBigNumber(0)),
      maxSupply: spokSameBignum(candyMachine.maxEditionSupply),
    },
    token: {
      model: 'token',
      ownerAddress: spokSamePubkey(input.owner),
      mintAddress: spokSamePubkey(input.nft.address),
      amount: spokSameAmount(token(1, 0, candyMachine.symbol)),
    },
  } as Specifications<Nft>);

  // And the Candy Machine data was updated.
  const expectedMinted = candyMachine.itemsMinted.addn(1);
  const expectedRemaining = candyMachine.itemsAvailable.sub(expectedMinted);
  const updatedCandyMachine = await metaplex
    .candyMachines()
    .refresh(candyMachine)
    .run();
  spok(t, updatedCandyMachine, {
    $topic: 'Update Candy Machine',
    itemsAvailable: spokSameBignum(candyMachine.itemsAvailable),
    itemsMinted: spokSameBignum(expectedMinted),
    itemsRemaining: spokSameBignum(expectedRemaining),
  } as Specifications<CandyMachine>);
  t.true(
    updatedCandyMachine.items[mintedIndex].minted,
    'Item was marked as minted'
  );
};