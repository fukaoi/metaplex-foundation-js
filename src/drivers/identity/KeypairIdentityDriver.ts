import { Keypair, PublicKey, SendOptions, Signer, Signer as Web3Signer, Transaction, TransactionSignature } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { IdentityDriver } from './IdentityDriver';
import { Metaplex } from '@/Metaplex';

export class KeypairIdentityDriver extends IdentityDriver implements Web3Signer {
  public readonly keypair: Keypair;
  public readonly publicKey: PublicKey;
  public readonly secretKey: Uint8Array;

  constructor(metaplex: Metaplex, keypair: Keypair) {
    super(metaplex);
    this.keypair = keypair;
    this.publicKey = keypair.publicKey;
    this.secretKey = keypair.secretKey;
  }

  public async signMessage(message: Uint8Array): Promise<Uint8Array> {
    return nacl.sign.detached(message, this.secretKey);
  };

  public async signTransaction(transaction: Transaction): Promise<Transaction> {
    transaction.feePayer = this.publicKey;
    transaction.sign(this.keypair);

    return transaction;
  };

  public async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    return Promise.all(transactions.map(transaction => this.signTransaction(transaction)));
  };

  public async sendTransaction(
    transaction: Transaction,
    signers: Signer[],
    options?: SendOptions,
  ): Promise<TransactionSignature> {
    return this.metaplex.connection
      .sendTransaction(await this.signTransaction(transaction), signers, options);
  }
}