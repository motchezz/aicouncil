# AICouncil — a Claude skill for multi-LLM deliberation

> Run a council of 3-7 LLMs (Claude, GPT, Gemini, Groq Llama, DeepSeek, Perplexity) on any high-stakes question. Get a synthesized verdict with confidence + dissent. Your keys, your machine, zero subscription.

---

## What it is

**Two Claude skills + a small Node helper script.** When you have a real decision in front of you and one model isn't enough, you tell Claude "fire a council on this" and it runs a structured deliberation. The bundle ships:

1. **`SKILL.md` — the SUPREME council** (this top-level skill). Multi-vendor R1-R4 with the §72 escalation ladder. Calls Groq / Gemini / OpenAI / Anthropic / DeepSeek / OpenRouter / Perplexity in parallel via your keys.
2. **`inner-council/SKILL.md` — the Council of Five** (the INNER R0 tier). 5 Haiku personas (Contrarian, First Principles, Expansionist, Outsider, Executor) → anonymous peer review → Sonnet chairman synthesis. Claude-only, ~$0.02/run, ~20s, NEVER Opus. Defeats the AI yes-man bias.

The SUPREME council *uses* the INNER council as its R0 default tier. You can also invoke the Council of Five directly via `/council` or "convene the council" when you don't need multi-vendor diversity, just five sharp perspectives from Claude alone.

The §72 escalation ladder starts cheap, escalates only when the seats disagree or hedge, caps cost at the level you set. Most questions stop at R0 (~$0.02) or R1 (~$0.05). Only ~5% of runs ever hit R3+.

