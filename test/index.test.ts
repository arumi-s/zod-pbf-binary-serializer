import { describe, expect, it } from 'vitest';
import * as index from '../src';

describe('index', () => {
	it('should be a module', () => {
		expect(index).toBeTypeOf('object');
	});

	it('should export v3 and v4', () => {
		expect(index.v3).toBeTypeOf('object');
		expect(index.v4).toBeTypeOf('object');
		expect(index.v3.fromSchema).toBeTypeOf('function');
		expect(index.v4.fromSchema).toBeTypeOf('function');
	});
});
