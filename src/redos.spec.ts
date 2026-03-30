import { check } from "recheck";
import { pathToRegexp } from "./index.js";
import { MATCH_TESTS } from "./cases.spec.js";
import { describe, expect, it } from "vitest";

describe.concurrent("redos", () => {
  it.each(
    // Array regex currently has false positives.
    MATCH_TESTS.filter((x) => typeof x.path === "string").map((x) => [
      x.path,
      pathToRegexp(x.path).regexp,
    ]),
  )("%s - %s", { timeout: 10_000 }, async (_, regexp) => {
    const result = await check(regexp.source, regexp.flags);
    expect(result.status).toBe("safe");
  });
});
