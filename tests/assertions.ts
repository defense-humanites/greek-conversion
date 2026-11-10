/**
 * The assertions of the test suite, on `node:assert/strict`. They keep the
 * names and argument order of the Deno standard library's, which the suite
 * used until 1.0.0-rc.7.
 *
 * @module
 */
import nodeAssert from "node:assert/strict";

/** Asserts that `value` is truthy. */
export function assert(value: unknown, message?: string): asserts value {
  nodeAssert.ok(value, message);
}

/** Asserts deep strict equality, prototypes included. */
export function assertEquals<T>(
  actual: T,
  expected: T,
  message?: string,
): void {
  nodeAssert.deepStrictEqual(actual, expected, message);
}

/** Compares through NFC; the actual output may intentionally prefer oxia. */
export function assertNfcEquals(
  actual: string,
  expected: string,
  message?: string,
): void {
  assertEquals(actual.normalize("NFC"), expected.normalize("NFC"), message);
}

/** Asserts that `value` is neither `null` nor `undefined`. */
export function assertExists<T>(
  value: T,
  message?: string,
): asserts value is NonNullable<T> {
  nodeAssert.ok(
    value !== undefined && value !== null,
    message ?? `expected a value, got ${value}`,
  );
}

type ErrorClass<E extends Error> = abstract new (...args: never[]) => E;

/**
 * Asserts that `run` throws an instance of `errorClass` whose message
 * includes `includes`, and returns the error.
 */
export function assertThrows<E extends Error = Error>(
  run: () => unknown,
  errorClass: ErrorClass<E>,
  includes?: string,
  message?: string,
): E {
  let threw = false;
  let thrown: unknown;
  try {
    run();
  } catch (error) {
    threw = true;
    thrown = error;
  }
  const context = message === undefined ? "" : `: ${message}`;
  if (!threw) {
    nodeAssert.fail(`expected ${errorClass.name} to be thrown${context}`);
  }
  if (!(thrown instanceof errorClass)) {
    nodeAssert.fail(
      `expected ${errorClass.name}, got ${String(thrown)}${context}`,
    );
  }
  if (includes !== undefined && !thrown.message.includes(includes)) {
    nodeAssert.fail(
      `expected the message to include "${includes}", got "${thrown.message}"${context}`,
    );
  }
  return thrown;
}
