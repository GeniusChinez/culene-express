import type { ZodError } from "zod";

import { z } from "zod";
import { BaseActionData, convertFieldErrorsToArray } from "./forms";

export const CleanPositiveIntSchema = z
  .number({
    invalid_type_error: "Provide a valid number",
    required_error: "Provide a number",
  })
  .int({ message: "Enter a whole number (integer)" })
  .positive({ message: "Enter a positive number" });

export const StringNumber = z
  .string({
    invalid_type_error: "Provide a valid number",
    required_error: "Provide a number",
  })
  // .regex(/\d+/, { message: 'Enter a valid number' })
  // .transform(Number);
  .regex(/\d+(,\d+)*$/, { message: "Enter a valid number" })
  .transform((value: string) => Number(value.replace(/,/g, "")));

export const PerhapsEmptyRecordIdSchema = z
  .string({
    invalid_type_error: "Provide a valid record ID",
  })
  .max(50, { message: "Use less than 51 characters for the record ID" });
export const PresentStringSchema = z
  .string({
    invalid_type_error: "Provide a valid string",
    required_error: "Provide a string",
  })
  .min(1, { message: "Use at least 1 character for the string" });

export const PositiveDecimalSchema = z
  .number({
    invalid_type_error: "Provide a valid number",
    required_error: "Provide a number",
  })
  .positive({ message: "Enter a positive" })
  .or(StringNumber)
  .refine((n) => n > 0);

export const PerhapsZeroDecimalSchema = z
  .number({
    invalid_type_error: "Provide a valid number",
    required_error: "Provide a number",
  })
  .min(0, { message: "Provide a number" })
  .or(StringNumber)
  .refine((n) => n >= 0);

export const PerhapsZeroIntSchema = z
  .number({
    invalid_type_error: "Provide a valid number",
  })
  .int({ message: "Enter a whole number (integer)" })
  .min(0)
  .or(StringNumber)
  .refine((n) => n >= 0);

export const PositiveIntSchema = z
  .number({
    invalid_type_error: "Provide a valid number",
    required_error: "Provide a number",
  })
  .int({ message: "Enter a whole number (integer)" })
  .min(1, { message: "Provide a number" })
  .or(StringNumber)
  .refine((n) => n > 0, {
    message: "Must be greater than zero",
  });

export const DateSchema = z.preprocess(
  (arg) => {
    if (typeof arg == "string" || arg instanceof Date) {
      return new Date(arg);
    }
  },
  z.date({
    invalid_type_error: "Provide a valid date",
    required_error: "Provide a date",
  }),
);

export const PastDateSchema = z.preprocess(
  (arg) => {
    if (typeof arg == "string" || arg instanceof Date) {
      return new Date(arg);
    }
  },
  z.date().max(new Date(), { message: "Date must be in the past" }),
  z.date({
    invalid_type_error: "Provide a valid date",
    required_error: "Provide a date",
  }),
);

export const FutureDateSchema = z.preprocess(
  (arg) => {
    if (typeof arg == "string" || arg instanceof Date) {
      return new Date(arg);
    }
  },
  z.date().min(new Date(), { message: "Date must be in the future" }),
  z.date({
    invalid_type_error: "Provide a valid date",
    required_error: "Provide a date",
  }),
);

export const BooleanSchema = z.preprocess(
  (arg) => {
    if (typeof arg === "string") {
      return arg === "true";
    }
  },
  z.boolean({
    invalid_type_error: "Provide a valid boolean (yes/no)",
    required_error: "Provide yes/no input",
  }),
);

const HasSuccessSchema = z.object({
  success: z.literal(true),
});
export function hasSuccess(
  data: unknown,
): data is z.infer<typeof HasSuccessSchema> {
  return HasSuccessSchema.safeParse(data).success;
}

export type Result<Ok, Err> =
  | { success: true; data: Ok }
  | { success: false; err: Err };

export function stringifyZodError(zodError: ZodError) {
  const { fieldErrors, formErrors } = zodError.flatten();
  const allErrors = [
    ...(convertFieldErrorsToArray(fieldErrors) || []),
    ...formErrors,
  ];
  return allErrors.join(", ");
}

// Convert ZodError into structured field errors
export function formatZodError(
  zodError: ZodError,
): BaseActionData["fieldErrors"] {
  const { fieldErrors } = zodError.flatten();

  // Directly return fieldErrors, which is already structured as an object
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}
