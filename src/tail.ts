/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Extracts the tail elements of a tuple type.
 *
 * This utility type takes a tuple type `T` and returns a new tuple type
 * that contains all elements of `T` except for the first one. If `T` is
 * not a tuple type, it returns `never`.
 *
 * @template T - The tuple type from which to extract the tail elements.
 * @example
 * ```typescript
 * type T1 = Tail<[1, 2, 3]>; // [2, 3]
 * type T2 = Tail<[string, boolean, number]>; // [boolean, number]
 * type T3 = Tail<[]>; // never
 * type T4 = Tail<number>; // never
 * ```
 */
export type Tail<T> = T extends [any, ...infer Rest] ? Rest : never;

/**
 * Returns a new array that contains all elements of the input array except the first one.
 *
 * @template T - The type of the input array.
 * @param {T} stuff - The input array from which the tail elements are to be extracted.
 * @returns {Tail<T>} A new array containing all elements of the input array except the first one.
 *
 * @example
 * ```typescript
 * const numbers = [1, 2, 3, 4];
 * const result = tail(numbers);
 * console.log(result); // Output: [2, 3, 4]
 * ```
 *
 * @remarks
 * This function uses TypeScript's type inference to ensure that the returned array has the correct type.
 * The `Tail` type represents the type of the array without its first element.
 */
export function tail<T extends any[]>(stuff: T): Tail<T> {
  return stuff.slice(1) as Tail<T>;
}
