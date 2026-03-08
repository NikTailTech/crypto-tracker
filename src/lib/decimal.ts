import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type D = Decimal;

export function d(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function toDecimalString(value: Decimal): string {
  return value.toFixed();
}

export function sumDecimalStrings(...values: string[]): string {
  return values.reduce((acc, v) => d(acc).plus(v), d(0)).toFixed();
}

export function multiplyDecimalStrings(a: string, b: string): string {
  return d(a).times(b).toFixed();
}

export function divideDecimalStrings(a: string, b: string): string {
  if (d(b).isZero()) return "0";
  return d(a).div(b).toFixed();
}

export function subtractDecimalStrings(a: string, b: string): string {
  return d(a).minus(b).toFixed();
}

export function minDecimal(a: string, b: string): string {
  return Decimal.min(d(a), d(b)).toFixed();
}

export function isZero(value: string): boolean {
  return d(value).isZero();
}

export function isNegative(value: string): boolean {
  return d(value).isNegative();
}

export function compareDecimal(a: string, b: string): number {
  return d(a).comparedTo(b);
}
