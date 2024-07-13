import { checkSync } from "recheck";
import { pathToRegexp } from "../src/index.js";

const TESTS = [
  "/abc{abc:foo}?",
  "/:foo{abc:foo}?",
  "{:attr1}?{:attr2/}?",
  "{:attr1/}?{:attr2/}?",
  "{:foo.}?{:bar.}?",
  "{:foo([^\\.]+).}?{:bar.}?",
  ":foo(a+):bar(b+)",
];

for (const path of TESTS) {
  try {
    const re = pathToRegexp(path, { strict: true });
    const result = checkSync(re.source, re.flags);
    if (result.status === "safe") {
      console.log("Safe:", path, String(re));
    } else {
      console.log("Fail:", path, String(re));
    }
  } catch (err) {
    try {
      const re = pathToRegexp(path);
      const result = checkSync(re.source, re.flags);
      if (result.status === "safe") {
        console.log("Invalid:", path, String(re));
      } else {
        console.log("Pass:", path, String(re));
      }
    } catch (err) {
      console.log("Error:", path, err.message);
    }
  }
}
