import { describe, it, expect } from 'vitest';
import { optional } from '../src/encode';

describe('optional', () => {
	it('should work', () => {
		expect(optional(undefined)).toEqual(0);
		expect(optional(null)).toEqual(2);
		expect(optional('hello')).toEqual(1);
	});

	it('should work with object property', () => {
		const data: Record<string, unknown> = { a: 'hello', b: 123, nullvalue: null, undefinedvalue: undefined };

		expect(optional(data.a)).toEqual(1);
		expect(optional(data.b)).toEqual(1);
		expect(optional(data['notexist'])).toEqual(0);
		expect(optional(data['undefinedvalue'])).toEqual(0);
		expect(optional(data['nullvalue'])).toEqual(2);
	});
});
