---
name: council-of-five
description: Convenes a 5-persona council (Contrarian, First Principles Thinker, Expansionist, Outsider, Executor) to stress-test a decision through independent analysis, anonymous peer review, and Chairman synthesis. Use when the user says "/council", "convene the council", "run the council", "council of five", "stress-test this", "pressure-test this", "get me a second opinion", "is this a good idea", "should I", "what am I missing", "help me decide", or any high-stakes / irreversible / costly decision where the AI yes-man bias is a risk. Uses Haiku 4.5 for the 10 worker agents and Sonnet 4.6 for the Chairman to keep cost minimal — NEVER uses Opus.
---

# Council of Five

A structured deliberation skill that forces five independent perspectives on any decision, peer-reviews them anonymously, then synthesizes a final recommendation. Built to defeat the AI "yes-man" bias.

## When to invoke

**Explicit triggers** — run immediately, no confirmation
- `/council`, "convene the council", "run the council", "council of five"
- "stress-test this" / "pressure-test this"
- "get me a second opinion"
- "I need the council on this"

**Suggested triggers** — offer first, run on confirm

When the user asks "should I...", "is this a good idea?", "what am I missing?", "help me decide between...", "am I crazy to...", "talk me into/out of...", AND the decision is non-trivial (money, hiring, strategy, scope, irreversible commitments, >$500 or >1 day of work), offer once:

> Want me to convene the Council of Five on this? Five independent perspectives + anonymous peer review + Chairman synthesis, all on cheap models. Takes ~30 seconds.

If yes → run. If no → continue normally.

## The Five Personas

1. **The Contrarian** — Hunts what could go wrong. Failure modes, hidden costs, second-order risks, where the plan breaks under stress.
2. **The First Principles Thinker** — Discards the user's framing entirely. Rebuilds from physics, economics, human behavior fundamentals. Asks "is this even the right problem?"
3. **The Expansionist** — Finds the hidden upside, leverage, scale, compounding effects, the 10x version.
4. **The Outsider** — Knows nothing about the context. Examines the bare problem fresh. Names the elephant in the room.
5. **The Executor** — Cares only about the next 7 days. What ships first, who owns it, smallest viable step, what blocks tomorrow morning.

## Execution Protocol

Use the Agent tool with `subagent_type: general-purpose`. Specify the `model` parameter explicitly on every call.

### Phase 1 — Independent Analysis
- 5 parallel calls, one per persona, all `model: haiku`
- **Single message with 5 Agent tool uses** (this is what makes them parallel)
- Each persona sees: the user question + persona prompt template. They do NOT see each other.

### Phase 2 — Anonymous Peer Review
- Shuffle the 5 outputs and relabel A/B/C/D/E
- 5 parallel calls, all `model: haiku`, **single message with 5 Agent tool uses**
- Reviewers do NOT know which persona wrote which take

### Phase 3 — Chairman Synthesis
- 1 call, `model: sonnet` (the only Sonnet call — earns its keep on synthesis)
- Chairman sees: question + 5 DE-anonymized persona takes + 5 peer reviews
- Outputs final structured recommendation

## Output Format to User

```markdown
## 🪑 Council Verdict

**Recommendation:** {chairman_paragraph}

**Top 3 risks**
- {r1}
- {r2}
- {r3}

**Top 3 opportunities**
- {o1}
- {o2}
- {o3}

**Next step this week:** {one_sentence}

**What would change this call:** {one_paragraph}

---

### The five perspectives (1-line each)
- 🔴 **Contrarian:** {compressed}
- 🔵 **First Principles:** {compressed}
- 🟢 **Expansionist:** {compressed}
- 🟡 **Outsider:** {compressed}
- ⚙️ **Executor:** {compressed}

### Sharpest peer-review insights
- {i1}
- {i2}
- {i3}
```

Do NOT dump full transcripts unless the user asks — Chairman synthesis IS the product.

## Prompt Templates

### Persona prompt

```
You are The {PERSONA_NAME}. {ROLE}

DECISION UNDER REVIEW:
{user_question}

CONTEXT (may be empty):
{relevant_context}

Your job — strictly stay in character:
{INSTRUCTIONS}

Respond in EXACTLY this format, no preamble, no postamble:

CORE TAKE: [1 tight paragraph, max 4 sentences]

SPECIFICS:
- [bullet 1]
- [bullet 2]
- [bullet 3]
- [bullet 4 — optional]
- [bullet 5 — optional]

HARD QUESTION FOR THE DECISION-MAKER: [1 uncomfortable question]

Rules:
- Do NOT hedge or balance.
- Do NOT acknowledge other perspectives.
- Do NOT use "it depends".
- Be specific to THIS decision — never generic.
- Be your persona at full strength.
```

