import Pbf from 'pbf';
import type { TypeOf } from 'zod';
import type { SerializableSchema } from './types/schema';
import { parseSchema } from './parse';
import { encode } from './encode';
import { decode } from './decode';

export function fromSchema<T extends SerializableSchema>(schema: T) {
	const blocks = parseSchema(schema);

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
