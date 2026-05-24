import { query } from "@anthropic-ai/claude-agent-sdk";
import path from "path";
import dotenv from "dotenv";
import { MessageQueue, QueueMessage } from "./message-queue.js";
import { fileLog } from "./logger.js";

dotenv.config({ override: true });

export interface SDKMessage {
  type: string;
  subtype?: string;
  session_id?: string;
  message?: { role: string; content: any };
  result?: string;
  total_cost_usd?: number;
  duration_ms?: number;
}

export class AgentSession {
  private queue: MessageQueue;
  private outputIterator: AsyncIterator<SDKMessage> | null = null;
  public sdkSessionId: string | null = null;
  private started = false;

  constructor() {
    this.queue = new MessageQueue();
  }

  private ensureStarted() {
    if (this.started) return;
    this.started = true;

    fileLog("Agent", "Starting SDK | MODEL:", process.env.MODEL || "sonnet", "| BASE_URL:", process.env.ANTHROPIC_BASE_URL || "(default)");

    try {
      const stream = query({
        prompt: this.queue as any,
        options: {
          cwd: path.resolve(process.cwd()),
          settingSources: ["project"],
          allowedTools: [
            "Skill", "Task", "TodoWrite",
            "WebSearch",
            "Bash",
            "Read", "Write", "Glob", "Grep",
            "mcp__web_reader__webReader",
            "mcp__playwright__browser_navigate",
            "mcp__playwright__browser_snapshot",
            "mcp__playwright__browser_take_screenshot",
            "mcp__playwright__browser_click",
            "mcp__playwright__browser_evaluate",
            "mcp__playwright__browser_close",
          ],
          systemPrompt: `你是 AmazonSkillsChat，一个专业的 AI 亚马逊卖家助手。

你拥有 54 个核心技能（8 个生产就绪 + 25+ Beta），覆盖亚马逊卖家全链路：

🎯 一站式调研：amazon-one-shot / category-research / store-research
🔍 关键词：keyword-research / trending-products / niche-finder
📝 Listing：listing-optimization / a-plus-content / backend-keywords
💰 费用：fba-calculator / tariff-calculator / profit-analyzer
📢 广告：ppc-campaign / advertising-strategy / negative-keywords
📊 分析：sales-estimator / rank-tracker / review-analyzer
🚀 扩展：global-selling / fba-prep

工作流程：
1. 用户描述需求（ASIN/URL/关键词/产品信息）
2. 根据需求选择合适的技能执行
3. 技能通过 Playwright/Bash/Python 完成数据采集和分析
4. 报告输出到 reports/ 目录

文件输出规则：
- amazon-one-shot → reports/{YYYY-MM-DD}_{ASIN}/
- category-research → reports/{category-slug}/
- store-research → reports/{store-slug}/
- 其他技能 → reports/{产品或关键词}/

重要约束：
- amazon-one-shot / category-research / store-research 需要 Playwright 浏览器自动化
- keyword-research 通过 Bash 脚本调用 Amazon autocomplete
- fba-calculator / tariff-calculator 通过 Python 脚本计算
- 支持 12 个亚马逊市场（US/UK/DE/FR/IT/ES/JP/CA/AU/IN/MX/BR）
- 所有报告使用中文（简体）输出

用中文回复用户。`,
          model: process.env.MODEL || "sonnet",
          permissionMode: "bypassPermissions",
          maxTurns: 80,
          stderr: (data: string) => {
            fileLog("SDK.stderr", data.replace(/\n$/, ""));
          },
          env: {
            ...process.env,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN,
            ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
            PLAYWRIGHT_BROWSERS_PATH: "0",
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
          },
        },
      });

      this.outputIterator = stream[Symbol.asyncIterator]();
    } catch (e) {
      fileLog("Agent", "FAILED to start:", e);
      this.started = false;
    }
  }

  sendMessage(content: string) {
    fileLog("UserMsg", content);
    this.ensureStarted();
    this.queue.push(content);
  }

  async *getOutputStream(): AsyncGenerator<SDKMessage> {
    while (!this.outputIterator) {
      await new Promise((r) => setTimeout(r, 50));
    }

    while (true) {
      try {
        const { value, done } = await this.outputIterator.next();
        if (done) break;
        if (value?.type === "system" && value?.subtype === "init") {
          this.sdkSessionId = value.session_id ?? null;
          fileLog("Agent", "Session init:", this.sdkSessionId);
        } else {
          this.logSDKMessage(value);
        }
        yield value;
      } catch (e) {
        fileLog("Agent", "Stream error:", e);
        break;
      }
    }
  }

  private logSDKMessage(msg: SDKMessage) {
    if (msg.type === "assistant" && msg.message) {
      for (const block of msg.message.content) {
        if (block.type === "text" && block.text) fileLog("AI", block.text.substring(0, 200));
        if (block.type === "tool_use") fileLog("ToolCall", block.name, JSON.stringify(block.input));
      }
    }
    if (msg.type === "result") {
      fileLog("Result", msg.subtype || "", "cost:", msg.total_cost_usd, "duration:", msg.duration_ms + "ms");
    }
  }

  close() {
    this.queue.close();
  }
}
