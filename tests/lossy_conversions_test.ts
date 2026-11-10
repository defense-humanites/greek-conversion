import { test } from "node:test";
import { assertNfcEquals } from "./assertions.ts";
import { convert } from "../src/mod.ts";
import { LOSSY_CONVERSIONS } from "./fixtures.ts";

test("lossy conversions return their documented canonical form", async (t) => {
  for (const conversion of LOSSY_CONVERSIONS) {
    await t.test(conversion.name, () => {
      const intermediate = convert(
        conversion.source,
        conversion.sourceFormat,
        conversion.intermediateFormat,
        "options" in conversion ? conversion.options : undefined,
      );

      assertNfcEquals(intermediate, conversion.intermediate);
      assertNfcEquals(
        convert(
          intermediate,
          conversion.intermediateFormat,
          conversion.sourceFormat,
        ),
        conversion.canonicalRoundTrip,
      );
    });
  }
});
