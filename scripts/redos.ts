import { checkSync } from "recheck";
import { pathToRegexp } from "../src/index.js";
import { MATCH_TESTS } from "../src/cases.spec.js";

let safe = 0;
let fail = 0;

const TESTS = MATCH_TESTS.map((x) => x.path);

for (const path of TESTS) {
  const { regexp } = pathToRegexp(path);
  const result = checkSync(regexp.source, regexp.flags);
  if (result.status === "safe") {
    safe++;
    console.log("Safe:", path, String(regexp));
  } else {
    fail++;
    console.log("Fail:", path, String(regexp));
  }
}

console.log("Safe:", safe, "Fail:", fail);
