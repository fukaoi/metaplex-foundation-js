import { CandyMachine, toBigNumber } from '@/index';
import { Keypair } from '@solana/web3.js';
import spok, { Specifications } from 'spok';
import test from 'tape';
import {
  assertThrows,
  assertThrowsFn,
  createCollectionNft,
  killStuckProcess,
  metaplex,
  spokSameBignum,
  spokSamePubkey,
} from '../../helpers';
import { create32BitsHash, createCandyMachine } from './helpers';

killStuckProcess();

test('[candyMachineModule] it can update the data of a candy machine', async (t) => {
  // Given a Candy Machine with the following data.
  const mx = await metaplex();
  const creatorA = Keypair.generate().publicKey;
  const candyMachine = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(1000),
    symbol: 'OLD',
    sellerFeeBasisPoints: 100,
    maxEditionSupply: toBigNumber(1),
    isMutable: true,
    creators: [{ address: creatorA, share: 100 }],
    itemSettings: {
      type: 'configLines',
      prefixName: 'My Old NFT #',
      nameLength: 4,
      prefixUri: 'https://arweave.net/',
      uriLength: 50,
      isSequential: true,
    },
  });

  // When we update its data.
  const creatorB = Keypair.generate().publicKey;
  await mx
    .candyMachines()
    .update({
      candyMachine,
      itemsAvailable: toBigNumber(1000), // Cannot be updated.
      symbol: 'NEW',
      sellerFeeBasisPoints: 200,
      maxEditionSupply: toBigNumber(2),
      isMutable: false,
      creators: [{ address: creatorB, share: 100 }],
      itemSettings: {
        type: 'configLines',
        prefixName: 'My Old NFT #$ID+1$',
        nameLength: 0,
        prefixUri: 'https://my.app.com/nfts/$ID+1$',
        uriLength: 0,
        isSequential: false,
      },
    })
    .run();

  // Then the Candy Machine's data was updated accordingly.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  spok(t, updatedCandyMachine, {
    $topic: 'Updated Candy Machine',
    model: 'candyMachine',
    address: spokSamePubkey(candyMachine.address),
    authorityAddress: spokSamePubkey(candyMachine.authorityAddress),
    mintAuthorityAddress: spokSamePubkey(candyMachine.mintAuthorityAddress),
    collectionMintAddress: spokSamePubkey(candyMachine.collectionMintAddress),
    symbol: 'NEW',
    sellerFeeBasisPoints: 200,
    isMutable: false,
    maxEditionSupply: spokSameBignum(2),
    creators: [{ address: spokSamePubkey(creatorB), share: 100 }],
    items: [],
    itemsAvailable: spokSameBignum(1000),
    itemsMinted: spokSameBignum(0),
    itemsRemaining: spokSameBignum(1000),
    itemsLoaded: 0,
    isFullyLoaded: false,
    itemSettings: {
      type: 'configLines',
      prefixName: 'My Old NFT #$ID+1$',
      nameLength: 0,
      prefixUri: 'https://my.app.com/nfts/$ID+1$',
      uriLength: 0,
      isSequential: false,
    },
    candyGuard: {
      model: 'candyGuard',
      address: spokSamePubkey(candyMachine.candyGuard?.address),
    },
  } as unknown as Specifications<CandyMachine>);
});

test('[candyMachineModule] it cannot update the number of items when using config line settings', async (t) => {
  // Given a Candy Machine using config line settings with 1000 items.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(1000),
    itemSettings: {
      type: 'configLines',
      prefixName: 'My Old NFT #',
      nameLength: 4,
      prefixUri: 'https://arweave.net/',
      uriLength: 50,
      isSequential: true,
    },
  });

  // When we try to update the number of items to 2000.
  const promise = mx
    .candyMachines()
    .update({ candyMachine, itemsAvailable: toBigNumber(2000) })
    .run();

  // Then we get an error from the Program.
  await assertThrows(t, promise, /CannotChangeNumberOfLines/);
});

test('[candyMachineModule] it can update the number of items when using hidden settings', async (t) => {
  // Given a Candy Machine using hidden settings with 1000 items.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(1000),
    itemSettings: {
      type: 'hidden',
      name: 'My NFT #$ID+1$',
      uri: 'https://my.app.com/nfts/$ID+1$.json',
      hash: create32BitsHash('some-file'),
    },
  });

  // When we update the number of items to 2000.
  await mx
    .candyMachines()
    .update({ candyMachine, itemsAvailable: toBigNumber(2000) })
    .run();

  // Then the Candy Machine's data was updated accordingly.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  t.equal(updatedCandyMachine.itemsAvailable.toNumber(), 2000);
});

