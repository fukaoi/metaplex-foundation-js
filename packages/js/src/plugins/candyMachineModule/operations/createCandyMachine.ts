import { Metaplex } from '@/Metaplex';
import {
  BigNumber,
  Creator,
  Operation,
  OperationHandler,
  PublicKey,
  Signer,
  toBigNumber,
  useOperation,
} from '@/types';
import { DisposableScope, TransactionBuilder } from '@/utils';
import { createInitializeInstruction } from '@metaplex-foundation/mpl-candy-machine-core';
import { ConfirmOptions, Keypair } from '@solana/web3.js';
import { SendAndConfirmTransactionResponse } from '../../rpcModule';
import {
  CandyMachine,
  CandyMachineConfigLineSettings,
  CandyMachineHiddenSettings,
  toCandyMachineData,
} from '../models';
import { getCandyMachineSize } from '../models/CandyMachineHiddenSection';

// -----------------
// Operation
// -----------------

const Key = 'CreateCandyMachineOperation' as const;

/**
 * TODO
 *
 * ```ts
 * const { candyMachine } = await metaplex
 *   .candyMachines()
 *   .create({
 *   })
 *   .run();
 * ```
 *
 * @group Operations
 * @category Constructors
 */
export const createCandyMachineOperation =
  useOperation<CreateCandyMachineOperation>(Key);

/**
 * @group Operations
 * @category Types
 */
export type CreateCandyMachineOperation = Operation<
  typeof Key,
  CreateCandyMachineInput,
  CreateCandyMachineOutput
>;

/**
 * @group Operations
 * @category Inputs
 */
export type CreateCandyMachineInput = {
  /**
   * The Candy Machine to create as a Signer.
   * This expects a brand new Keypair with no associated account.
   *
   * @defaultValue `Keypair.generate()`
   */
  candyMachine?: Signer;

  /**
   * The Signer that should pay for the creation of the Candy Machine.
   * This includes both storage fees and the transaction fee.
   *
   * @defaultValue `metaplex.identity()`
   */
  payer?: Signer;

  /**
   * Refers to the authority that is allowed to manage the Candy Machine.
   * This includes updating its data, authorities, inserting items, etc.
   *
   * @defaultValue `metaplex.identity().publicKey`
   */
  authority?: PublicKey;

  /**
   * Refers to the only authority that is allowed to mint from
   * this Candy Machine. This will refer to the address of the Candy
   * Guard associated with the Candy Machine if any.
   *
   * @defaultValue Uses the same value as the `authority` parameter.
   */
  mintAuthority?: PublicKey;

  /**
   * The mint address of the Collection NFT that all NFTs minted from
   * this Candy Machine should be part of.
   *
   * @example
   * If you do not have a Collection NFT yet, you can create one using
   * the `create` method of the NFT module and setting `isCollection` to `true`.
   *
   * ```ts
   * const { nft } = await metaplex.
   *   .nfts()
   *   .create({ isCollection: true, name: 'My Collection', ... })
   *   .run();
   * ```
   *
   * You can now use `nft.address` as the value for this parameter.
   */
  collection: PublicKey;

  /**
   * The royalties that should be set on minted NFTs in basis points
   *
   * @example
   * ```ts
   * { sellerFeeBasisPoints: 250 } // For 2.5% royalties.
   * ```
   */
  sellerFeeBasisPoints: number;

  /**
   * The total number of items availble in the Candy Machine, minted or not.
   *
   * @example
   * ```ts
   * { itemsAvailable: toBigNumber(1000) } // For 1000 items.
   * ```
   */
  itemsAvailable: BigNumber;

  /**
   * Settings related to the Candy Machine's items.
   *
   * These can either be inserted manually within the Candy Machine or
   * they can be infered from a set of hidden settings.
   *
   * - If `type` is `hidden`, the Candy Machine is using hidden settings.
   * - If `type` is `configLines`, the Candy Machine is using config line settings.
   *
   * @defaultValue
   * Defaults to using `configLines` settings with:
   * - No prefixes.
   * - A length of 32 for the name.
   * - A length of 200 for the URI.
   * - Random mint ordering.
   *
   * ```ts
   * {
   *   itemSettings: {
   *     type: 'configLines',
   *     prefixName: '',
   *     nameLength: 32,
   *     prefixUri: '',
   *     uriLength: 200,
   *     isSequential: false,
   *   }
   * }
   * ```
   *
   * @see {@link CandyMachineHiddenSettings}
   * @see {@link CandyMachineConfigLineSettings}
   */
  itemSettings?: CandyMachineHiddenSettings | CandyMachineConfigLineSettings;

  /**
   * The symbol to use when minting NFTs (e.g. "MYPROJECT")
   *
   * This can be any string up to 10 bytes and can be made optional
   * by providing an empty string.
   *
   * @defaultValue `""`
   */
  symbol: string;

  /**
   * The maximum number of editions that can be printed from the
   * minted NFTs.
   *
   * For most use cases, you'd want to set this to `0` to prevent
   * minted NFTs to be printed multiple times.
   *
   * Note that you cannot set this to `null` which means unlimited editions
   * are not supported by the Candy Machine program.
   *
   * @defaultValue `toBigNumber(0)`
   */
  maxEditionSupply: BigNumber;

  /**
   * Whether the minted NFTs should be mutable or not.
   *
   * We recommend setting this to `true` unless you have a specific reason.
   * You can always make NFTs immutable in the future but you cannot make
   * immutable NFTs mutable ever again.
   *
   * @defaultValue `true`
   */
  isMutable: boolean;

  /**
   * Array of creators that should be set on minted NFTs.
   *
   * @see {@link Creator}
   *
   * @defaultValue
   * Defaults to using the `authority` parameter as the only creator.
   *
   * ```ts
   * [{ address: authority, share: 100 }]
   * ```
   */
  creators: Omit<Creator, 'verified'>[];

  /** A set of options to configure how the transaction is sent and confirmed. */
  confirmOptions?: ConfirmOptions;
};

