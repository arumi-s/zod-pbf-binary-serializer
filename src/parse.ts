import { ZodFirstPartyTypeKind, ZodParsedType, getParsedType, util } from 'zod';
import type { RefinementEffect } from 'zod';
import type { Block, Path } from './types/block';
import type { SerializableSchema } from './types/schema';

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
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodObject) {
		const shape = schema._def.shape();
		for (const i in shape) {
			// parse schema recursively for each property
			parseSchema(shape[i], blocks, [...path, i]);
		}

		return blocks;
	}

	// z.discriminatedUnion
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodDiscriminatedUnion) {
		// get all possible types from the discriminator
		const types = Array.from(schema._def.optionsMap.keys())
			.map((key) => {
				const type = getParsedType(key);
				return type === ZodParsedType.number
					? util.isInteger(key)
						? 'int'
						: 'float'
					: type === ZodParsedType.boolean
						? 'boolean'
						: 'string';
			})
			.filter((v, i, a) => a.indexOf(v) === i);

		// if there is only one type, use it, otherwise, use float if int and float are mixed
		const type = types.length === 1 ? types[0] : types.every((v) => ['int', 'float'].includes(v)) ? 'float' : null;
		if (type === null) {
			// throw an error if mixed types are used
			throw new Error('Could not determine the type of the discriminated union');
		}
		const discriminator = schema._def.discriminator;

		// add the discriminator block
		blocks.unshift({
			block: 'discriminator',
			type,
			options: new Map(
				Array.from(schema._def.optionsMap.entries()).map(
					// parse schema recursively for each option, but filter out the discriminator because it's already added
					([key, option]) => [key, parseSchema(option, [], []).filter((block) => block.path.join('.') !== discriminator)] as const,
				),
			),
			discriminator: discriminator,
			path,
		});

		return blocks;
	}

	// z.string
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodString) {
		blocks.push({
			block: 'primitive',
			type: 'string',
			path,
		});

		return blocks;
	}

	// z.number
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodNumber) {
		// use uint if the number is an int and has a min of 0
		// use int if the number is an int
		// use float otherwise
		const type = schema._def.checks.some((check) => check.kind === 'int')
			? schema._def.checks.some((check) => check.kind === 'min' && check.value === 0)
				? 'uint'
				: 'int'
			: 'float';

		blocks.push({
			block: 'primitive',
			type,
			path,
		});

		return blocks;
	}

	// z.boolean
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodBoolean) {
		blocks.push({
			block: 'primitive',
			type: 'boolean',
			path,
		});

		return blocks;
	}

	// z.array
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodArray) {
		// parse schema recursively for the item type
		const itemBlocks = parseSchema(schema._def.type, [], []);

		// use the type of the item directly if the item type is a simple content block
		// use object otherwise,
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
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodLiteral) {
		// literal don't have a type, so we need to guess it
		const type = getParsedType(schema._def.value);

		if (type === ZodParsedType.string || type === ZodParsedType.boolean) {
			blocks.push({
				block: 'primitive',
				type,
				path,
			});
		} else if (type === ZodParsedType.number) {
			blocks.push({
				block: 'primitive',
				type: 'float',
				path,
			});
		} else {
			// other types are not supported, please avoid them
			throw new Error(`Unsupported literal value`);
		}

		return blocks;
	}

	// z.effect
	if (schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects) {
		// check for z.instanceOf(Uint8Array)
		if (schema._def.effect.type === 'refinement') {
			const refinement = schema._def.effect.refinement;
			const isBuffer = isRefinementInstanceOf(refinement, () => testUint8Array);
			if (isBuffer) {
				blocks.push({
					block: 'primitive',
					type: 'buffer',
					path,
				});
			} else {
				parseSchema(schema._def.schema, blocks, path);
			}
		} else {
			// other effects are not supported
			throw new Error('Unsupported effect');
		}

		return blocks;
	}

	throw new Error(`Unsupported schema at: ${path.join('.')}`);
}

/**
 * These are used to check if the refinement effect is actually z.instanceOf
 */
const testUint8Array = new Uint8Array(0);

/**
 * @description check if the refinement effect is effectively z.instanceOf with a given class
 *
 * @param refinement zod refinement effect
 * @param factory factory function to create the value to check
 * @returns true if the refinement is satisfied
 */
export function isRefinementInstanceOf<T>(refinement: RefinementEffect<T>['refinement'], factory: () => T): boolean {
	let isInstanceOf = true;

	// refinement runs synchronously, so this is fine
	refinement(factory(), {
		addIssue: () => {
			isInstanceOf = false;
		},
		path: [],
	});

	return isInstanceOf;
}
