#!/usr/bin/env node
/**
 * 并发处理 AI 任务 - 用于不支持 Batch API 的 API 代理
 *
 * 这个脚本并发调用 API，而不是使用 OpenAI Batch API。
 * 适用于 new-api/one-api 类型的 API 中转站。
 *
 * 特性：
 *   - 可配置并发数，提高处理效率
 *   - 结果按原始顺序输出，确保报告生成正确
 *   - 两层重试机制：单请求重试 + 批量失败重试
 *
 * Env:
 *   OPENAI_BASE_URL       default: https://api.openai.com
 *   OPENAI_API_KEY        required
 *   OPENAI_MODEL          default: gpt-4o-mini
 *   AI_JSONL_PATH         default: ai/batch_all.jsonl
 *   AI_CONCURRENCY        default: 5 (并发数)
 *   AI_DELAY_BETWEEN_MS   default: 200 (请求间隔毫秒)
 *   AI_RETRY_ROUNDS       default: 2 (失败任务重试轮数)
 *
 * Usage:
 *   node src/ai/process-events-sync.js
 *   AI_CONCURRENCY=10 node src/ai/process-events-sync.js
 *
 * Output:
 *   ai/batch_output.jsonl  (same format as OpenAI Batch output)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const dns = require("dns");

require("./load-env").loadEnv();

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder(process.env.OPENAI_DNS_ORDER || "ipv4first");
}

function baseUrl() {
  return String(
    process.env.OPENAI_BASE_URL || "https://api.openai.com"
  ).replace(/\/+$/, "");
}

function apiKey() {
  return String(process.env.OPENAI_API_KEY || "");
}

function model() {
  return String(process.env.OPENAI_MODEL || "gpt-4o-mini");
}

function ipFamily() {
  const raw = String(process.env.OPENAI_IP_FAMILY || "").trim();
  const n = Number(raw);
  return Number.isFinite(n) && (n === 4 || n === 6) ? n : undefined;
}

function timeoutMs() {
  const raw = Number(process.env.OPENAI_HTTP_TIMEOUT_MS || 120000);
  return Number.isFinite(raw) && raw > 0 ? raw : 120000;
}

function jsonlPath() {
  return path.resolve(
    process.cwd(),
    process.env.AI_JSONL_PATH || "ai/batch_all.jsonl"
  );
}

function outputPath() {
  const dir = path.resolve(process.cwd(), process.env.AI_OUT_DIR || "ai");
  return path.join(dir, "batch_output.jsonl");
}

function concurrency() {
  const raw = Number(process.env.AI_CONCURRENCY || 5);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
}

function delayBetweenMs() {
  const raw = Number(process.env.AI_DELAY_BETWEEN_MS || 200);
  return Number.isFinite(raw) && raw >= 0 ? raw : 200;
}

function retryRounds() {
  const raw = Number(process.env.AI_RETRY_ROUNDS || 2);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 2;
}

function httpRequest({ method, url, headers, body }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        method,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        headers,
        family: ipFamily(),
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: buf,
          });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(timeoutMs(), () => {
      const err = new Error(`Request timeout after ${timeoutMs()}ms`);
      err.code = "ETIMEDOUT";
      req.destroy(err);
    });
    if (body) req.write(body);
    req.end();
  });
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callChatCompletionsWithRetry(requestBody, maxRetries = 3) {
  const url = `${baseUrl()}/v1/chat/completions`;
  const body = Buffer.from(JSON.stringify(requestBody), "utf-8");

  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await httpRequest({
        method: "POST",
        url,
        headers: {
          Authorization: `Bearer ${apiKey()}`,
          "Content-Type": "application/json",
          "Content-Length": String(body.length),
        },
        body,
      });

      const text = res.body.toString("utf-8");
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      
      // 如果是临时性错误（429 rate limit, 500+ 服务器错误），重试
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 指数退避
          console.log(`     ⏳ Retry ${attempt}/${maxRetries} in ${waitTime/1000}s...`);
          await delay(waitTime);
          continue;
        }
      }
      
      return { status: res.status, json };
    } catch (err) {
      lastError = err;
      // 网络错误，重试
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`     ⏳ Network error, retry ${attempt}/${maxRetries} in ${waitTime/1000}s...`);
        await delay(waitTime);
        continue;
      }
    }
  }
  
  throw lastError || new Error("Unknown error after retries");
}

/**
 * 将 Responses API 格式的请求转换为 Chat Completions 格式
 */
