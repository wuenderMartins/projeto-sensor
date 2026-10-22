const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const talhoes = ["G1-T01", "G1-T02", "G1-T03", "G2-T01", "G2-T02", "G2-T03"];

const processes = [
  ["Average Service", "services/average-service.ts"],
  ...talhoes.map((id) => [`Talhao ${id}`, "talhoes/talhao-server.ts", id]),
  ["Gateway G1", "gateways/gateway.ts", "G1"],
  ["Gateway G2", "gateways/gateway.ts", "G2"],
].map(([name, file, ...args]) => {
  // "--import tsx" executa o TypeScript direto, sem precisar de build.
  const child = spawn(process.execPath, ["--import", "tsx", path.join(root, "src", file), ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  child.on("error", (error) => console.error(`[${name}] ${error.message}`));
  return child;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of processes) if (!child.killed) child.kill();
  setTimeout(() => process.exit(0), 200).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
console.log("\nSmart Farm parte 02  ·  Ctrl+C para encerrar\n");
