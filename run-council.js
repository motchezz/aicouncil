#!/usr/bin/env node
/**
 * AICouncil run-council.js v0.1.0
 * Parallel multi-LLM fanout for the AICouncil skill.
 *
 * Usage:
 *   node run-council.js --tier R1 --question "..." --output council.json
 *
 * Reads keys from .env in current working directory.
 * Skips any seat whose key is missing.
 * Writes JSON to --output (or stdout if not provided).
 *
 * License: MIT
 * Author: Mohammad Alsharif (motchezz)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- env loading (no external deps) ----------
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

// ---------- arg parsing ----------
function parseArgs(argv) {
  const args = { tier: 'R1', question: null, output: null, verbose: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tier') args.tier = argv[++i];
    else if (a === '--question') args.question = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node run-council.js --tier R1 --question "..." --output council.json [--verbose]');
      process.exit(0);
    }
  }
  if (!args.question) {
    console.error('Error: --question is required.');
    process.exit(2);
  }
  if (!['R1', 'R2', 'R3', 'R4'].includes(args.tier)) {
    console.error('Error: --tier must be one of R1, R2, R3, R4 (R0 INNER does not use this script).');
    process.exit(2);
  }
  return args;
}

// ---------- seat catalog ----------
// Each seat: { name, envKey, tiers: [where it appears], model: { R1, R2, R3, R4 }, call: async (key, question, model) => string }
const SEATS = [
  {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    tiers: ['R1', 'R2', 'R3', 'R4'],
    model: { R1: 'llama-3.3-70b-versatile', R2: 'llama-3.3-70b-versatile', R3: 'llama-3.3-70b-versatile', R4: 'llama-3.3-70b-versatile' },
    pricing: { in: 0.59 / 1e6, out: 0.79 / 1e6 }, // groq is effectively free below quota
    call: callOpenAICompatible('https://api.groq.com/openai/v1/chat/completions'),
  },
  {
    name: 'google',
    envKey: 'GOOGLE_API_KEY',
    tiers: ['R1', 'R2', 'R3', 'R4'],
    model: { R1: 'gemini-2.5-flash', R2: 'gemini-2.5-flash', R3: 'gemini-2.5-pro', R4: 'gemini-2.5-pro' },
    pricing: { in: 0.30 / 1e6, out: 2.50 / 1e6 }, // Pro pricing; Flash is ~0.075/0.30
    call: callGemini,
  },
  {
    name: 'openai',
    envKey: 'OPENAI_API_KEY',
    tiers: ['R1', 'R2', 'R3', 'R4'],
    model: { R1: 'gpt-4o-mini', R2: 'gpt-4o', R3: 'gpt-4o', R4: 'gpt-5' },
    pricing: { in: 2.50 / 1e6, out: 10.00 / 1e6 }, // gpt-4o pricing
    call: callOpenAICompatible('https://api.openai.com/v1/chat/completions'),
  },
  {
    name: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    tiers: ['R2', 'R3', 'R4'],
    model: { R2: 'claude-sonnet-4-6', R3: 'claude-sonnet-4-6', R4: 'claude-opus-4-6' },
    pricing: { in: 3.00 / 1e6, out: 15.00 / 1e6 },
    call: callAnthropic,
  },
  {
    name: 'deepseek',
    envKey: 'DEEPSEEK_API_KEY',
    tiers: ['R2', 'R3', 'R4'],
    model: { R2: 'deepseek-chat', R3: 'deepseek-chat', R4: 'deepseek-chat' },
    pricing: { in: 0.27 / 1e6, out: 1.10 / 1e6 },
    call: callOpenAICompatible('https://api.deepseek.com/v1/chat/completions'),
  },
  {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    tiers: ['R2', 'R3', 'R4'],
    model: { R2: 'deepseek/deepseek-chat', R3: 'deepseek/deepseek-chat', R4: 'anthropic/claude-opus-4' },
    pricing: { in: 0.30 / 1e6, out: 1.00 / 1e6 }, // varies wildly
    call: callOpenAICompatible('https://openrouter.ai/api/v1/chat/completions'),
  },
  {
    name: 'perplexity',
    envKey: 'PERPLEXITY_API_KEY',
    tiers: ['R3', 'R4'],
    model: { R3: 'sonar', R4: 'sonar-pro' },
    pricing: { in: 1.00 / 1e6, out: 1.00 / 1e6 },
    call: callOpenAICompatible('https://api.perplexity.ai/chat/completions'),
  },
];

// ---------- seat prompt ----------
const SEAT_SYSTEM_PROMPT = `You are an expert council seat in a multi-LLM deliberation. Your job is to give the user a clear, opinionated answer based on your unique strengths as your model family. Do not hedge unless the question genuinely cannot be answered without more information. Do not refuse unless the question is clearly out of scope.

Format your response in exactly this shape:

VERDICT: <1-2 sentences, your direct actionable answer>

REASONING:
- <bullet 1>
- <bullet 2>
- <bullet 3>
- <bullet 4 if needed>
- <bullet 5 if needed>

CONFIDENCE: <HIGH | MEDIUM | LOW>

If you disagree with what other seats are likely to say, defend your position briefly in REASONING.`;

// ---------- LLM call adapters ----------
function callOpenAICompatible(endpoint) {
  return async function (key, question, model) {
    const body = {
      model,
      messages: [
        { role: 'system', content: SEAT_SYSTEM_PROMPT },
        { role: 'user', content: question },
      ],
      max_tokens: 800,
      temperature: 0.7,
    };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...(endpoint.includes('openrouter') ? { 'HTTP-Referer': 'https://aicouncil.me', 'X-Title': 'AICouncil' } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '';
    const usage = {
      in: json.usage?.prompt_tokens || 0,
      out: json.usage?.completion_tokens || 0,
    };
    return { content, usage };
  };
}

async function callAnthropic(key, question, model) {
  const body = {
    model,
    max_tokens: 800,
    system: SEAT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const content = (json.content || []).map((b) => b.text || '').join('');
  const usage = {
    in: json.usage?.input_tokens || 0,
    out: json.usage?.output_tokens || 0,
  };
  return { content, usage };
}

async function callGemini(key, question, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  // Gemini 2.5 spends "thinking" tokens against maxOutputTokens.
  // We disable thinking (budget=0) for council seats so the full budget
  // goes to visible answer. Otherwise Flash burns ~700 tokens internally
  // and the answer gets truncated mid-sentence.
  const body = {
    systemInstruction: { parts: [{ text: SEAT_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: question }] }],
    generationConfig: {
      maxOutputTokens: 1500,
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const content = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  const usage = {
    in: json.usageMetadata?.promptTokenCount || 0,
    out: json.usageMetadata?.candidatesTokenCount || 0,
  };
  return { content, usage };
}

// ---------- timeout + retry wrapper ----------
async function callWithRetry(seat, question, tier, args) {
  const model = seat.model[tier];
  const key = process.env[seat.envKey];
  const start = Date.now();
  const baseResult = {
    name: seat.name,
    model,
    status: 'pending',
    output: null,
    error: null,
    latencyMs: 0,
    costEstUSD: 0,
    usage: { in: 0, out: 0 },
  };

  if (!key) {
    return { ...baseResult, status: 'skipped', error: `Missing ${seat.envKey} in .env` };
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await withTimeout(seat.call(key, question, model), 35000);
      const latencyMs = Date.now() - start;
      const costEstUSD = (result.usage.in * seat.pricing.in) + (result.usage.out * seat.pricing.out);
      return {
        ...baseResult,
        status: 'complete',
        output: result.content,
        latencyMs,
        costEstUSD: Number(costEstUSD.toFixed(6)),
        usage: result.usage,
      };
    } catch (e) {
      if (attempt === 0 && e.status === 429) {
        if (args.verbose) console.error(`[${seat.name}] 429, retrying once after 2s...`);
        await sleep(2000);
        continue;
      }
      const latencyMs = Date.now() - start;
      return {
        ...baseResult,
        status: 'failed',
        error: String(e.message || e),
        latencyMs,
      };
    }
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv);
  const activeSeats = SEATS.filter((s) => s.tiers.includes(args.tier));

  if (args.verbose) {
    console.error(`[council] tier=${args.tier} seats=${activeSeats.map(s => s.name).join(',')}`);
  }

  const startAll = Date.now();
  const results = await Promise.all(activeSeats.map((s) => callWithRetry(s, args.question, args.tier, args)));
  const totalMs = Date.now() - startAll;

  const summary = {
    tier: args.tier,
    question: args.question,
    timestamp: new Date().toISOString(),
    totalMs,
    seats: results,
    stats: {
      total: results.length,
      complete: results.filter((r) => r.status === 'complete').length,
      failed: results.filter((r) => r.status === 'failed').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      totalCostUSD: Number(results.reduce((sum, r) => sum + (r.costEstUSD || 0), 0).toFixed(6)),
    },
  };

  // Cost cap check
  const cap = parseFloat(process.env.AICOUNCIL_COST_CAP_USD || '');
  if (!isNaN(cap) && summary.stats.totalCostUSD > cap) {
    console.error(`[warn] Cost cap exceeded: $${summary.stats.totalCostUSD} > $${cap}`);
  }

  const json = JSON.stringify(summary, null, 2);
  if (args.output) {
    fs.writeFileSync(args.output, json);
    if (args.verbose) console.error(`[council] wrote ${args.output}`);
  } else {
    process.stdout.write(json + '\n');
  }

  // 1-line stderr summary always
  console.error(`${args.tier}: ${summary.stats.complete} complete, ${summary.stats.failed} failed, ${summary.stats.skipped} skipped. Cost: $${summary.stats.totalCostUSD}. Time: ${(totalMs / 1000).toFixed(1)}s.`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
