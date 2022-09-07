import test from 'tape';
import { killStuckProcess, metaplex } from '../../helpers';
import { createCandyMachineV2 } from './helpers';
import { Keypair } from '@solana/web3.js';

killStuckProcess();

test('[candyMachineV2Module] find all candy machines by wallet', async (t) => {
  // Given two candy machines from wallet A.
  const mx = await metaplex();
  const walletA = Keypair.generate();
  await Promise.all([
    createCandyMachineV2(mx, { wallet: walletA.publicKey }),
    createCandyMachineV2(mx, { wallet: walletA.publicKey }),
  ]);

  // And one candy machine from wallet B.
  const walletB = Keypair.generate();
  await createCandyMachineV2(mx, { wallet: walletB.publicKey });

  // When I find all candy machines from wallet A.
  const candyMachines = await mx
    .candyMachinesV2()
    .findAllBy({ type: 'wallet', publicKey: walletA.publicKey })
    .run();

  // Then we got two candy machines.
  t.equal(candyMachines.length, 2, 'returns two accounts');

  // And they both are from wallet A.
  candyMachines.forEach((candyMachine) => {
    t.ok(
      candyMachine.walletAddress.equals(walletA.publicKey),
      'wallet matches'
    );
  });
});

test('[candyMachineV2Module] find all candy machines by authority', async (t) => {
  // Given two candy machines from authority A.
  const mx = await metaplex();
  const authorityA = Keypair.generate();
  await Promise.all([
    createCandyMachineV2(mx, { authority: authorityA.publicKey }),
    createCandyMachineV2(mx, { authority: authorityA.publicKey }),
  ]);

  // And one candy machine from authority B.
  const authorityB = Keypair.generate();
  await createCandyMachineV2(mx, { authority: authorityB.publicKey });

  // When I find all candy machines from authority A.
  const candyMachines = await mx
    .candyMachinesV2()
    .findAllBy({ type: 'authority', publicKey: authorityA.publicKey })
    .run();

  // Then we got two candy machines.
  t.equal(candyMachines.length, 2, 'returns two accounts');

  // And they both are from authority A.
  candyMachines.forEach((candyMachine) => {
    t.ok(
      candyMachine.authorityAddress.equals(authorityA.publicKey),
      'authority matches'
    );
  });
});