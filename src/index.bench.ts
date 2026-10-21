import { test } from "vitest";
import { compile, match, parse, pathToRegexp } from "./index.js";

const PATHS: string[] = [
  "/api",
  "/user/:id",
  "/user/:id{/:extra}",
  "/files/*path",
  "/:param1-:param2",
  '/quoted-:"param1"',
  "/complex/:param1-:param2/*path",
  "/name{/:attr1}{-:attr2}{-:attr3}",
];

test("parse", async ({ bench }) => {
  await bench("parsing paths", () => {
    for (const path of PATHS) parse(path);
  }).run();
});

test("toRegexp", async ({ bench }) => {
  await bench("building regexp", () => {
    for (const path of PATHS) pathToRegexp(path);
  }).run();
});

test("match", async ({ bench }) => {
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

  await bench("static path", () => {
    for (const path of PATHS) STATIC_PATH_MATCH(path);
  }).run();

  await bench("simple path", () => {
    for (const path of PATHS) SIMPLE_PATH_MATCH(path);
  }).run();

  await bench("multi segment", () => {
    for (const path of PATHS) MULTI_SEGMENT_MATCH(path);
  }).run();

  await bench("multi pattern", () => {
    for (const path of PATHS) MULTI_PATTERN_MATCH(path);
  }).run();

  await bench("tricky pattern", () => {
    for (const path of PATHS) TRICKY_PATTERN_MATCH(path);
  }).run();

  await bench("asterisk", () => {
    for (const path of PATHS) ASTERISK_MATCH(path);
  }).run();
});

test("compile", async ({ bench }) => {
  const PATH_FNS = PATHS.map((path) => compile(path));

  await bench("compiling paths", () => {
    for (const fn of PATH_FNS) {
      fn({
        id: "123",
        param1: "param1",
        param2: "param2",
        path: ["path", "to", "file"],
      });
    }
  }).run();
});
