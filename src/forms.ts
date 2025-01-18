export interface BaseActionData {
  formError?: string;
  fields?: {
    [index: string]: string | File;
  };
  fieldErrors?: {
    [index: string]: string[] | undefined;
  };
}

export function convertFieldErrorsToArray(
  fieldErrors: BaseActionData["fieldErrors"],
) {
  if (!fieldErrors) {
    return undefined;
  }
  return Object.keys(fieldErrors)
    .map((key) => {
      const errors = fieldErrors[key];
      if (!errors) {
        return undefined;
      }
      return `${key}: ${errors.join(", ")}`;
    })
    .filter(Boolean);
}

export function printFormData(formData: FormData) {
  const lines: string[] = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      lines.push(
        `>${key}: [File: ${value.name}, type: ${value.type}, size: ${value.size} bytes]`,
      );
    } else {
      lines.push(`>${key}: ${value}`);
    }
  }
}
