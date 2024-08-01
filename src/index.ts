import Pbf from 'pbf';
import type { TypeOf } from 'zod';
import type { SerializableSchema } from './types/schema';
import { parseSchema } from './parse';
import { encode } from './encode';
import { decode } from './decode';
import { Block } from './types/block';

export * from './types/block';
export * from './types/schema';

export function fromSchema<T extends SerializableSchema>(schema: T) {
	return fromBlocks<T>(parseSchema(schema));
}

export function fromBlocks<T extends SerializableSchema>(blocks: Block[]) {
	return {
		/**
		 * get the blocks of the schema
		 */
		get blocks() {
			return blocks;
		},

		/**
		 * encode the data to a Uint8Array
		 */
		encode: (data: TypeOf<T>): Uint8Array => {
			const pbf = encode(data, blocks, new Pbf());
			return pbf.finish();
		},

		/**
		 * decode the data from a Uint8Array
		 */
		decode: (buffer: ArrayBuffer | Uint8Array): TypeOf<T> => {
			const pbf = new Pbf(buffer);
			return decode(pbf, blocks);
		},
	};
}
