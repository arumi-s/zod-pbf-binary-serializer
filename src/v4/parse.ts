import type { ZodDiscriminatedUnion, ZodType } from 'zod/v4';
import type { Block, Path, Primitive } from '../block';
import type { SerializableSchema } from './types/schema';

function getDiscriminatorValueType(value: Primitive): 'string' | 'boolean' | 'int' | 'float' | null {
	if (typeof value === 'string') {
		return 'string';
	}

	if (typeof value === 'boolean') {
		return 'boolean';
	}

	if (typeof value === 'number') {
		return Number.isInteger(value) ? 'int' : 'float';
	}

	return null;
}

function getLiteralBlockType(values: Primitive[]): 'string' | 'boolean' | 'float' | null {
	const valueTypes = [...new Set(values.map((value) => getDiscriminatorValueType(value)))];

	if (valueTypes.length !== 1) {
		return null;
	}

	const [valueType] = valueTypes;
	if (valueType === 'string' || valueType === 'boolean') {
		return valueType;
	}

	if (valueType === 'int' || valueType === 'float') {
		return 'float';
	}

	return null;
}

function resolveDiscriminatorType(values: Primitive[]): 'string' | 'boolean' | 'int' | 'float' | null {
	const types = [...new Set(values.map((value) => getDiscriminatorValueType(value)))];

	if (types.length === 1) {
		return types[0];
	}

	if (types.every((type) => type === 'int' || type === 'float')) {
		return 'float';
	}

	return null;
}

function isDiscriminatedUnionSchema(schema: SerializableSchema): schema is ZodDiscriminatedUnion<readonly ZodType[], string> {
	return 'discriminator' in schema.def && typeof schema.def.discriminator === 'string';
}

function getInstanceOfClass(schema: ZodType): unknown {
	const visited = new Set<ZodType>();
	let current: ZodType | undefined = schema;

	while (current && !visited.has(current)) {
		visited.add(current);

		const Class = current._zod.bag.Class;
		if (typeof Class === 'function') {
			return Class;
		}

		current = current._zod.parent as ZodType;
	}

	return undefined;
}

function isUint8ArraySchema(schema: SerializableSchema): boolean {
	return schema.def.type === 'custom' && getInstanceOfClass(schema) === Uint8Array;
}

/**
 * @description parse zod schema into flattened blocks of content and discriminator
 *
 * @param schema zod schema
 * @param blocks blocks to add to
 * @param path path to add to
 * @returns flattened blocks
 */
export function parseSchema(schema: SerializableSchema, blocks: Block[] = [], path: Path = []) {
	// z.object
	if (schema.def.type === 'object') {
		const shape = schema.def.shape;
		for (const key in shape) {
			parseSchema(shape[key], blocks, [...path, key]);
		}

		return blocks;
	}

	// z.discriminatedUnion
	if (isDiscriminatedUnionSchema(schema)) {
		const discriminator = schema.def.discriminator;
		const options = new Map<Primitive, ZodType>();

		for (const option of schema.def.options) {
			const values = option._zod.propValues?.[discriminator];
			if (!values || values.size === 0) {
				throw new Error(`Could not determine the type of the discriminator`);
			}

			for (const value of values) {
				options.set(value, option);
			}
		}

		const type = resolveDiscriminatorType(Array.from(options.keys()));
		if (type === null) {
			throw new Error('Could not determine the type of the discriminator');
		}

		blocks.unshift({
			block: 'discriminator',
			type,
			options: Array.from(options.entries()).map(([key, option]) => [
				key,
				parseSchema(option as SerializableSchema, [], []).filter((block) => block.path.join('.') !== discriminator),
			]),
			discriminator,
			path,
		});

		return blocks;
	}

	// z.optional or z.nullable
	if (schema.def.type === 'optional' || schema.def.type === 'nullable') {
		blocks.push({
			block: 'discriminator',
			type: 'uint',
			options: [
				[0, []],
				[1, parseSchema(schema.def.innerType as SerializableSchema, [], path)],
				[2, [{ block: 'primitive', type: 'null', path }]],
			],
			discriminator: '',
			path,
		});

		return blocks;
	}

	// z.string or z.enum
	if (schema.def.type === 'string' || schema.def.type === 'enum') {
		blocks.push({
			block: 'primitive',
			type: 'string',
			path,
		});

		return blocks;
	}

	// z.number
	if (schema.def.type === 'number') {
		const type =
			'format' in schema && schema.format === 'safeint' ? ('minValue' in schema && schema.minValue === 0 ? 'uint' : 'int') : 'float';

		blocks.push({
			block: 'primitive',
			type,
			path,
		});

		return blocks;
	}

	// z.boolean
	if (schema.def.type === 'boolean') {
		blocks.push({
			block: 'primitive',
			type: 'boolean',
			path,
		});

		return blocks;
	}

	// z.date
	if (schema.def.type === 'date') {
		blocks.push({
			block: 'primitive',
			type: 'date',
			path,
		});

		return blocks;
	}

	// z.array
	if (schema.def.type === 'array') {
		const itemBlocks = parseSchema(schema.def.element as SerializableSchema, [], []);
		const type =
			itemBlocks.length === 1 && itemBlocks[0].block === 'primitive' && itemBlocks[0].path.length === 0 ? itemBlocks[0].type : 'object';

		blocks.push({
			block: 'array',
			type,
			blocks: itemBlocks,
			path,
		});

		return blocks;
	}

	// z.literal
	if (schema.def.type === 'literal') {
		const type = getLiteralBlockType(schema.def.values as Primitive[]);
		if (type === null) {
			throw new Error('Unsupported literal value');
		}

		blocks.push({
			block: 'primitive',
			type,
			path,
		});

		return blocks;
	}

	// z.instanceof(Uint8Array)
	if (isUint8ArraySchema(schema)) {
		blocks.push({
			block: 'primitive',
			type: 'buffer',
			path,
		});

		return blocks;
	}

	// z.codec (pipe with reverseTransform)
	if (schema.def.type === 'pipe' && typeof (schema.def as any).reverseTransform === 'function') {
		return parseSchema((schema.def as any).out as SerializableSchema, blocks, path);
	}

	// transforms/pipes are not supported
	if (schema.def.type === 'pipe' || (schema.def.type as string) === 'transform') {
		throw new Error('Unsupported effect');
	}

	throw new Error(`Unsupported schema at: ${path.join('.')}`);
}
