---
name: aicouncil
description: Run a multi-LLM council deliberation on any high-stakes question. Use when the user asks for a "council fire", "council deliberation", "council vote", "council ladder", "second opinions across models", "GPT vs Claude vs Gemini on this", "stress-test this decision across LLMs", or any phrasing that implies they want more than one model's view on a non-trivial question. Triggers an §72 escalation ladder (R0 INNER -> R1 free seats -> R2 contrast -> R3 max signal -> R4 premium) and synthesizes a chairman verdict. Designed to fail-soft: missing keys skip those seats, the council adapts to what's available.
license: MIT
author: Mohammad Alsharif (motchezz)
homepage: https://aicouncil.me
version: 0.1.0
---

# AICouncil - Multi-LLM council deliberation

## What this skill does

When invoked, this skill runs a structured deliberation across 3-7 LLM seats on the user's question, escalates intelligently based on disagreement / hedging / stakes, and returns a synthesized verdict from a Sonnet chairman. The user brings their own API keys; nothing leaves their machine except the calls to the LLM providers they've authorized.

The product of this skill is better decisions on high-stakes questions - not faster autocomplete, not cheaper inference. It's for the 5% of questions where you'd otherwise sit with the question for an hour, ask a friend, or commit to a direction without checking.

## When to use vs. when not to

Use when:
- Stakes are real (money, reputation, irreversible decision, public commitment)
- A single model's hedge or confidence isn't enough - you want adversarial views
- The question crosses domains (legal + tech, design + business, code + ops) where one model is unlikely to be strong everywhere
- You're choosing between two non-obvious paths and one is much harder to undo

Don't use for:
- Quick factual lookups (one model is fine)
- Routine coding tasks
- Creative brainstorming where one model's output is the deliverable
- Tasks where speed > quality

Default mode: if the user fires a council on something low-stakes, drop down to R0 INNER (Claude alone, 5 personas in parallel) rather than spending real money on R1+.

## The §72 escalation ladder

Every council run STARTS at the cheapest viable tier and escalates only on signal. Never start at R3/R4 unless the user explicitly says "huge stakes" / "max signal" / "premium council" / "fire R4".

| Tier | Cost (est) | When to use | Seats |
|---|---|---|---|
| R0 INNER | ~$0.02 | Default for non-trivial questions. No external API keys needed beyond Anthropic. | 5 Haiku personas (Contrarian, First Principles, Expansionist, Outsider, Executor) + 1 Sonnet chairman |
| R1 FREE | ~$0.05 | When INNER hedges or user wants vendor diversity at zero/near-zero cost | Groq Llama-3-70B (free), Gemini 2.5 Flash (free quota), OpenAI gpt-4o-mini (~$0.001) |
| R2 CONTRAST | ~$0.50 | When R1 seats disagree or the question has known-difficult tradeoffs | Adds: Claude Sonnet 4.6, GPT-4o, DeepSeek V3 |
| R3 MAX SIGNAL | ~$2 | When stakes are explicitly high or R2 still hedges | Adds: Gemini 2.5 Pro, Perplexity Sonar (web search seat) |
| R4 PREMIUM | ~$8-15 | When the cost of being wrong is >>$15 (legal, public commit, big spend) | Adds: GPT-5, Claude Opus 4.6, multi-round critique |

Escalation triggers (check after each tier returns):
1. Disagreement - more than one seat reaches the opposite conclusion -> escalate
2. Hedging - 3+ seats wrap their answer in "depends" / "could go either way" / "without more context" -> escalate
3. Stakes signal - user used words like "irreversible", "production", "to my whole list", "to the client", "before I sign" -> escalate one tier above default
4. Repeat seat failures - 2+ seats errored or timed out -> escalate to a tier with different vendors

Stop conditions:
- ALL seats in current tier converge on the same answer -> stop, synthesize
- User says "stop" / "enough" / "that's plenty"
- Reached R4 (no higher tier exists)

## The 7 seats - what each is for

Each seat is a different LLM family. They're not interchangeable - diversity is the point.

