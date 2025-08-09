import cp from "node:child_process";
import fs from "node:fs/promises";

const build = async () => {
  try {
    // Clean up the output directory
    await fs.rm("dist", { recursive: true, force: true });
    await fs.mkdir("dist", { recursive: true });

    // Compile .ts to .js
    cp.execSync("ts-scripts build", { stdio: "inherit" });

    // Create package.json file
    const pkg = await fs.readFile("package.json", "utf8");
    await fs.writeFile(
      "dist/package.json",
      JSON.stringify(
        {
          ...JSON.parse(pkg),
          private: undefined,
          scripts: undefined,
          devDependencies: undefined,
        },
        null,
        2,
      ),
    );
    await fs.writeFile(
      "dist/cjs/package.json",
      JSON.stringify({ type: "commonjs" }, null, 2),
    );
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
};

await build();