/**
 * @group Operations
 * @category Outputs
 */
export type CreateCandyMachineOutput = {
  /** The blockchain response from sending and confirming the transaction. */
  response: SendAndConfirmTransactionResponse;

  /** The Candy Machine that was created. */
  candyMachine: CandyMachine;

  /** The created Candy Machine has a Signer. */
  candyMachineSigner: Signer;
};

/**
 * @group Operations
 * @category Handlers
 */
export const createCandyMachineOperationHandler: OperationHandler<CreateCandyMachineOperation> =
  {
    async handle(
      operation: CreateCandyMachineOperation,
      metaplex: Metaplex,
      scope: DisposableScope
    ): Promise<CreateCandyMachineOutput> {
      const builder = createCandyMachineBuilder(metaplex, operation.input);
      const output = await builder.sendAndConfirm(
        metaplex,
        operation.input.confirmOptions
      );
      scope.throwIfCanceled();

      // TODO: fetch
      const candyMachine: CandyMachine = {} as unknown as CandyMachine;
      scope.throwIfCanceled();

      return { ...output, candyMachine };
    },
  };

// -----------------
// Builder
// -----------------

/**
 * @group Transaction Builders
 * @category Inputs
 */
export type CreateCandyMachineBuilderParams = Omit<
  CreateCandyMachineInput,
  'confirmOptions'
> & {
  /** A key to distinguish the instruction that creates the Candy Machine account. */
  createCandyMachineAccountInstructionKey?: string;

  /** A key to distinguish the instruction that initializes the Candy Machine account. */
  initializeCandyMachineInstructionKey?: string;
};

/**
 * @group Transaction Builders
 * @category Contexts
 */
export type CreateCandyMachineBuilderContext = Omit<
  CreateCandyMachineOutput,
  'response' | 'candyMachine'
>;

/**
 * TODO
 *
 * ```ts
 * const transactionBuilder = await metaplex
 *   .candyMachines()
 *   .builders()
 *   .create({
 *   });
 * ```
 *
 * @group Transaction Builders
 * @category Constructors
 */
export const createCandyMachineBuilder = async (
  metaplex: Metaplex,
  params: CreateCandyMachineBuilderParams
): Promise<TransactionBuilder<CreateCandyMachineBuilderContext>> => {
  const {
    payer = metaplex.identity(),
    candyMachine = Keypair.generate(),
    authority,
    mintAuthority = authority,
    collection,
    sellerFeeBasisPoints,
    itemsAvailable,
    symbol = '',
    maxEditionSupply = toBigNumber(0),
    isMutable = true,
  } = params;

  const creators = params.creators ?? [{ address: authority, share: 100 }];
  const itemSettings = params.itemSettings ?? {
    type: 'configLines',
    prefixName: '',
    nameLength: 32,
    prefixUri: '',
    uriLength: 200,
    isSequential: false,
  };

  const candyMachineData = toCandyMachineData({
    itemsAvailable,
    symbol,
    sellerFeeBasisPoints,
    maxEditionSupply,
    isMutable,
    creators,
    itemSettings,
  });

  return TransactionBuilder.make<CreateCandyMachineBuilderContext>()
    .setFeePayer(payer)
    .setContext({ candyMachineSigner: candyMachine })

    .add(
      await metaplex.system().builders().createAccount({
        space: getCandyMachineSize(),
      })
    )

    .add({
      instruction: createInitializeInstruction({
        candyMachine: candyMachine.publicKey,
        authority,
        mintAuthority,
        payer: payer.publicKey,
      }),
      signers: [payer, candyMachine],
      key:
        params.initializeCandyMachineInstructionKey ?? 'initializeCandyMachine',
    });
};