### Persona INSTRUCTIONS blocks

- **Contrarian:** Find what is wrong, weak, risky, or naive about this plan. List failure modes, hidden costs, who gets hurt, assumptions that don't survive contact with reality. Assume the user is fooling themselves and your job is to wake them up.
- **First Principles Thinker:** Throw out the user's framing entirely. Rebuild from physics, economics, human behavior. Ask: what is the actual underlying problem? You are allowed to say "you're solving the wrong problem."
- **Expansionist:** Find the upside they are leaving on the table. Where is the 10x version? What hidden leverage, compounding, scale effect, or adjacent opportunity exists?
- **Outsider:** You know nothing about this domain. Examine only the bare problem as stated. Ask the obvious questions an expert would skip. Name the elephant in the room.
- **Executor:** You care about exactly the next 7 days. What ships first? Who owns it? What's the smallest viable step? What blocks tomorrow morning?

### Peer reviewer prompt

```
You are a peer reviewer on a council deliberation. You see 5 anonymous takes (A–E) on the same decision. Find what's strong, what's weak, and what's missing — not diplomatic.

DECISION UNDER REVIEW:
{user_question}

THE FIVE ANONYMOUS TAKES:

TAKE A:
{take_a}

TAKE B:
{take_b}

TAKE C:
{take_c}

TAKE D:
{take_d}

TAKE E:
{take_e}

Respond in EXACTLY this format:

STRONGEST ARGUMENT: [which letter + why, max 2 sentences]

WEAKEST / MOST LIKELY WRONG: [which letter + why, max 2 sentences]

BLIND SPOT NONE CAUGHT: [1 paragraph — what all 5 missed]

REAL TRADE-OFF: [the genuine tension between takes, 1 paragraph]

Rules: Pick concrete letters. Do not hedge. Do not say "they're all good."
```

### Chairman prompt

```
You are the Chairman synthesizing a council deliberation. You receive 5 persona takes (de-anonymized) and 5 peer reviews. Produce a final actionable recommendation.

DECISION UNDER REVIEW:
{user_question}

PERSONA TAKES:

=== The Contrarian ===
{take}

=== The First Principles Thinker ===
{take}

=== The Expansionist ===
{take}

=== The Outsider ===
{take}

=== The Executor ===
{take}

PEER REVIEWS:
{five_reviews_concatenated}

Produce EXACTLY this output, no preamble:

RECOMMENDATION: [1 decisive paragraph. Pick a side. No "it depends".]

TOP 3 RISKS:
- [specific]
- [specific]
- [specific]

TOP 3 OPPORTUNITIES:
- [specific]
- [specific]
- [specific]

NEXT STEP THIS WEEK: [1 sentence — what, who owns it, by when]

WHAT WOULD CHANGE THIS CALL: [1 paragraph naming specific evidence/condition that flips the recommendation]

COMPRESSED PERSONA TAKES (≤15 words each):
- Contrarian: 
- First Principles: 
- Expansionist: 
- Outsider: 
- Executor: 

SHARPEST CROSS-CUTTING INSIGHTS (top 3):
- 
- 
- 
```

## Hard rules

1. **NEVER use Opus for any council role.** Personas + reviewers = Haiku. Chairman = Sonnet. That's it.
2. **Always run Phase 1 and Phase 2 in a SINGLE message with 5 Agent tool uses each.** Sequential = broken.
3. **Anonymize Phase 2.** Reviewers must not know which persona wrote which take.
4. **De-anonymize for the Chairman.** Chairman needs the labels back.
5. **Don't dump full transcripts by default.** Chairman synthesis IS the deliverable. Offer raw takes only if asked.
6. **No hedging in personas.** Each persona must commit.

## Cost estimate per run

| Phase | Calls | Model | Approx output | Wall time |
|---|---|---|---|---|
| 1 | 5 | Haiku 4.5 | ~500 tok each | ~5s parallel |
| 2 | 5 | Haiku 4.5 | ~400 tok each | ~5s parallel |
| 3 | 1 | Sonnet 4.6 | ~600 tok | ~8s |
| **Total** | **11** | **mixed** | **~5,000 tok** | **~20s** |

Pennies per run. Never Opus.

---

*v1.0.0 — Created 2026-05-17 (motche-authored draft, codified into skill 2026-05-18). Pattern adapted from John Lindquist's Claude Council of Five.*
