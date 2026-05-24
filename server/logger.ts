import fs from "fs";
import path from "path";

const LOG_FILE = path.resolve(process.cwd(), "server.log");

export function fileLog(...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${args.join(" ")}\n`;
  fs.appendFileSync(LOG_FILE, line, "utf-8");
}