test('[candyMachineModule] it can update the hidden settings of a candy machine', async (t) => {
  // Given a Candy Machine using the following hidden settings.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx, {
    itemSettings: {
      type: 'hidden',
      name: 'My Old NFT #$ID+1$',
      uri: 'https://old.app.com/nfts/$ID+1$.json',
      hash: create32BitsHash('some-old-file'),
    },
  });

  // When we update its hidden settings to the following.
  await mx
    .candyMachines()
    .update({
      candyMachine,
      itemSettings: {
        type: 'hidden',
        name: 'My NFT NFT #$ID+1$',
        uri: 'https://nft.app.com/nfts/$ID+1$.json',
        hash: create32BitsHash('some-new-file'),
      },
    })
    .run();

  // Then the Candy Machine's data was updated accordingly.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  t.same(updatedCandyMachine.itemSettings, {
    type: 'hidden',
    name: 'My NFT NFT #$ID+1$',
    uri: 'https://nft.app.com/nfts/$ID+1$.json',
    hash: create32BitsHash('some-new-file'),
  });
});

test('[candyMachineModule] it cannot go from hidden settings to config line settings', async (t) => {
  // Given a Candy Machine using the following hidden settings.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx, {
    itemSettings: {
      type: 'hidden',
      name: 'My NFT #$ID+1$',
      uri: 'https://my.app.com/nfts/$ID+1$.json',
      hash: create32BitsHash('some-file'),
    },
  });

  // When we try to update it so it uses config line settings instead.
  const promise = mx
    .candyMachines()
    .update({
      candyMachine,
      itemSettings: {
        type: 'configLines',
        prefixName: 'My NFT #',
        nameLength: 4,
        prefixUri: 'https://arweave.net/',
        uriLength: 50,
        isSequential: true,
      },
    })
    .run();

  // Then we expect an error from the Program.
  await assertThrows(t, promise, /CannotSwitchFromHiddenSettings/);
});

test('[candyMachineModule] it cannot go from config line settings to hidden settings', async (t) => {
  // Given a Candy Machine using the following config line settings.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx, {
    itemSettings: {
      type: 'configLines',
      prefixName: 'My NFT #',
      nameLength: 4,
      prefixUri: 'https://arweave.net/',
      uriLength: 50,
      isSequential: true,
    },
  });

  // When we try to update it so it uses hidden settings instead.
  const promise = mx
    .candyMachines()
    .update({
      candyMachine,
      itemSettings: {
        type: 'hidden',
        name: 'My NFT #$ID+1$',
        uri: 'https://my.app.com/nfts/$ID+1$.json',
        hash: create32BitsHash('some-file'),
      },
    })
    .run();

  // Then we expect an error from the Program.
  await assertThrows(t, promise, /CannotSwitchToHiddenSettings/);
});

test('[candyMachineModule] updating part of the data does not override the rest of it', async (t) => {
  // Given a Candy Machine with the following data.
  const mx = await metaplex();
  const creatorA = Keypair.generate().publicKey;
  const candyMachine = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(1000),
    symbol: 'MYNFT',
    sellerFeeBasisPoints: 100,
    maxEditionSupply: toBigNumber(1),
    isMutable: true,
    creators: [{ address: creatorA, share: 100 }],
    itemSettings: {
      type: 'configLines',
      prefixName: 'My NFT #',
      nameLength: 4,
      prefixUri: 'https://arweave.net/',
      uriLength: 50,
      isSequential: true,
    },
  });

  // When we only update its symbol.
  await mx.candyMachines().update({ candyMachine, symbol: 'NEW' }).run();

  // Then the rest of the data is still the same.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  spok(t, updatedCandyMachine, {
    $topic: 'Updated Candy Machine',
    model: 'candyMachine',
    symbol: 'NEW',
    sellerFeeBasisPoints: 100,
    isMutable: true,
    maxEditionSupply: spokSameBignum(1),
    creators: [{ address: spokSamePubkey(creatorA), share: 100 }],
    itemsAvailable: spokSameBignum(1000),
    itemSettings: {
      type: 'configLines',
      prefixName: 'My NFT #',
      nameLength: 4,
      prefixUri: 'https://arweave.net/',
      uriLength: 50,
      isSequential: true,
    },
  } as unknown as Specifications<CandyMachine>);
});

test('[candyMachineModule] it fails when the provided data to update misses properties', async (t) => {
  // Given an existing Candy Machine.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx);

  // When we try to update part of its data by providing the Candy Machine as a public key.
  const promise = mx
    .candyMachines()
    .update({ candyMachine: candyMachine.address, symbol: 'NEW' })
    .run();

  // Then we expect an error telling us some data is missing from the input.
  await assertThrowsFn(t, promise, (error) => {
    const missingProperties =
      '[itemsAvailable, sellerFeeBasisPoints, maxEditionSupply, isMutable, creators, itemSettings]';
    t.equal(error.key, 'metaplex.errors.sdk.missing_input_data');
    t.ok(error.solution.includes(missingProperties));
  });
});

