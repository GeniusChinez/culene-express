import type { Tail } from "./tail";
import { expectType } from "tsd";
import { tail } from "./tail";

describe("Tail type", () => {
  it("should return the tail of a tuple", () => {
    type Test = Tail<[1, 2, 3]>;
    expectType<[2, 3]>({} as Test);
  });

  it("should return an empty tuple if given a single-element tuple", () => {
    type Test = Tail<[1]>;
    expectType<[]>({} as Test);
  });

  it("should return never for an empty tuple", () => {
    type Test = Tail<[]>;
    expectType<never>({} as Test);
  });

  it("should return the tail of a tuple with mixed types", () => {
    type Test = Tail<[string, number, boolean]>;
    expectType<[number, boolean]>({} as Test);
  });

  it("should return never for non-tuple types", () => {
    type Test = Tail<number>;
    expectType<never>({} as Test);
  });
});

describe("tail function", () => {
  it("should return the tail of a tuple", () => {
    const result = tail([1, 2, 3]);
    expect(result).toEqual([2, 3]);
  });

  it("should return an empty array if given a single-element array", () => {
    const result = tail([1]);
    expect(result).toEqual([]);
  });

  it("should return an empty array if given an empty array", () => {
    const result = tail([]);
    expect(result).toEqual([]);
  });

  it("should return the tail of an array with mixed types", () => {
    const result = tail(["a", 1, true]);
    expect(result).toEqual([1, true]);
  });

  it("should handle arrays with different types correctly", () => {
    const result = tail([1, "a", { key: "value" }]);
    expect(result).toEqual(["a", { key: "value" }]);
  });

  it("should handle nested arrays correctly", () => {
    const result = tail([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(result).toEqual([
      [3, 4],
      [5, 6],
    ]);
  });
});
