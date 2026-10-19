import { assertEquals } from "@std/assert";

/** Compares through NFC; the actual output may intentionally prefer oxia. */
export function assertNfcEquals(
  actual: string,
  expected: string,
  message?: string,
): void {
  assertEquals(actual.normalize("NFC"), expected.normalize("NFC"), message);
}