| Seat | Vendor | Default model | Strength | Cost tier |
|---|---|---|---|---|
| anthropic | Anthropic | claude-sonnet-4-6 | Calibrated reasoning, refuses to overconfidence | R2+ |
| openai | OpenAI | gpt-4o-mini (R1) / gpt-4o (R2) / gpt-5 (R4) | Strong on code + structured tasks | R1+ |
| google | Google AI | gemini-2.5-flash (R1) / gemini-2.5-pro (R3) | Long context, multimodal, web grounding | R1+ |
| groq | Groq | llama-3.3-70b-versatile | Free + fast (300 tokens/sec). Quirky on subjective | R1+ |
| openrouter | OpenRouter | varies (DeepSeek-V3 default) | Cheap fallback when other vendors rate-limit | R2+ |
| deepseek | DeepSeek | deepseek-chat | Cheap, strong math/code, Chinese training data flavor | R2+ |
| perplexity | Perplexity | sonar | Web-grounded answers with citations | R3+ |

Synthesis chairman is ALWAYS Claude Sonnet (the latest available: claude-sonnet-4-6). NEVER Opus - Opus is reserved for R4 as a council seat, not as chairman. If Sonnet isn't available, fall back to Haiku for synthesis.

## Workflow - how Claude runs a council

### Step 1 - Receive the question + assess starting tier

When the user invokes the skill (says "fire a council on X", "run aicouncil on Y", or any phrasing that matches the description triggers):

1. Confirm the question in 1 line. If the question is ambiguous or 2+ sentences long, restate it as a single decision question. Example: user says "should I migrate to Postgres or stick with MySQL for the new analytics service" -> restate as "Decision: Postgres vs MySQL for the new analytics service (high-write, ~2TB/year growth)."
2. Detect stake signal from the user's wording. Look for: "irreversible", "production", "huge stakes", "before I commit", "this affects [N customers/employees/dollars]", "I can't undo", "max signal". If present -> start at R3. If absent -> default to R0 INNER for first pass.
3. Detect explicit tier override: "fire R2", "skip to R3", "premium council on this" -> honor it.
4. Announce the plan in 1 line: "Starting at R0 INNER (5 Haiku personas, ~$0.02). Will escalate if hedging or disagreement appears."

### Step 2 - R0 INNER (default first pass)

If R0 is the starting tier:
- This is Claude only - no external keys needed (only Anthropic via the Claude session itself).
- Use the bundled `inner-council/SKILL.md` (Council of Five) — 5 Haiku personas in parallel (Contrarian, First Principles, Expansionist, Outsider, Executor) → anonymous peer review → Sonnet chairman synthesis. ~11 calls, ~$0.02, ~20s.
- The full protocol + prompt templates live in `inner-council/SKILL.md`. NEVER use Opus.

If the chairman's verdict has HIGH confidence + no contradictions -> deliver to user, stop.
If the chairman flags hedging or disagreement -> escalate to R1.

### Step 3 - R1+ (external seats)

For R1 and above, Claude uses the `run-council.js` helper script:

```bash
node run-council.js --tier R1 --question "Decision: Postgres vs MySQL for the new analytics service (high-write, ~2TB/year growth)" --output council-R1.json
```

