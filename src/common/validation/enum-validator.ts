import { IsIn } from 'class-validator';

/**
 * Enum membership validator for `as const` string arrays.
 *
 * Deliberately NOT `@IsEnum(ARRAY)`: class-validator builds its
 * `$constraint2` message token via `Object.keys()` and drops numeric keys,
 * so an array argument validates correctly but renders an empty allow-list
 * in the error message ("must be one of the following values: "). `@IsIn`
 * keeps both the check and the human-readable list.
 */
export function IsEnumValues<T extends readonly string[]>(values: T) {
  return IsIn(values as unknown as string[], {
    message: `must be one of the following values: ${values.join(', ')}`,
  });
}
