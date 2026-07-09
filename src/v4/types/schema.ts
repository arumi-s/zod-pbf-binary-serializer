import type * as z from 'zod/v4';

export type SerializableSchema =
	| z.ZodString
	| z.ZodNumber
	| z.ZodBoolean
	| z.ZodDate
	| z.ZodArray<z.ZodType>
	| z.ZodObject
	| z.ZodOptional<z.ZodType>
	| z.ZodNullable<z.ZodType>
	| z.ZodLiteral
	| z.ZodEnum
	| z.ZodDiscriminatedUnion
	| z.ZodCustom
	| z.ZodCodec;
