import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { fromSchema } from '../src';

describe('fromSchema', () => {
	it('should work', () => {
		const schema = z.object({
			a: z.string(),
			b: z.number(),
			c: z.boolean(),
			d: z.array(z.string()),
			e: z.object({
				f: z.string(),
				g: z.number(),
				h: z.boolean(),
				i: z.array(z.string()),
			}),
		});
		const serializer = fromSchema(schema);

		const data = {
			a: 'hello',
			b: 123,
			c: true,
			d: ['hello', 'world'],
			e: {
				f: 'hello',
				g: 123,
				h: true,
				i: ['hello', 'world'],
			},
		};

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(decoded).toEqual(data);
	});

	it('should work with z.string', () => {
		const schema = z.string();
		const serializer = fromSchema(schema);

		const data = 'hello';

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('string');
		expect(decoded).toEqual(data);
	});

	it('should work with z.number', () => {
		const schema = z.number();
		const serializer = fromSchema(schema);

		const data = 123.45678;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('float');
		expect(decoded).toEqual(data);
	});

	it('should work with z.number.int', () => {
		const schema = z.number().int();
		const serializer = fromSchema(schema);

		const data = -123;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('int');
		expect(decoded).toEqual(data);
	});

	it('should work with z.number.int.min(0)', () => {
		const schema = z.number().int().min(0);
		const serializer = fromSchema(schema);

		const data = 1234;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('uint');
		expect(decoded).toEqual(data);
	});

	it('should work with z.boolean', () => {
		const schema = z.boolean();
		const serializer = fromSchema(schema);

		const data = true;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('boolean');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of strings', () => {
		const schema = z.array(z.string());
		const serializer = fromSchema(schema);

		const data = ['hello', 'world', '', '\xe4\xbd\xa0\xe5\xa5\xbd'];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('string');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of floats', () => {
		const schema = z.array(z.number());
		const serializer = fromSchema(schema);

		const data = [123.1, -456.2, 789.3, Number.MAX_VALUE, Number.MIN_VALUE];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('float');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of ints', () => {
		const schema = z.array(z.number().int());
		const serializer = fromSchema(schema);

		const data = [123, -456, 789, Number.MAX_SAFE_INTEGER, Math.floor(Number.MIN_SAFE_INTEGER / 2) /* this is the minimum int storable*/];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('int');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of uints', () => {
		const schema = z.array(z.number().int().min(0));
		const serializer = fromSchema(schema);

		const data = [123, 456, 789, Number.MAX_SAFE_INTEGER, 0];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('uint');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of booleans and encoded as bit array', () => {
		const schema = z.array(z.boolean());
		const serializer = fromSchema(schema);

		const data = [true, false, true, false, true, false, true, true, false, true, false, false, true];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('boolean');
		expect(buffer).toEqual(new Uint8Array([13, 2, 0b11010101, 0b00010010]));
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of objects', () => {
		const schema = z.array(z.object({ a: z.string(), b: z.number().int(), c: z.array(z.string()) }));
		const serializer = fromSchema(schema);

		const data = [
			{ a: 'aaa', b: 123, c: ['hello', 'world'] },
			{ a: 'bbb', b: 456, c: ['goodbye', 'friend'] },
			{ a: 'ccc', b: 789, c: ['xyz', 'abc'] },
		];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('object');
		expect(decoded).toEqual(data);
	});

	it('should work with z.array of z.instanceof(Uint8Array)', () => {
		const schema = z.array(z.instanceof(Uint8Array));
		const serializer = fromSchema(schema);

		const data = [
			new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]),
			new Uint8Array([0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]),
		];

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('array');
		expect(serializer.blocks[0].type).toEqual('buffer');
		expect(decoded).toEqual(data);
	});

	it('should work with z.object', () => {
		const schema = z.object({
			a: z.string(),
			b: z.number(),
			c: z.boolean(),
			d: z.array(z.string()),
		});
		const serializer = fromSchema(schema);

		const data = {
			a: 'hello',
			b: 123,
			c: true,
			d: ['hello', 'world'],
		};

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].type).toEqual('string');
		expect(serializer.blocks[1].type).toEqual('float');
		expect(serializer.blocks[2].type).toEqual('boolean');
		expect(decoded).toEqual(data);
	});

	it('should work with z.instanceof(Uint8Array)', () => {
		const schema = z.object({ d: z.instanceof(Uint8Array).refine((v) => v.length === 8) });
		const serializer = fromSchema(schema);

		const d = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);
		const data = { d };

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('buffer');
		expect(decoded).toEqual(data);
	});

	it('should throw with unsupported type', () => {
		const schema = z.object({ d: z.bigint() });

		expect(() => fromSchema(schema)).toThrow('Unsupported schema at: d');
	});

	it('should work with z.literal string', () => {
		const schema = z.object({ d: z.literal('hello') });
		const serializer = fromSchema(schema);

		const data = { d: 'hello' } as const;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('string');
		expect(decoded).toEqual(data);
	});

	it('should work with z.literal number', () => {
		const schema = z.object({ d: z.literal(123) });
		const serializer = fromSchema(schema);

		const data = { d: 123 } as const;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('float');
		expect(decoded).toEqual(data);
	});

	it('should work with z.literal boolean', () => {
		const schema = z.object({ d: z.literal(true) });
		const serializer = fromSchema(schema);

		const data = { d: true } as const;

		const buffer = serializer.encode(data);
		const decoded = serializer.decode(buffer);

		expect(serializer.blocks[0].block).toEqual('primitive');
		expect(serializer.blocks[0].type).toEqual('boolean');
		expect(decoded).toEqual(data);
	});

	it('should throw with unsupported literal type', () => {
		const schema = z.literal(Symbol('hello')) as any;

		expect(() => fromSchema(schema)).toThrow('Unsupported literal value');
	});

	it('should work with z.discriminatedUnion using string discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), a: z.string() }),
			z.object({ type: z.literal('b'), b: z.number() }),
		]);
		const serializer = fromSchema(schema);

		const dataA = { type: 'a', a: 'hello' } as const;
		const dataB = { type: 'b', b: 123 } as const;

		const bufferA = serializer.encode(dataA);
		const bufferB = serializer.encode(dataB);
		const decodedA = serializer.decode(bufferA);
		const decodedB = serializer.decode(bufferB);

		expect(serializer.blocks[0].block).toEqual('discriminator');
		expect(serializer.blocks[0].type).toEqual('string');
		expect(decodedA).toEqual(dataA);
		expect(decodedB).toEqual(dataB);
	});

	it('should work with z.discriminatedUnion using int discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal(1), a: z.string() }),
			z.object({ type: z.literal(2), b: z.number() }),
		]);
		const serializer = fromSchema(schema);

		const dataA = { type: 1, a: 'hello' } as const;
		const dataB = { type: 2, b: 123 } as const;

		const bufferA = serializer.encode(dataA);
		const bufferB = serializer.encode(dataB);
		const decodedA = serializer.decode(bufferA);
		const decodedB = serializer.decode(bufferB);

		expect(serializer.blocks[0].block).toEqual('discriminator');
		expect(serializer.blocks[0].type).toEqual('int');
		expect(decodedA).toEqual(dataA);
		expect(decodedB).toEqual(dataB);
	});

	it('should work with z.discriminatedUnion using float discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal(0.1), a: z.string() }),
			z.object({ type: z.literal(0.2), b: z.number() }),
		]);
		const serializer = fromSchema(schema);

		const dataA = { type: 0.1, a: 'hello' } as const;
		const dataB = { type: 0.2, b: 123 } as const;

		const bufferA = serializer.encode(dataA);
		const bufferB = serializer.encode(dataB);
		const decodedA = serializer.decode(bufferA);
		const decodedB = serializer.decode(bufferB);

		expect(serializer.blocks[0].block).toEqual('discriminator');
		expect(serializer.blocks[0].type).toEqual('float');
		expect(decodedA).toEqual(dataA);
		expect(decodedB).toEqual(dataB);
	});

	it('should work with z.discriminatedUnion using int and float discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal(1), a: z.string() }),
			z.object({ type: z.literal(1.5), b: z.number() }),
		]);
		const serializer = fromSchema(schema);

		const dataA = { type: 1, a: 'hello' } as const;
		const dataB = { type: 1.5, b: 123 } as const;

		const bufferA = serializer.encode(dataA);
		const bufferB = serializer.encode(dataB);
		const decodedA = serializer.decode(bufferA);
		const decodedB = serializer.decode(bufferB);

		expect(serializer.blocks[0].block).toEqual('discriminator');
		expect(serializer.blocks[0].type).toEqual('float');
		expect(decodedA).toEqual(dataA);
		expect(decodedB).toEqual(dataB);
	});

	it('should work with z.discriminatedUnion using boolean discriminator', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal(true), a: z.string() }),
			z.object({ type: z.literal(false), b: z.number() }),
		]);
		const serializer = fromSchema(schema);

		const dataA = { type: true, a: 'hello' } as const;
		const dataB = { type: false, b: 123 } as const;

		const bufferA = serializer.encode(dataA);
		const bufferB = serializer.encode(dataB);
		const decodedA = serializer.decode(bufferA);
		const decodedB = serializer.decode(bufferB);

		expect(serializer.blocks[0].block).toEqual('discriminator');
		expect(serializer.blocks[0].type).toEqual('boolean');
		expect(decodedA).toEqual(dataA);
		expect(decodedB).toEqual(dataB);
	});

	it('should throw with z.discriminatedUnion using mixed types', () => {
		const schema = z.discriminatedUnion('type', [
			z.object({ type: z.literal('a'), a: z.string() }),
			z.object({ type: z.literal(123), b: z.number() }),
		]);

		expect(() => fromSchema(schema)).toThrow('Could not determine the type of the discriminated union');
	});

	it('should throw with unsupported effect', () => {
		const schema = z.object({ d: z.string().transform((v) => v.length) });

		expect(() => fromSchema(schema)).toThrow('Unsupported effect');
	});

	it('should throw with .optional', () => {
		const schema = z.object({ a: z.string(), b: z.string().optional() });

		expect(() => fromSchema(schema)).toThrow('Unsupported schema at: b');
	});

	it('should throw with .nullable', () => {
		const schema = z.object({ a: z.string(), b: z.string().nullable() });

		expect(() => fromSchema(schema)).toThrow('Unsupported schema at: b');
	});

	it('should throw when encoding unknown type', () => {
		const serializer = fromSchema(z.string());
		serializer.blocks[0].type = 'unknown' as any;

		expect(() => serializer.encode('hello')).toThrow('Unknown type: unknown');
	});

	it('should throw when decoding unknown type', () => {
		const serializer = fromSchema(z.string());
		serializer.blocks[0].type = 'never' as any;

		expect(() => serializer.decode(new Uint8Array())).toThrow('Unknown type: never');
	});
});
