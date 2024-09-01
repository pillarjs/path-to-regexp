import { checkSync } from "recheck";
import { match } from "../src/index.js";
import { MATCH_TESTS } from "../src/cases.spec.js";

let safe = 0;
let fail = 0;

const TESTS = MATCH_TESTS.map((x) => x.path);

for (const path of TESTS) {
  const { re } = match(path) as any;
  const result = checkSync(re.source, re.flags);
  if (result.status === "safe") {
    safe++;
    console.log("Safe:", path, String(re));
  } else {
    fail++;
    console.log("Fail:", path, String(re));
  }
}

console.log("Safe:", safe, "Fail:", fail);
