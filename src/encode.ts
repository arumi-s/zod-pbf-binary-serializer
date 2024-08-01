import type Pbf from 'pbf';
import type { Block, PrimitiveBlockType } from './types/block';

/**
 * @description get the value from an object using a path
 */
function getter<T = unknown>(obj: any, path: string[]): T {
	if (path.length === 0) {
		return obj;
	}

	return path.reduce((prev, cur) => prev[cur], obj);
}

const encodeString = (value: unknown, pbf: Pbf): void => {
	pbf.writeString(value as string);
};

const encodeFloat = (value: unknown, pbf: Pbf): void => {
	pbf.writeDouble(value as number);
};

const encodeInt = (value: unknown, pbf: Pbf): void => {
	pbf.writeSVarint(value as number);
};

const encodeUint = (value: unknown, pbf: Pbf): void => {
	pbf.writeVarint(value as number);
};

const encodeBoolean = (value: unknown, pbf: Pbf): void => {
	pbf.writeBoolean(value as boolean);
};

const encodeBuffer = (value: unknown, pbf: Pbf): void => {
	pbf.writeBytes(value as Uint8Array);
};

const encodeNull = (value: unknown, pbf: Pbf): void => {};

const encodeBooleanArray = (array: unknown[], pbf: Pbf): void => {
	const bits = new Uint8Array(Math.ceil(array.length / 8));
	for (let i = 0; i < array.length; i++) {
		bits[i >> 3] |= +(array[i] as boolean) << (i & 7);
	}
	pbf.writeBytes(bits);
};

const chooseEncoder = (type: PrimitiveBlockType) => {
	if (type === 'string') {
		return encodeString;
	} else if (type === 'float') {
		return encodeFloat;
	} else if (type === 'int') {
		return encodeInt;
	} else if (type === 'uint') {
		return encodeUint;
	} else if (type === 'boolean') {
		return encodeBoolean;
	} else if (type === 'buffer') {
		return encodeBuffer;
	} else if (type === 'null') {
		return encodeNull;
	}

	throw new Error(`Unknown type: ${type}`);
};

export const optional = (value: unknown): number => {
	if (typeof value === 'undefined') {
		// value not exist or value equals undefined
		return 0;
	}
	if (value === null) {
		// value exists and not null
		return 2;
	}
	// value exists and is null
	return 1;
};

export function encode(data: any, blocks: Block[], pbf: Pbf) {
	for (const block of blocks) {
		if (block.block === 'discriminator') {
			const discriminatorValue =
				block.discriminator === '' ? optional(getter(data, block.path)) : getter(data, [...block.path, block.discriminator]);
			const encoder = chooseEncoder(block.type);
			encoder(discriminatorValue, pbf);

			const selected = block.options.find(([key]) => key === discriminatorValue)?.[1];
			if (selected) {
				encode(data, selected, pbf);
			}
		} else if (block.block === 'array') {
			const array = getter(data, block.path) as unknown[];
			pbf.writeVarint(array.length);
			if (block.type === 'object') {
				for (const item of array) {
					encode(item, block.blocks, pbf);
				}
			} else if (block.type === 'boolean') {
				encodeBooleanArray(array, pbf);
			} else {
				const encoder = chooseEncoder(block.type);
				for (const item of array) {
					encoder(item, pbf);
				}
			}
		} else if (block.block === 'primitive') {
			const value = getter(data, block.path);
			const encoder = chooseEncoder(block.type);
			encoder(value, pbf);
		}
	}

	return pbf;
}
