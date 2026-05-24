
console.log("Test 1 - starting");
import { fileLog } from "./logger.js";
console.log("Test 2 - imported logger");
import { AgentSession } from "./agent-client.js";
console.log("Test 3 - imported AgentSession");

const agent = new AgentSession();
console.log("Test 4 - created AgentSession");
fileLog("Test Agent", "Agent created successfully");
console.log("Test 5 - logged to server.log");
