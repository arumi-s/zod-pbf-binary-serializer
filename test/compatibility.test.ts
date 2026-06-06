import { describe, expect, it } from 'vitest';
import { z as zV3 } from 'zod/v3';
import { z as zV4 } from 'zod/v4';
import { fromSchema as fromSchemaV3 } from '../src/v3';
import { fromSchema as fromSchemaV4 } from '../src/v4';

describe('v3 and v4 compatibility', () => {
	it('should produce the same output blocks for supported schema pairs', () => {
		const schemaPairs = [
			[zV3.string(), zV4.string()],
			[zV3.number(), zV4.number()],
			[zV3.number().int(), zV4.number().int()],
			[zV3.number().int().nonnegative(), zV4.number().int().nonnegative()],
			[zV3.boolean(), zV4.boolean()],
			[zV3.date(), zV4.date()],
			[zV3.literal('hello'), zV4.literal('hello')],
			[zV3.literal(123), zV4.literal(123)],
			[zV3.literal(true), zV4.literal(true)],
			[zV3.enum(['a', 'b', 'c']), zV4.enum(['a', 'b', 'c'])],
			[zV3.object({ a: zV3.instanceof(Uint8Array) }), zV4.object({ a: zV4.instanceof(Uint8Array) })],
			[
				zV3.array(zV3.object({ a: zV3.string(), b: zV3.number().int() })),
				zV4.array(zV4.object({ a: zV4.string(), b: zV4.number().int() })),
			],
			[
				zV3.object({
					a: zV3.string(),
					b: zV3.optional(zV3.string()),
					c: zV3.nullable(zV3.object({ d: zV3.boolean() })),
				}),
				zV4.object({
					a: zV4.string(),
					b: zV4.optional(zV4.string()),
					c: zV4.nullable(zV4.object({ d: zV4.boolean() })),
				}),
			],
			[
				zV3.discriminatedUnion('type', [
					zV3.object({ type: zV3.literal('a'), a: zV3.string() }),
					zV3.object({ type: zV3.literal('b'), b: zV3.number().int().nonnegative() }),
				]),
				zV4.discriminatedUnion('type', [
					zV4.object({ type: zV4.literal('a'), a: zV4.string() }),
					zV4.object({ type: zV4.literal('b'), b: zV4.number().int().nonnegative() }),
				]),
			],
		] as const;

		for (const [schemaV3, schemaV4] of schemaPairs) {
			const serializerV3 = fromSchemaV3(schemaV3);
			const serializerV4 = fromSchemaV4(schemaV4);

			expect(serializerV4.blocks).toEqual(serializerV3.blocks);
		}
	});

	it('should produce the same blocks and bytes for a composite schema', () => {
		const schemaV3 = zV3.object({
			a: zV3.string(),
			b: zV3.number().int().nonnegative(),
			c: zV3.boolean(),
			d: zV3.array(zV3.string()),
			e: zV3.optional(
				zV3.object({
					f: zV3.instanceof(Uint8Array).refine((v) => v.length === 4),
					g: zV3.nullable(zV3.string()),
				}),
			),
		});
		const schemaV4 = zV4.object({
			a: zV4.string(),
			b: zV4.number().int().nonnegative(),
			c: zV4.boolean(),
			d: zV4.array(zV4.string()),
			e: zV4.optional(
				zV4.object({
					f: zV4.instanceof(Uint8Array).refine((v) => v.length === 4),
					g: zV4.nullable(zV4.string()),
				}),
			),
		});

		const serializerV3 = fromSchemaV3(schemaV3);
		const serializerV4 = fromSchemaV4(schemaV4);
		const data = {
			a: 'hello',
			b: 123,
			c: true,
			d: ['x', 'y'],
			e: {
				f: new Uint8Array([1, 2, 3, 4]),
				g: null,
			},
		};

		expect(serializerV4.blocks).toEqual(serializerV3.blocks);
		expect(serializerV4.encode(data)).toEqual(serializerV3.encode(data));
		expect(serializerV4.decode(serializerV4.encode(data))).toEqual(serializerV3.decode(serializerV3.encode(data)));
	});

	it('should produce the same blocks and bytes for discriminated unions', () => {
		const schemaV3 = zV3.discriminatedUnion('type', [
			zV3.object({ type: zV3.literal('a'), a: zV3.string() }),
			zV3.object({ type: zV3.literal('b'), b: zV3.number().int().nonnegative() }),
		]);
		const schemaV4 = zV4.discriminatedUnion('type', [
			zV4.object({ type: zV4.literal('a'), a: zV4.string() }),
			zV4.object({ type: zV4.literal('b'), b: zV4.number().int().nonnegative() }),
		]);

		const serializerV3 = fromSchemaV3(schemaV3);
		const serializerV4 = fromSchemaV4(schemaV4);
		const dataA = { type: 'a', a: 'hello' } as const;
		const dataB = { type: 'b', b: 123 } as const;

		expect(serializerV4.blocks).toEqual(serializerV3.blocks);
		expect(serializerV4.encode(dataA)).toEqual(serializerV3.encode(dataA));
		expect(serializerV4.encode(dataB)).toEqual(serializerV3.encode(dataB));
	});
});
