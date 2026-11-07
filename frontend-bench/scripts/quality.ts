export {};
/** Core gates: both TypeScript projects, unit tests, production build. Browser tests run separately. */
const commands: string[][] = [
  [process.execPath, "x", "tsc", "-p", "tsconfig.json", "--noEmit"],
  [process.execPath, "x", "tsc", "-p", "tsconfig.client.json", "--noEmit"],
  [process.execPath, "test", "tests/domain.test.ts", "tests/repository.test.ts", "tests/runs.test.ts", "tests/scale.test.ts"],
  [process.execPath, "run", "build"],
];
for (const command of commands) {
  console.log(`\n> ${["bun", ...command.slice(1)].join(" ")}`);
  const child = Bun.spawn(command, { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exit(exitCode);
}
console.log("\nCore quality gates passed. Run bun run test:browser separately for browser coverage.");