function convertToCompletionsFormat(batchRequest) {
  const body = batchRequest.body;
  
  // 如果请求体中有 input 字段（Responses API 格式），转换为 messages
  const messages = body.input || body.messages;
  
  // 构建 Chat Completions 请求
  const completionsBody = {
    model: body.model || model(),
    messages: messages,
    max_tokens: body.max_output_tokens || body.max_tokens || 700,
  };
  
  // 如果有 JSON schema 输出格式要求，转换为 response_format
  if (body.text && body.text.format && body.text.format.type === "json_schema") {
    completionsBody.response_format = {
      type: "json_object",
    };
  }
  
  return completionsBody;
}

/**
 * 将 Chat Completions 响应转换为 Batch API 输出格式
 */
function convertToBatchOutputFormat(customId, response, statusCode) {
  if (statusCode >= 200 && statusCode < 300 && response.choices) {
    return {
      id: `response_${Date.now()}_${customId}`,
      custom_id: customId,
      response: {
        status_code: statusCode,
        body: response,
      },
      error: null,
    };
  } else {
    return {
      id: `response_${Date.now()}_${customId}`,
      custom_id: customId,
      response: null,
      error: {
        code: response.error?.code || "api_error",
        message: response.error?.message || JSON.stringify(response),
      },
    };
  }
}

/**
 * 并发控制器 - 限制同时执行的 Promise 数量，确保结果按索引顺序
 */
class ConcurrencyPool {
  constructor(maxConcurrency, delayMs = 200) {
    this.maxConcurrency = maxConcurrency;
    this.delayMs = delayMs;
    this.running = 0;
    this.queue = [];
    this.lastRequestTime = 0;
  }

  /**
   * 添加任务到池中，返回 Promise
   * @param {Function} task - 返回 Promise 的函数
   * @param {number} index - 任务的原始索引（用于保持顺序）
   */
  async add(task, index) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, index, resolve, reject });
      this._tryRun();
    });
  }

  async _tryRun() {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const { task, index, resolve, reject } = this.queue.shift();
      this.running++;

      // 确保请求间隔
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.delayMs) {
        await delay(this.delayMs - elapsed);
      }
      this.lastRequestTime = Date.now();

      // 执行任务并携带索引信息
      task()
        .then((result) => resolve({ index, result }))
        .catch((err) => reject({ index, error: err }))
        .finally(() => {
          this.running--;
          this._tryRun();
        });
    }
  }
}

/**
 * 处理单个请求
 */