This is the open-source version of the [aicouncil.me](https://aicouncil.me) deliberation engine, distilled to skill files you drop into your Claude environment.

---

## Install (60 seconds)

### Option A — Claude Code

```bash
cd /your/project
mkdir -p .claude/skills/aicouncil .claude/skills/council-of-five

# Copy the SUPREME council bundle (top-level files)
cp SKILL.md run-council.js .env.example .claude/skills/aicouncil/
cp .claude/skills/aicouncil/.env.example .claude/skills/aicouncil/.env
# Open .env and paste your keys for the seats you want

# Copy the INNER council (Council of Five)
cp inner-council/SKILL.md .claude/skills/council-of-five/
```

That's it. Next time you talk to Claude Code in that project, it auto-discovers BOTH skills. Trigger the SUPREME council with "fire a council on X"; trigger the INNER Council of Five with "/council" or "convene the council."

### Option B — Cowork

```bash
mkdir -p ~/Cowork/skills/aicouncil   # path may differ on your OS
# Copy the bundle files into that directory
cp ~/Cowork/skills/aicouncil/.env.example ~/Cowork/skills/aicouncil/.env
# Fill in keys
```

Cowork picks up the skill on next session start.

### Option C — claude.ai web (degraded)

1. Open a Project in claude.ai
2. Paste the contents of `SKILL.md` into Custom Instructions
3. When you want to fire a council, paste your API keys into the chat (less secure — the chat logs them)

Note: claude.ai web can't run `run-council.js` (no code execution). It can still run R0 INNER (Claude-only) deliberations using the 5-persona pattern, and it can guide you through manually pasting each seat's response if you want to do R1+ by hand. For real multi-vendor councils, use Claude Code or Cowork.

---

## First run

In Claude:

> Fire a council on: should I rewrite our React frontend in Svelte, or stick with React and adopt server components?

Claude will:
1. Restate the question as a clear decision
2. Detect the stake signal (medium — codebase migration, not legal/financial)
3. Announce the plan: "Starting at R0 INNER. Will escalate if hedging."
4. Run 5 Haiku personas in parallel + chairman synthesis
5. If hedging, escalate to R1: shells out `node run-council.js --tier R1 --question "..." --output /tmp/council-R1.json`
6. Read the JSON, look for disagreement
7. Synthesize + deliver verdict to you

---

## How the §72 ladder works

| Tier | Seats | Cost | When |
|---|---|---|---|
| **R0 INNER** | 5 Haiku personas + Sonnet chairman | ~$0.02 | Default first pass. Claude only. |
| **R1 FREE** | Groq Llama-3-70B, Gemini Flash, GPT-4o-mini | ~$0.05 | INNER hedged. Vendor diversity at near-zero cost. |
| **R2 CONTRAST** | + Claude Sonnet, GPT-4o, DeepSeek | ~$0.50 | R1 disagreed. Strong models in conflict. |
| **R3 MAX SIGNAL** | + Gemini 2.5 Pro, Perplexity (web-grounded) | ~$2 | Explicit high stakes OR R2 still hedging. |
| **R4 PREMIUM** | + GPT-5, Claude Opus 4.6 | ~$8-15 | Cost-of-being-wrong >> $15. Legal, public commits, big spend. |

You can override the starting tier:

> Fire R3 on this — I'm about to sign a 12-month lease

> R2 council: pick a name for the new product

> Just give me R0 — it's not a big deal, I want a sanity check

---

## Keys — how it works

- All keys live in `.env` next to `run-council.js`. The script reads them with no dependencies (no `dotenv` package needed).
- A missing key = that seat is skipped. The council adapts to whatever you have.
- The minimum viable setup is **3 keys** for full R0+R1 coverage: `GROQ_API_KEY` (free), `GOOGLE_API_KEY` (free quota), `ANTHROPIC_API_KEY` ($5 credit on signup).
- Keys never leave your machine except to the API endpoint that owns them.
- `.env` is in `.gitignore` from day one.

Where to get keys (all free or have free credit):

| Provider | URL | Free? |
|---|---|---|
| Anthropic | https://console.anthropic.com | $5 credit |
| Google AI | https://aistudio.google.com | Yes (Flash) |
| Groq | https://console.groq.com | Yes (all open models) |
| OpenAI | https://platform.openai.com | $5 credit |
| DeepSeek | https://platform.deepseek.com | Cheap |
| OpenRouter | https://openrouter.ai/keys | $1 credit |
| Perplexity | https://perplexity.ai/settings/api | $5/mo |

---

## Cost transparency

Every council run ends with a 1-line summary on stderr:

```
R2: 5 complete, 1 failed, 0 skipped. Cost: $0.34. Time: 8.7s.
```

If you set `AICOUNCIL_COST_CAP_USD=2.00` in `.env`, the script warns when a run would exceed that. Claude will ask before escalating to a tier that would breach.

---

## Optional: persist runs

Set `AICOUNCIL_LOG_DIR=/path/to/logs` in `.env` and every run is saved as JSON to `${dir}/runs/<timestamp>-<slug>.json`. Useful for:
- Building your own analytics ("which seats agree most often?")
- Replaying past deliberations
- Feeding into a personal "council memory" later

Leave it blank for ephemeral runs (no disk writes beyond the temp `--output` file Claude reads then deletes).

---

## What this is NOT

- **Not a chatbot.** It's a deliberation primitive. You invoke it on specific questions, not for casual chat.
- **Not a model router.** Pick-best-model-for-task is a different problem. This skill assumes you want *multiple* views, not one.
- **Not a hosted service.** No accounts, no subscriptions, no rate limits except what your own keys impose.
- **Not free LLM access.** You pay for what you use directly to the vendors. The skill itself is MIT.

---

## License

MIT — see [LICENSE](LICENSE).

You can fork, modify, redistribute, embed in commercial products, charge for setup services. The only request: if you build something interesting with it, drop a note at hello@aicouncil.me — I'd love to feature it.

---

## Updates + community

- Site: https://aicouncil.me
- Repo: https://github.com/motchezz/aicouncil
- Newsletter: monthly digest of interesting council deliberations + ladder optimizations. Sign up at aicouncil.me.

---

## Credits

Built by [Mohammad Alsharif](https://github.com/motchezz) (313 AI Agency).

Distilled from the production SaaS at aicouncil.me, which served real deliberations through 2026-05. The hosted product is shelved; this skill is the open-source spiritual successor.

Inspired by the wisdom-of-crowds tradition, dissent-aware decision-making research, and the practical observation that no single LLM is calibrated for every domain.
