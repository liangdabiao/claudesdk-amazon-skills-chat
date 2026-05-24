
console.log("Starting test...");

import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("__dirname:", __dirname);
console.log("cwd:", process.cwd());

console.log("Loading dotenv...");
import dotenv from "dotenv";
dotenv.config({ override: true });

console.log("ENV loaded:");
console.log("PORT:", process.env.PORT);
console.log("MODEL:", process.env.MODEL);
console.log("HAS_KEY:", !!process.env.ANTHROPIC_API_KEY);

console.log("Testing fileLog...");
import fs from "fs";
const LOG_FILE = path.resolve(process.cwd(), "test.log");
fs.writeFileSync(LOG_FILE, `[${new Date().toISOString()}] Test started\n`, "utf-8");

console.log("All imports okay!");
console.log("Test completed!");
