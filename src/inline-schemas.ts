import { z } from "zod";

// Helper function to inline nested schemas
export function inlineNestedSchemas(schema: z.ZodTypeAny): z.ZodTypeAny {
  // Handle object schemas
  if (schema instanceof z.ZodObject) {
    const shape = schema._def.shape(); // Use the shape() method
    const inlinedShape = Object.fromEntries(
      Object.entries(shape).map(([key, value]) => [
        key,
        inlineNestedSchemas(value as z.ZodTypeAny),
      ]),
    );
    return z.object(inlinedShape); // Recreate the object schema with inlined properties
  }

  // Handle array schemas
  if (schema instanceof z.ZodArray) {
    return z.array(inlineNestedSchemas(schema._def.type)); // Recursively inline the array's item type
  }

  // Handle optional types
  if (schema instanceof z.ZodOptional) {
    return z.optional(inlineNestedSchemas(schema._def.innerType)); // Recursively inline the optional type
  }

  // Handle nullable types
  if (schema instanceof z.ZodNullable) {
    return z.nullable(inlineNestedSchemas(schema._def.innerType)); // Recursively inline the nullable type
  }

  // Handle union types
  if (schema instanceof z.ZodUnion) {
    return z.union(schema._def.options.map(inlineNestedSchemas)); // Recursively inline each union option
  }

  // Handle intersection types
  if (schema instanceof z.ZodIntersection) {
    return z.intersection(
      inlineNestedSchemas(schema._def.left),
      inlineNestedSchemas(schema._def.right),
    ); // Recursively inline left and right schemas
  }

  // Handle other schema types as-is
  return schema;
}