async function processRequest(req, index, total) {
  const customId = req.custom_id;
  const startTime = Date.now();

  try {
    const completionsBody = convertToCompletionsFormat(req);
    const { status, json } = await callChatCompletionsWithRetry(completionsBody);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (status >= 200 && status < 300) {
      // 提取生成的内容预览
      let preview = "";
      if (json.choices && json.choices[0] && json.choices[0].message) {
        const content = json.choices[0].message.content || "";
        preview = content.substring(0, 50).replace(/\n/g, " ");
      }
      console.log(`  ✅ [${index + 1}/${total}] ${customId} (${elapsed}s) ${preview}...`);
      return { success: true, result: convertToBatchOutputFormat(customId, json, status) };
    } else {
      console.log(`  ❌ [${index + 1}/${total}] ${customId} (${elapsed}s) HTTP ${status}`);
      return { success: false, result: convertToBatchOutputFormat(customId, json, status) };
    }
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  ❌ [${index + 1}/${total}] ${customId} (${elapsed}s) ${err.message}`);
    return {
      success: false,
      result: convertToBatchOutputFormat(customId, { error: { message: err.message } }, 500),
    };
  }
}

async function main() {
  if (!apiKey()) {
    console.error("❌ Missing OPENAI_API_KEY");
    process.exit(1);
  }

  const input = jsonlPath();
  if (!fs.existsSync(input)) {
    console.error(`❌ Missing JSONL input: ${input}`);
    console.error(
      "   Generate it first: OPENAI_MODEL=gpt-4o-mini node src/ai/generate-batch.js"
    );
    process.exit(1);
  }

  console.log(`📂 Reading: ${input}`);
  const lines = fs
    .readFileSync(input, "utf-8")
    .split("\n")
    .filter((line) => line.trim());

  const requests = lines.map((line) => JSON.parse(line));
  const delayMs = delayBetweenMs();

  const maxConcurrent = concurrency();
  const maxRetryRounds = retryRounds();

  console.log(`📊 Found ${requests.length} requests to process`);
  console.log(`🤖 Using model: ${model()}`);
  console.log(`🌐 API endpoint: ${baseUrl()}/v1/chat/completions`);
  console.log(`⚡ Concurrency: ${maxConcurrent} (delay: ${delayMs}ms, retry rounds: ${maxRetryRounds})`);
  console.log("");

  const startTime = Date.now();
  
  // 使用数组按索引存储结果，确保顺序正确
  const taskResults = new Array(requests.length).fill(null);
  
  // 第一轮：并发处理所有请求
  console.log("📡 Processing requests...");
  const pool = new ConcurrencyPool(maxConcurrent, delayMs);
  
  const promises = requests.map((req, index) =>
    pool.add(() => processRequest(req, index, requests.length), index)
  );
  
  // 等待所有任务完成，收集结果
  const settledResults = await Promise.allSettled(promises);
  
  // 将结果按索引放入正确位置
  settledResults.forEach((settled) => {
    if (settled.status === "fulfilled") {
      const { index, result } = settled.value;
      taskResults[index] = result;
    } else {
      // Promise 被 reject（不应该发生，因为 processRequest 内部捕获了错误）
      const { index, error } = settled.reason || {};
      if (index !== undefined) {
        taskResults[index] = {
          success: false,
          result: convertToBatchOutputFormat(
            requests[index].custom_id,
            { error: { message: error?.message || "Unknown error" } },
            500
          ),
        };
      }
    }
  });
  
  // 第二轮及之后：重试失败的任务
  for (let round = 1; round <= maxRetryRounds; round++) {
    const failedIndices = taskResults
      .map((r, i) => (!r || !r.success ? i : -1))
      .filter((i) => i >= 0);
    
    if (failedIndices.length === 0) {
      console.log(`\n✨ All requests succeeded!`);
      break;
    }
    
    console.log(`\n🔄 Retry round ${round}/${maxRetryRounds}: ${failedIndices.length} failed requests`);
    
    // 重试前等待一段时间（指数退避）
    const waitTime = Math.pow(2, round) * 1000;
    console.log(`   Waiting ${waitTime / 1000}s before retry...`);
    await delay(waitTime);
    
    const retryPool = new ConcurrencyPool(maxConcurrent, delayMs);
    const retryPromises = failedIndices.map((index) =>
      retryPool.add(() => processRequest(requests[index], index, requests.length), index)
    );
    
    const retryResults = await Promise.allSettled(retryPromises);
    
    retryResults.forEach((settled) => {
      if (settled.status === "fulfilled") {
        const { index, result } = settled.value;
        taskResults[index] = result;
      }
    });
  }

  // 按原始顺序提取结果
  const finalResults = taskResults.map((r) => r.result);

  // 写入输出文件
  const output = outputPath();
  const outputContent = finalResults.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(output, outputContent, "utf-8");

  const successCount = taskResults.filter((r) => r.success).length;
  const failCount = taskResults.filter((r) => !r.success).length;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("");
  console.log("=".repeat(50));
  console.log(`✅ Completed: ${successCount} success, ${failCount} failed`);
  console.log(`⏱️  Total time: ${elapsed}s (avg: ${(elapsed / requests.length).toFixed(2)}s/req)`);
  console.log(`📄 Output saved to: ${output}`);
  console.log("");
  console.log("Next step:");
  console.log("  node src/ai/download-batch-output.js --local");
}

main().catch((err) => {
  console.error(
    "❌ process-events-sync.js crashed:",
    err && err.message ? err.message : err
  );
  process.exit(1);
});
