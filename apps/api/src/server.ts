import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "./app";
import { MockAgentService } from "./services/mock-agent-service";
import { SimpleGitService } from "./services/simple-git-service";

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const app = buildApp({
  agentService: new MockAgentService(),
  gitService: new SimpleGitService(),
});

app.listen({ host: "0.0.0.0", port: 4000 }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