test.skip('[candyMachineModule] it can update the authorities of a candy machine', async (t) => {
  // TODO: waiting on program update.
});

test.skip('[candyMachineModule] updating one authority does not override the other', async (t) => {
  // TODO: waiting on program update.
});

test.skip('[candyMachineModule] it fails when the provided authorities to update miss properties', async (t) => {
  // TODO: waiting on program update.
});

test('[candyMachineModule] it can update the collection of a candy machine', async (t) => {
  // Given a Candy Machine associated to Collection A.
  const mx = await metaplex();
  const collectionUpdateAuthorityA = Keypair.generate();
  const collectionA = await createCollectionNft(mx, {
    updateAuthority: collectionUpdateAuthorityA,
  });
  const candyMachine = await createCandyMachine(mx, {
    collection: {
      address: collectionA.address,
      updateAuthority: collectionUpdateAuthorityA,
    },
  });

  // When we update its collection to Collection B.
  const collectionUpdateAuthorityB = Keypair.generate();
  const collectionB = await createCollectionNft(mx, {
    updateAuthority: collectionUpdateAuthorityB,
  });
  await mx
    .candyMachines()
    .update({
      candyMachine,
      collection: {
        address: collectionB.address,
        updateAuthority: collectionUpdateAuthorityB,
      },
    })
    .run();

  // Then the Candy Machine's collection was updated accordingly.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  t.ok(updatedCandyMachine.collectionMintAddress.equals(collectionB.address));
});

test('[candyMachineModule] it can update the collection of a candy machine when passed as a public key', async (t) => {
  // Given a Candy Machine associated to Collection A.
  const mx = await metaplex();
  const collectionUpdateAuthorityA = Keypair.generate();
  const collectionA = await createCollectionNft(mx, {
    updateAuthority: collectionUpdateAuthorityA,
  });
  const candyMachine = await createCandyMachine(mx, {
    collection: {
      address: collectionA.address,
      updateAuthority: collectionUpdateAuthorityA,
    },
  });

  // When we update its collection to Collection B by providing the Candy
  // Machine as a public key and the current collection's mint address.
  const collectionUpdateAuthorityB = Keypair.generate();
  const collectionB = await createCollectionNft(mx, {
    updateAuthority: collectionUpdateAuthorityB,
  });
  await mx
    .candyMachines()
    .update({
      candyMachine: candyMachine.address,
      collection: {
        address: collectionB.address,
        updateAuthority: collectionUpdateAuthorityB,
        currentCollectionAddress: candyMachine.collectionMintAddress,
      },
    })
    .run();

  // Then the Candy Machine's collection was updated accordingly.
  const updatedCandyMachine = await mx
    .candyMachines()
    .refresh(candyMachine)
    .run();
  t.ok(updatedCandyMachine.collectionMintAddress.equals(collectionB.address));
});

test('[candyMachineModule] it fails when the provided collection to update misses properties', async (t) => {
  // Given an existing Candy Machine.
  const mx = await metaplex();
  const candyMachine = await createCandyMachine(mx);

  // When we try to update its collection without providing all data
  // and by providing the Candy Machine as a public key.
  const collectionUpdateAuthority = Keypair.generate();
  const collection = await createCollectionNft(mx, {
    updateAuthority: collectionUpdateAuthority,
  });
  const promise = mx
    .candyMachines()
    .update({
      candyMachine: candyMachine.address,
      collection: {
        address: collection.address,
        updateAuthority: collectionUpdateAuthority,
        // <- Misses the current collection mint address to revoke current authority.
      },
    })
    .run();

  // Then we expect an error telling us some data is missing from the input.
  await assertThrowsFn(t, promise, (error) => {
    const missingProperties = '[collection.currentCollectionAddress]';
    t.equal(error.key, 'metaplex.errors.sdk.missing_input_data');
    t.ok(error.solution.includes(missingProperties));
  });
});

test.skip('[candyMachineModule] it can update the guards of a candy machine', async (t) => {
  //
});

test.skip('[candyMachineModule] it can update the guards of a candy machine when passed as a public key', async (t) => {
  //
});

test.skip('[candyMachineModule] it fails when the provided guards to update miss properties', async (t) => {
  //
});

test.skip('[candyMachineModule] it fails when there is nothing to update', async (t) => {
  //
});

test.skip('[candyMachineModule] it can update data, authorities, collection and guards at the same time', async (t) => {
  //
});
