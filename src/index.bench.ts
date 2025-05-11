import { bench } from "vitest";
import { match } from "./index.js";

const PATHS: string[] = [
  "/xyz",
  "/user",
  "/user/123",
  "/" + "a".repeat(32_000),
  "/-" + "-a".repeat(8_000) + "/-",
  "/||||\x00|" + "||".repeat(27387) + "|\x00".repeat(27387) + "/||/",
];

const STATIC_PATH_MATCH = match("/user");
const SIMPLE_PATH_MATCH = match("/user/:id");
const MULTI_SEGMENT_MATCH = match("/:x/:y");
const MULTI_PATTERN_MATCH = match("/:x-:y");
const TRICKY_PATTERN_MATCH = match("/:foo|:bar|");
const ASTERISK_MATCH = match("/*foo");

bench("static path", () => {
  for (const path of PATHS) STATIC_PATH_MATCH(path);
});

bench("simple path", () => {
  for (const path of PATHS) SIMPLE_PATH_MATCH(path);
});

bench("multi segment", () => {
  for (const path of PATHS) MULTI_SEGMENT_MATCH(path);
});

bench("multi pattern", () => {
  for (const path of PATHS) MULTI_PATTERN_MATCH(path);
});

bench("tricky pattern", () => {
  for (const path of PATHS) TRICKY_PATTERN_MATCH(path);
});

bench("asterisk", () => {
  for (const path of PATHS) ASTERISK_MATCH(path);
});
