export {};
const action = process.argv[2];
const args = action === "up" ? ["compose", "up", "-d", "db"] : action === "down" ? ["compose", "stop", "db"] : null;
if (!args) throw new Error("Use bun run db:up or bun run db:down");
const command = Bun.spawn(["docker", ...args], { stdin: "inherit", stdout: "inherit", stderr: "inherit" });
process.exit(await command.exited);
