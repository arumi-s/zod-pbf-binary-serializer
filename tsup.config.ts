export default {
	entry: ['src/index.ts', 'src/v3/index.ts', 'src/v4/index.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	dtsResolve: true,
	noExternal: ['pbf'],
};
