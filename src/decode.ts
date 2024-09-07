import type Pbf from 'pbf';
import type { Block, PrimitiveBlockType } from './types/block';

/**
 * @description set the value at the given path
 */
function setter<T extends Record<string, any>>(obj: T, path: string[], value: any): T {
	let current: any = obj;

	if (path.length === 0) {
		return value;
	}

	for (let i = 0; i < path.length; i++) {
		if (i === path.length - 1) {
			current[path[i]] = value;
		} else {
			const segment = path[i];
			if (current[segment] == null) {
				current[segment] = {};
			}
			current = current[segment];
		}
	}

	return obj;
}

const decodeString = (pbf: Pbf): string => {
	return pbf.readString();
};

const decodeFloat = (pbf: Pbf): number => {
	return pbf.readDouble();
};

const decodeInt = (pbf: Pbf): number => {
	return pbf.readSVarint();
};

const decodeUint = (pbf: Pbf): number => {
	return pbf.readVarint();
};

const decodeBoolean = (pbf: Pbf): boolean => {
	return pbf.readBoolean();
};

const decodeDate = (pbf: Pbf): Date => {
	return new Date(pbf.readSFixed64());
};

const decodeBuffer = (pbf: Pbf): Uint8Array => {
	return pbf.readBytes();
};

const decodeNull = (pbf: Pbf): null => {
	return null;
};

const decodeBooleanArray = (pbf: Pbf, length: number): boolean[] => {
	const array: boolean[] = new Array(length);
	const bits = pbf.readBytes();
	for (let i = 0; i < length; i++) {
		array[i] = bits[i >> 3] & (1 << (i & 7)) ? true : false;
	}
	return array;
};

const chooseDecoder = (type: PrimitiveBlockType) => {
	if (type === 'string') {
		return decodeString;
	} else if (type === 'float') {
		return decodeFloat;
	} else if (type === 'int') {
		return decodeInt;
	} else if (type === 'uint') {
		return decodeUint;
	} else if (type === 'boolean') {
		return decodeBoolean;
	} else if (type === 'date') {
		return decodeDate;
	} else if (type === 'buffer') {
		return decodeBuffer;
	} else if (type === 'null') {
		return decodeNull;
	}

	throw new Error(`Unknown type: ${type}`);
};

export function decode(pbf: Pbf, blocks: Block[], data: any = {}) {
	for (const block of blocks) {
		if (block.block === 'discriminator') {
			const decoder = chooseDecoder(block.type);
			const discriminatorValue = decoder(pbf);
			if (block.discriminator !== '') {
				data = setter(data, [...block.path, block.discriminator], discriminatorValue);
			}

			const selected = block.options.find(([key]) => key === discriminatorValue)?.[1];
			if (selected) {
				data = decode(pbf, selected, data);
			}
		} else if (block.block === 'array') {
			const length = pbf.readVarint();
			let array: unknown[] = new Array(length);
			if (block.type === 'object') {
				for (let i = 0; i < length; i++) {
					array[i] = decode(pbf, block.blocks);
				}
			} else if (block.type === 'boolean') {
				array = decodeBooleanArray(pbf, length);
			} else {
				const decoder = chooseDecoder(block.type);
				for (let i = 0; i < length; i++) {
					array[i] = decoder(pbf);
				}
			}
			data = setter(data, block.path, array);
		} else if (block.block === 'primitive') {
			const decoder = chooseDecoder(block.type);
			const value = decoder(pbf);
			data = setter(data, block.path, value);
		}
	}

	return data;
}
