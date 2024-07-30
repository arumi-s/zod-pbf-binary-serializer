import type { Primitive } from 'zod';

export type Path = string[];

export type PrimitiveBlockType = 'string' | 'float' | 'int' | 'uint' | 'boolean' | 'buffer';

export type PrimitiveBlock = {
	block: 'primitive';
	type: PrimitiveBlockType;
	path: Path;
};

export type ArrayBlock = {
	block: 'array';
	type: PrimitiveBlockType | 'object';
	blocks: Block[];
	path: Path;
};

export type DiscriminatorBlock = {
	block: 'discriminator';
	type: Exclude<PrimitiveBlockType, 'buffer'>;
	options: Map<Primitive, Block[]>;
	discriminator: string;
	path: Path;
};

export type Block = PrimitiveBlock | ArrayBlock | DiscriminatorBlock;
