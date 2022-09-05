import type { Metaplex } from '@/Metaplex';
import { deserialize, PublicKey, serialize } from '@/types';
import { u32, u8 } from '@metaplex-foundation/beet';
import { Buffer } from 'buffer';
import { UnregisteredCandyGuardError } from './errors';
import {
  CandyGuardManifest,
  CandyGuardsSettings,
  DefaultCandyGuardSettings,
} from './guards';
import { CandyGuardProgram } from './program';

/**
 * TODO
 *
 * @see {@link CandyGuardClient}
 * @group Module
 */
export class CandyGuardGuardsClient {
  readonly guards: CandyGuardManifest<any>[] = [];

  constructor(protected readonly metaplex: Metaplex) {}

  /** TODO */
  register(...guard: CandyGuardManifest<any>[]) {
    this.guards.push(...guard);
  }

  /** TODO */
  get(name: string): CandyGuardManifest<any> {
    const guard = this.guards.find((guard) => guard.name === name);

    if (!guard) {
      throw new UnregisteredCandyGuardError(name);
    }

    return guard;
  }

  /** TODO */
  all(): CandyGuardManifest<any>[] {
    return this.guards;
  }

  /** TODO */
  forProgram(
    program: string | PublicKey | CandyGuardProgram = 'CandyGuardProgram'
  ): CandyGuardManifest<any>[] {
    const candyGuardProgram =
      typeof program === 'object' && 'availableGuards' in program
        ? program
        : this.metaplex.programs().get<CandyGuardProgram>(program);

    return candyGuardProgram.availableGuards.map((name) => this.get(name));
  }

  /** TODO */
  serializeSettings<T extends CandyGuardsSettings = DefaultCandyGuardSettings>(
    guards: Partial<T>,
    groups: Partial<T>[] = [],
    program: string | PublicKey | CandyGuardProgram = 'CandyGuardProgram'
  ): Buffer {
    const availableGuards = this.forProgram(program);
    const serializeSet = (set: Partial<T>): Buffer => {
      return availableGuards.reduce((acc, guard) => {
        const value = set[guard.name] ?? null;
        const optionPrefix = Buffer.from([value ? 1 : 0]);
        const newBuffer = value
          ? serialize(value, guard.settingsSerializer)
          : Buffer.from([]);
        acc = Buffer.concat([acc, optionPrefix, newBuffer]);
        return acc;
      }, Buffer.from([]));
    };

    let buffer = serializeSet(guards);

    if (groups.length > 0) {
      const groupCountBuffer = Buffer.alloc(5);
      u8.write(groupCountBuffer, 0, 1);
      u32.write(groupCountBuffer, 1, groups.length);
      buffer = Buffer.concat([buffer, groupCountBuffer]);
    } else {
      buffer = Buffer.concat([buffer, Buffer.from([0])]);
    }

    groups.forEach((group) => {
      buffer = Buffer.concat([buffer, serializeSet(group)]);
    });

    return buffer;
  }

  /** TODO */
  deserializeSettings<
    T extends CandyGuardsSettings = DefaultCandyGuardSettings
  >(
    buffer: Buffer,
    program: string | PublicKey | CandyGuardProgram = 'CandyGuardProgram'
  ): { guards: T; groups: T[] } {
    const availableGuards = this.forProgram(program);
    const deserializeSet = () => {
      const serializedFeatures = buffer.slice(0, 8);
      const features: boolean[] = deserializeFeatures(serializedFeatures);
      buffer = buffer.slice(8);

      return availableGuards.reduce((acc, guard, index) => {
        const isEnabled = features[index] ?? false;
        acc[guard.name] = null;
        if (!isEnabled) return acc;

        const [settings, offset] = deserialize(
          buffer,
          guard.settingsSerializer
        );
        buffer = buffer.slice(offset);
        acc[guard.name] = settings;
        return acc;
      }, {} as CandyGuardsSettings) as T;
    };

    const guards: T = deserializeSet();
    const groups: T[] = [];
    const groupsCount = u32.read(buffer, 0);
    buffer = buffer.slice(4);

    for (let i = 0; i < groupsCount; i++) {
      groups.push(deserializeSet());
    }

    return { guards, groups };
  }

  /** TODO */
  serializeMintArguments() {
    // TODO
  }

  /** TODO */
  serializeMintRemainingAccounts() {
    // TODO
  }
}

/** @ts-ignore */
const serializeFeatures = (features: boolean[], length: number = 8): Buffer => {
  const bytes: number[] = [];
  let currentByte = 0;
  for (let i = 0; i < features.length; i++) {
    const byteIndex = i % 8;
    currentByte |= Number(features[i]) << byteIndex;
    if (byteIndex === 7) {
      bytes.push(currentByte);
      currentByte = 0;
    }
  }
  return Buffer.concat([Buffer.from(bytes)], length);
};

const deserializeFeatures = (buffer: Buffer): boolean[] => {
  const booleans: boolean[] = [];
  for (let byte of buffer) {
    for (let i = 0; i < 8; i++) {
      booleans.push(Boolean(byte & 1));
      byte >>= 1;
    }
  }
  return booleans;
};
