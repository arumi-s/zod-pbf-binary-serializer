import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { isRefinementInstanceOf } from '../src/parse';

describe('isRefinementInstanceOf', () => {
	it('should work with Uint8Array and Buffer', () => {
		const schema = z.instanceof(Uint8Array) as any;

		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => new Uint8Array(8))).toEqual(true);
		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => Buffer.alloc(8))).toEqual(true);
		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => new Uint32Array(8))).toEqual(false);
		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => new Uint8Array(8).buffer)).toEqual(false);
	});

	it('should work with Map', () => {
		const schema = z.instanceof(Map) as any;

		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => new Map())).toEqual(true);
		expect(isRefinementInstanceOf(schema._def.effect.refinement, () => new Set())).toEqual(false);
	});
});
