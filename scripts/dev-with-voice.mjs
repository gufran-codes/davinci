import { spawn } from "node:child_process";

// Keep web and voice in the same terminal so a missing worker cannot look like
// a connected, silently listening tutor. No credentials are logged here.
const children = [
  spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "dev", "--hostname", "0.0.0.0"],
    { stdio: "inherit" },
  ),
  spawn(
    process.execPath,
    [
      "--env-file-if-exists=.env",
      "--env-file-if-exists=.env.local",
      "--import",
      "tsx",
      "agents/primer.ts",
      "dev",
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  children.forEach((child) => {
    if (child.exitCode === null) child.kill("SIGTERM");
  });
  const timeout = setTimeout(() => {
    children.forEach((child) => {
      if (child.exitCode === null) child.kill("SIGKILL");
    });
  }, 10_000);
  timeout.unref();
}
children.forEach((child) => {
  child.on("error", () => {
    console.error(
      "Could not start Da Vinci. Check your Node installation and environment setup.",
    );
    stop(1);
  });
  child.on("exit", (code) => stop(code ?? 1));
});
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
