import { checkSync } from "recheck";
import { pathToRegexp } from "./src/index.js";

let safe = 0;
let fail = 0;

const tests = ["/:x{/foobar/:y}?-:z"];

for (const path of tests) {
  const regexp = pathToRegexp(path);
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
