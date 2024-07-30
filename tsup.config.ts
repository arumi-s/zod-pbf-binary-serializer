export default {
	entry: ['src/index.ts'],
	format: ['cjs', 'esm'],
	dts: true,
	dtsResolve: true,
	noExternal: ['pbf'],
};