The script:
1. Reads `.env` from the current directory (looks for `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `PERPLEXITY_API_KEY`)
2. Skips any seat whose key is missing (logs which were skipped)
3. Calls each available seat in parallel with the question + the seat's role prompt
4. 35s timeout per seat, 1 retry on HTTP 429
5. Writes `council-R1.json` with per-seat outputs + latency + estimated cost

Claude then reads the JSON and:
- Counts how many seats returned `status: "complete"` vs `failed`
- Compares conclusions - flag disagreement if seats reach opposite answers
- Flag hedging if 3+ seats used hedge language
- Decide: synthesize (Step 5) OR escalate (back to Step 3 with next tier)

### Step 4 - Escalation

If escalating from R(n) to R(n+1):
- Keep R(n) outputs in memory (don't re-run them)
- Run only the NEW seats added at R(n+1)
- After R(n+1) returns, do another disagreement/hedging check
- Repeat until convergence OR reached R4

### Step 5 - Chairman synthesis

When done escalating:
- Concatenate all seat outputs into a single context (with seat names)
- Send to Sonnet with the synthesis prompt (below)
- Sonnet returns: verdict (1 paragraph) + key reasoning (3-5 bullets) + dissent notes (any seat that disagreed + why) + confidence (HIGH/MEDIUM/LOW)
- Deliver to user

### Step 6 - Optional: persist the run

If the user has set `AICOUNCIL_LOG_DIR=...` in `.env`, save the full run (question + all seat outputs + verdict + cost breakdown) as JSON to `${AICOUNCIL_LOG_DIR}/runs/<timestamp>-<short-question-slug>.json`. This is opt-in only - never write logs without the env var being set.

## Per-seat prompt template

When calling each external seat, use this prompt structure (the script handles this; documented here for transparency):

```
SYSTEM: You are an expert council seat in a multi-LLM deliberation. Your job is to give the user a clear, opinionated answer based on your strengths as ${SEAT_MODEL}. Do not hedge unless the question truly cannot be answered. Do not refuse unless the question is clearly out of scope. Format: 1-paragraph verdict, then up to 5 bullets of reasoning. If you disagree with what other seats might say, defend your position.

USER: ${QUESTION}
```

For R0 INNER, the 5 personas have different system prompts (Contrarian asks "what could go wrong", First Principles asks "what would we do if we were starting from scratch", etc. - see `council-of-five` skill).

## Chairman synthesis prompt

```
SYSTEM: You are the chairman of a council deliberation. The seats below have given their views on the user's question. Your job: synthesize a single verdict that the user can act on. Acknowledge dissent - if 1+ seats disagreed, surface their reasoning. If the council is split, do NOT split the difference; pick the stronger argument and explain why. End with a confidence level (HIGH/MEDIUM/LOW) and what would change your mind.

USER QUESTION: ${QUESTION}

SEAT OUTPUTS:
${each seat's name + model + output, separated by ===}

Deliver:
1. Verdict (1 paragraph - the user's actionable answer)
2. Key reasoning (3-5 bullets)
3. Dissent (if any) - which seat disagreed and why
4. Confidence: HIGH / MEDIUM / LOW
5. What would change my mind: 1 sentence
```

## Key-handling rules

- Read keys from `.env` in the current working directory. Never prompt the user to paste keys into the chat (they'd get logged to transcript history).
- Never echo keys in your responses, logs, or output files.
- If a key is missing, skip that seat and tell the user once: "Skipping ${SEAT} - no ${SEAT}_API_KEY in .env." Don't repeat the warning on subsequent runs in the same session.
- If all keys are missing, fall back to R0 INNER (Claude-only) and tell the user.
- Never send keys to a third party. Each seat's key only ever goes to that seat's own API endpoint.

## Cost transparency

After every council run, show the user a 1-line cost summary:

```
R1 council: 3 seats complete, 0 failed. Est cost: $0.04. Time: 6.2s.
```

If the user has set `AICOUNCIL_COST_CAP_USD=N` in .env, the script enforces a per-run cap. If the next tier would exceed the cap, Claude says so and asks before escalating.

## Failure modes - handle gracefully

- All seats fail -> tell user, suggest checking .env keys + connectivity. Don't synthesize a verdict from nothing.
- One seat fails -> continue with the rest. Note the failure in the verdict footer.
- Rate-limited (429) -> run-council.js auto-retries once with backoff. If still 429, mark seat failed.
- Timeout (>35s) -> mark seat failed. Common with reasoning models on long questions.
- Disagreement at R4 -> don't keep escalating (no higher tier). Synthesize with `confidence: LOW` and explicitly tell the user "the council is genuinely split - here's what each side argued."

## Output to the user

Final response format:

```
**Council verdict (${TIER}): ${ONE-LINE-VERDICT}**

**Reasoning:**
- ${bullet 1}
- ${bullet 2}
- ${bullet 3}

**Dissent:** ${if any}
- ${SEAT_NAME} (${MODEL}) argued: ${dissent summary}

**Confidence:** ${HIGH / MEDIUM / LOW}
**What would change my mind:** ${1 sentence}

---
${TIER}: ${N seats complete}, ${M failed}. Cost: $${X}. Time: ${Y}s.
```

## Getting your API keys (point users at these URLs)

| Provider | Where to get a key | Free tier? |
|---|---|---|
| Anthropic | console.anthropic.com -> API Keys | $5 free credit |
| OpenAI | platform.openai.com -> API Keys | $5 free credit on new accounts |
| Google AI | aistudio.google.com -> Get API key | Yes - generous free quota on Gemini Flash |
| Groq | console.groq.com | Yes - free for all open models |
| OpenRouter | openrouter.ai -> Keys | $1 free credit; pay-as-you-go after |
| DeepSeek | platform.deepseek.com -> API keys | Cheap (~$0.27/M input tokens) |
| Perplexity | perplexity.ai -> Settings -> API | $5/mo free tier |

The minimum viable setup: just Groq + Google + Anthropic keys covers R0-R2 for under $0.10/run.

## Updates + community

This skill is open-source. Updates ship at https://aicouncil.me.
Report bugs / share use cases / request seats at: [GitHub Issues link]

## Changelog

- 0.1.0 (2026-05-19) - initial release. 7 seats. §72 ladder. .env-based keys.
