
import { fileLog } from "./logger.js";
console.log("Test 1 - imported fileLog");
fileLog("Test", "Test log entry");
console.log("Test 2 - logged to server.log");

import express from "express";
console.log("Test 3 - imported express");

const app = express();
console.log("Test 4 - created express app");

const PORT = 3015;
app.listen(PORT, () => {
  console.log(`Test 5 - Server listening on :${PORT}`);
  fileLog("Test Server", `Listening on :${PORT}`);
});
