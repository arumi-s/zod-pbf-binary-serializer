import type { z } from 'zod';

export type SerializableDef =
	| z.ZodArrayDef
	| z.ZodBooleanDef
	| z.ZodNumberDef
	| z.ZodObjectDef
	| z.ZodStringDef
	| z.ZodLiteralDef<SerializableSchema>
	| z.ZodEffectsDef<SerializableSchema>
	| z.ZodDiscriminatedUnionDef<string>;

export type SerializableSchema = z.Schema<any, SerializableDef>;
