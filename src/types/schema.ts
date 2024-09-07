import type { z } from 'zod';

export type SerializableDef =
	| z.ZodStringDef
	| z.ZodNumberDef
	| z.ZodBooleanDef
	| z.ZodDateDef
	| z.ZodArrayDef
	| z.ZodObjectDef
	| z.ZodOptionalDef<SerializableSchema>
	| z.ZodNullableDef<SerializableSchema>
	| z.ZodLiteralDef<string | number | boolean>
	| z.ZodEnumDef<z.EnumValues>
	| z.ZodEffectsDef<SerializableSchema>
	| z.ZodDiscriminatedUnionDef<string>;

export type SerializableSchema = z.Schema<any, SerializableDef>;
