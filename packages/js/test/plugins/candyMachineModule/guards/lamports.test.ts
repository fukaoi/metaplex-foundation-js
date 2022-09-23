import { isEqualToAmount, sol, toBigNumber } from '@/index';
import { Keypair } from '@solana/web3.js';
import test from 'tape';
import {
  assertThrows,
  createWallet,
  killStuckProcess,
  metaplex,
} from '../../../helpers';
import { assertMintingWasSuccessful, createCandyMachine } from '../helpers';

killStuckProcess();

test('[candyMachineModule] lamports guard: it transfers SOL from the payer to the destination', async (t) => {
  // Given a loaded Candy Machine with a lamports guard.
  const mx = await metaplex();
  const treasury = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(2),
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
    guards: {
      lamports: {
        amount: sol(1),
        destination: treasury.publicKey,
      },
    },
  });

  // When we mint for another owner using an explicit payer.
  const payer = await createWallet(mx, 10);
  const owner = Keypair.generate().publicKey;
  const { nft } = await mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      payer,
      owner,
    })
    .run();

  // Then minting was successful.
  await assertMintingWasSuccessful(t, mx, {
    candyMachine,
    collectionUpdateAuthority: collection.updateAuthority.publicKey,
    nft,
    owner,
  });

  // And the treasury received SOLs.
  const treasuryBalance = await mx.rpc().getBalance(treasury.publicKey);
  t.true(isEqualToAmount(treasuryBalance, sol(1)), 'treasury received SOLs');

  // And the payer lost SOLs.
  const payerBalance = await mx.rpc().getBalance(payer.publicKey);
  t.true(isEqualToAmount(payerBalance, sol(9), sol(0.1)), 'payer lost SOLs');
});

test('[candyMachineModule] lamports guard: it fails if the payer does not have enough funds', async (t) => {
  // Given a loaded Candy Machine with a lamports guard costing 5 SOLs.
  const mx = await metaplex();
  const treasury = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(2),
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
    guards: {
      lamports: {
        amount: sol(5),
        destination: treasury.publicKey,
      },
    },
  });

  // When we mint from it using a payer that only has 4 SOL.
  const payer = await createWallet(mx, 4);
  const promise = mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      payer,
    })
    .run();

  // Then we expect an error.
  await assertThrows(t, promise, /Not enough SOL to pay for the mint/);

  // And the payer didn't loose any SOL.
  const payerBalance = await mx.rpc().getBalance(payer.publicKey);
  t.true(isEqualToAmount(payerBalance, sol(4)), 'payer did not lose SOLs');
});

test('[candyMachineModule] lamports guard with bot tax: it charges a bot tax if the payer does not have enough funds', async (t) => {
  // Given a loaded Candy Machine with a lamports guard costing 5 SOLs.
  const mx = await metaplex();
  const treasury = Keypair.generate();
  const { candyMachine, collection } = await createCandyMachine(mx, {
    itemsAvailable: toBigNumber(2),
    items: [
      { name: 'Degen #1', uri: 'https://example.com/degen/1' },
      { name: 'Degen #2', uri: 'https://example.com/degen/2' },
    ],
    guards: {
      botTax: {
        lamports: sol(0.1),
        lastInstruction: true,
      },
      lamports: {
        amount: sol(5),
        destination: treasury.publicKey,
      },
    },
  });

  // When we mint from it using a payer that only has 4 SOL.
  const payer = await createWallet(mx, 4);
  const promise = mx
    .candyMachines()
    .mint({
      candyMachine,
      collectionUpdateAuthority: collection.updateAuthority.publicKey,
      payer,
    })
    .run();

  // Then we expect an error.
  await assertThrows(t, promise, /Candy Machine Bot Tax/);

  // And the payer was charged a bot tax.
  const payerBalance = await mx.rpc().getBalance(payer.publicKey);
  t.true(
    isEqualToAmount(payerBalance, sol(3.9), sol(0.01)),
    'payer was charged a bot tax'
  );
});
