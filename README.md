# zod-pbf-binary-serializer

[![npm version](https://badgen.net/npm/v/zod-pbf-binary-serializer)](https://npm.im/zod-pbf-binary-serializer) [![npm downloads](https://badgen.net/npm/dm/zod-pbf-binary-serializer)](https://npm.im/zod-pbf-binary-serializer)

Serialize and deserialize [zod](https://github.com/colinhacks/zod) schemas to and from a compact binary format.

Bundles the [pbf](https://github.com/mapbox/pbf) package for binary data manipulation.

Requires zod v3 or later.

## Install

```bash
npm i zod-pbf-binary-serializer
```

## Supported Schemas

- z.string
- z.number
- z.boolean
- z.array
- z.object
- z.instanceof(Uint8Array)
- z.discriminatedUnion
- z.literal(string | number | boolean)

## Usage

```typescript
import { fromSchema } from 'zod-pbf-binary-serializer';

const schema = z.object({
	a: z.string(),
	b: z.number(),
	c: z.boolean(),
	d: z.array(z.string()),
});

const serializer = fromSchema(schema);

const data = {
	a: 'apple',
	b: 123,
	c: true,
	d: ['hello', 'world'],
};

const buffer = serializer.encode(data);
console.log(buffer);
/**
 * Uint8Array(28) [
 *  5, 97, 112, 112, 108, 101,
 *  0, 0, 0, 0, 0, 192, 94, 64,
 *  1,
 *  2, 5, 104, 101, 108, 108, 111, 5, 119, 111, 114, 108, 100
 * ]
 */

const decoded = serializer.decode(buffer);
console.log(decoded);
// { a: 'apple', b: 123, c: true, d: ['hello', 'world'] }
```

## License

[MIT](https://github.com/arumi-s/zod-pbf-binary-serializer/blob/master/LICENSE)
