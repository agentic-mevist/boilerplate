# The decision-model landscape (Sept–Oct 2026): competing models, the Jev Decision Index, and what a "decision model" is

Research date: 2026-10-03. Everything about the 2026 models comes from live sources fetched on that date: Hugging Face API, cards and files, GitHub, X via the ScrapeCreators API, and the web. The conceptual background in sections 6–8 also cites established literature, which is marked as such.

**Headline verification findings for the report writer** (each is detailed and sourced below):
1. **Cloudflare's "Clef leads the Jev Decision Index" claim is self-reported.** Clef is not on the official community board. Cloudflare's own eval site computes Decision Index 0.2.1 scores of **61.21 (Clef)** and **57.07 (Clef-flash)**, against Jev's 57.91. Those runs cover 36 of 38 benchmarks (the two missing ones are scored 0), are "not reproduced by the upstream board", and report no calibration numbers.
2. **The "DiffusionGemma Jev" column in Cloudflare's blog table is a composite.** Its 10 quality numbers match, to two decimals, the index row for *JoshuaSP's open-jev* harness. Its latency numbers (84.4 ms median / 211.2 ms p95) match a different index row, *djev*, whose own median is 260.4 ms.
3. **The 5.8 ms Laya median was measured by the community index, not by Cloudflare.** It was taken on an RTX PRO 6000 using Laya's special accelerated path. Laya's stock path is 19.8 ms, and Laya's own card reports 33–40 ms on a T4.
4. **Cloudflare's Kev-9B numbers are the index's numbers.** They come from the board run of Kev-9B served *without* its calibration temperature, which predates Kev-9B v2 (released 2026-09-30).
5. **Two different things are called "Kev".** Cloudflare's own Sept 18 DiffusionGemma demo is titled "Kev — parallel decisions with DiffusionGemma". Jared Palmer's Kev is an unrelated Qwen-based model family.

---

## 1. The Jev Decision Index: who built it, what it measures, methodology, benchmarks, current standings

### Takeaway
The Jev Decision Index is an unofficial, community-run Hugging Face Space built by Apolinário Passos ("multimodalart", a member of the Hugging Face org on the Hub). It scores open "typed decision engines" against TypeSafe's closed Jev on a frozen suite run on one GPU. The headline number averages 38 chance-corrected benchmarks across five areas: 0 means random guessing and 100 means perfect. On the official board (edition 0.2.1, built 2026-09-28, last updated 2026-10-02), **Jev still ranks #1 at 57.91**. The closest open models are Surogate Rune 26B-A4B (57.44), Mapika's "Decider chat" on stock Gemma-4-31B (57.33) and Perplexity's pplx-decider-v1-27b (56.40). Clef appears only on Cloudflare's self-reported copy of the board.

### Cited Findings

**Who built it and when**
- The Space `multimodalart/jev-decision-index` was created 2026-09-17 and last modified 2026-10-02. It had 399 likes on 2026-10-03, and its short description is "Benchmarks and news on various repros of TypeSafe's Jev" — [HF Space API](https://huggingface.co/api/spaces/multimodalart/jev-decision-index)
- The Hub account "multimodalart" has the display name "Apolinário from multimodal AI art" and belongs to the `huggingface` organization, among others — [HF user API](https://huggingface.co/api/users/multimodalart/overview)
- Commits are authored by `apolinario` and `multimodalart`. Several list "Claude Opus 5.5 (1M context)" as co-author, and the latest (2026-10-02) is "0.2.1: AutoJev-27B is now pplx-decider-v1-27b" — [Space commit history](https://huggingface.co/spaces/multimodalart/jev-decision-index/commits/main)
- The README says the Space is "Unofficial and community-maintained; not affiliated with TypeSafe AI". The Index tab is the leaderboard; the News tab tracks reproductions in five kinds: Decoding (inference tricks on stock models), Diffusion (text-diffusion models in a "Jev mode"), Trained (heads and fine-tunes), Prior art, and Explainers — [Space README](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/README.md)
- A public reproduction kit lives at `apolinario/decision-index`. It describes the index as "a benchmark for *typed decision engines*: models that take a `state` and a set of typed `questions` … and return one answer per question with a probability for every supplied option" — [GitHub: apolinario/decision-index](https://github.com/apolinario/decision-index)
- Cloudflare's own eval site credits the source: "the benchmark suite and the scoring formula come from the original Jev Decision Index on Hugging Face, maintained by multimodalart and contributors" — [Cloudflare Clef eval site](https://clef-evals.workers-ai-mle.workers.dev)

**What it measures and how (methodology)**
- Edition history:
  - **0.1** (2026-09-22): 31 open reproductions plus Jev `jev-1.13.0`, 19 static benchmarks.
  - **0.2** (2026-09-27): scores become chance-corrected, "30 new models", 40 benchmarks; "MMLU left the index: top models have nearly maxed it out".
  - **0.2.1** (2026-09-28): new area weights, gold-weighted benchmarks, 38 index benchmarks.
  - Source: [methodology.json changelog](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Suite size for 0.2.1: 120,340 requests (119,898 scoreable, 442 defective questions excluded for every engine). 43 benchmarks were run, 38 count toward the index, and five more (MMLU, ARC-Easy, ARC-Challenge, RouterBench, SGD) are shown but excluded. Six interactive environments (MiniWoB++, ScienceWorld, Boxoban, RTFM, Hanabi, Codenames) are left out for every model, Jev included, "because no reproduction has run them" — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Scoring formula, verbatim: "Each benchmark is chance-corrected first, (score - chance) / (1 - chance) clipped to 0-1, so 0 means random guessing and 100 means perfect. Every score is coverage-adjusted, so an unanswered or unsupported request counts as wrong." — [index.json, suite.index_note](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Area weights: Arts & Human Taste is fixed at 10%. The other four areas share 90% in proportion to the square root of their benchmark count: Knowledge & Reasoning 25.8%, Language Understanding 25.8%, Retrieval & Classification 20.0%, Tools & Automation 18.3%. "Gold ★" benchmarks weigh 1.2 within their area; the rest weigh 1.0 — [methodology.json, index.steps](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- ForecastBench, the one lower-is-better metric, enters as clip((0.25 − Brier)/0.25) × coverage, "so always predicting 0.5 scores zero" — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Hard rules, verbatim headings: "No truncation", "No label filtering" (the full option set is always offered), "No prompt tuning" (each entrant runs its own published prompts and readout), "No labels in the adapter", "No correctness-based retry", "Native abstentions stand", and "Unanswered = wrong: … Nobody climbs by skipping the hard cases." — [methodology.json, rules.hard_rules](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Hardware and sampling: every reproduction runs on "1 x NVIDIA RTX PRO 6000 (Blackwell Server Edition, 96 GB), one GPU per run", while Jev is called through "TypeSafe hosted API (jev-1.13.0) over HTTPS". Rows are a "deterministic hash sample … no outcome-based selection", with seed 20260919 — [methodology.json, suite](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Running the whole suite through Jev cost **$12.26** for 291.8M billed input tokens. That works out to exactly $0.042 per million input tokens, matching TypeSafe's published input price; output tokens are not charged — [methodology.json, suite.jev_api_cost_usd](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json); price per [TypeSafe launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Latency protocol `latency-v1`: the same 750 rows for every entrant, "one process sending one request at a time on 1 x NVIDIA RTX PRO 6000, using the fastest inference path the model or its code supports". Jev's figure (524.1 ms median) is "a network round-trip from our lab … not comparable to on-card latency". The board warns that plotting both "is not a controlled speed comparison" — [methodology.json, latency](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Calibration measurement: 32 benchmarks that have a right or wrong answer per field, a 1-in-6 sample of requests, "confidence is the probability placed on the chosen option". On this measure Jev scores accuracy 73.9% against mean confidence 81.2%, giving ECE 0.074 (slightly overconfident) — [index.json, jev.calibration](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- The board audits contamination:
  - The reflex 4B adapter was removed after it was found to have trained on 800 MMLU-Pro test items (scoring 65.8% on those against 52.1% on held-out items).
  - pngwn's open-jev trained on 9,542 MMLU-Pro test items.
  - Lumma-Fev's datasets contained 3,077 of the 3,080 BANKING77 test items.
  - Contaminated items are counted as wrong.
  - Source: [methodology.json, notes.contamination](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Point estimates only: "paired cluster-bootstrap uncertainty is not yet calculated" — [methodology.json, index.clarifications](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)

**The 10 benchmarks Cloudflare cited (one line each, with the index's chance level)**

| Benchmark | Area | Metric | What it tests (index wording, lightly trimmed) | Chance |
|---|---|---|---|---|
| BFCL | Tools | case exact accuracy | "Says yes or no for each supplied function: call it for this request? All must be right." | 0.259 |
| ToolRet | Tools | nDCG@10 | "Rates how useful each of 32 search-hit tools is for a request" (only queries with at least one relevant tool) | 0.134 |
| API-Bank | Tools | accuracy | "Reads an assistant conversation and picks the next API to call from a catalog of 53." | 0.019 |
| Home appliances (simulator) | Tools | case exact accuracy | "Given a simulated home and a command, answers ~18 questions on handling it; all must be right." Built by the index itself; 88 rows | 0.0 |
| When2Call | Tools | accuracy | "Given a question and an assistant's tools, picks the right move: answer, call a tool, ask for details, or decline." | 0.25 |
| BANKING77 | Retrieval & Classification | macro-F1 | "Picks the intent of a bank customer's message … from 77." | 0.013 |
| CLINC150+OOS | Retrieval & Classification | macro-F1 | "Picks its intent from 150, or 'out of scope' when none fits." | 0.006 |
| BRIGHT | Retrieval & Classification | nDCG@10 | "Rates how helpful each of 32 search-hit documents is for a hard question" | 0.116 |
| Amazon ESCI | Retrieval & Classification | macro-F1 | "Labels a product as an exact match, substitute, complement or irrelevant to a shopping query." | 0.203 |
| PhishNChips | Retrieval & Classification | accuracy | "Says whether an email and its link are phishing or legitimate." (dataset AreLit/PhishNChips; added in 0.2) | 0.50 |

Sources: explainers, metrics and chance levels from [index.json, benchmarks and chance_levels](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json); PhishNChips references the [AreLit/PhishNChips dataset](https://huggingface.co/datasets/AreLit/PhishNChips) and [anisselbd/jev-phishing-bench](https://github.com/anisselbd/jev-phishing-bench).

**The other 28 index benchmarks (index explainers, condensed)**
- *Knowledge & Reasoning* (10):
  - GPQA Diamond★ (PhD-written science multiple choice)
  - GSM8K (pick a math word problem's answer from 4 or 10 numbers, "with no working")
  - ChessBench (pick the strongest legal move)
  - MuSR (murder-mystery-style long-story reasoning)
  - SATA-Bench (yes/no on every candidate answer; all must be right)
  - CRUXEval (predict a Python function's output without running it)
  - CLadder (yes/no causal questions in a toy world)
  - HLE★ (Humanity's Last Exam, text-only multiple choice)
  - MMLU-Pro★ (up to 10 options)
  - BBH★ (23 BIG-Bench Hard tasks "answered with no working")
- *Language Understanding* (10):
  - ContractNLI (does an NDA support, contradict or omit each of 17 statements)
  - ANLI★ (adversarial entailment)
  - WinoGrande★ (common-sense pronoun blanks)
  - HellaSwag★ (most sensible continuation)
  - ACOS (aspect-sentiment pairs in reviews)
  - FinEntity (sentiment toward a named firm)
  - iSarcasmEval (is this tweet sarcastic)
  - VAST (stance)
  - NLI4CT (clinical-trial entailment)
  - RAGTruth (does an AI answer contain unsupported claims)
- *Retrieval & Classification*: the five above, plus HoVer (is a multi-article Wikipedia claim supported).
- *Arts & Human Taste* (7):
  - BPoMP (pick the intact limerick)
  - Humicroedit (which headline edit people found funnier)
  - POP909-CL (pick the chord from 129, given the notes)
  - cfcolor (predict a person's colour-palette preference)
  - ForecastBench★ (probability that a July–Sept 2026 event happens; Brier)
  - Habermas Machine (predict a group's top-ranked consensus statement)
  - New Yorker (match a cartoon caption)
- Source for all of the above: [index.json, benchmarks](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Shown on the board but outside the index: MMLU, ARC-Easy, ARC-Challenge, plus RouterBench ("its prompt gives away the best route") and SGD ("until it is re-run with a fixed builder") — [index.json, suite.changes](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

**Current standings (official board, Decision Index 0.2.1; data built 2026-09-28, last commit 2026-10-02; 70 open entrants plus Jev)**

| Rank | Model (author/org) | Params (served) | Base | Kind | DI 0.2.1 | ECE | Median latency |
|---|---|---|---|---|---|---|---|
| 1 | Jev (TypeSafe, closed API) | undisclosed | undisclosed | hosted API | **57.91** | 0.074 | 524.1 ms (over the network) |
| 2 | Surogate Rune 26B-A4B v3 (Surogate/Invergent) | 25.8B MoE | Gemma-4-26B-A4B-it | full fine-tune | 57.44 | 0.120 | 120.5 ms |
| 3 | Decider chat · Gemma-4-31B (Mapika) | 32.7B | stock Gemma-4-31B | inference technique | 57.33 | 0.047 | 108.5 ms |
| 4 | pplx-decider-v1-27b (Perplexity; listed earlier as AutoJev-27B) | 27.8B | Qwen3.8-27B | full fine-tune | 56.40 | 0.018 | 101.4 ms |
| 5 | simple-jev · Qwen3.8-27B | 27.8B | stock Qwen3.8-27B | inference technique | 55.74 | 0.113 | 373.0 ms |
| 6 | Jebadiah 27B (Frontier Infra) | 27.8B | Qwen3.8-27B | LoRA | 54.67 | **0.014** | 110.4 ms |
| 7 | Eikos-27B FP8 | 27.8B | Qwen3.8-27B | LoRA | 53.13 | 0.057 | 129.7 ms |
| 8 | reflex 27B (Kshetrajna Raghavan) | 27.8B | stock Qwen3.8-27B | inference technique | 52.16 | 0.024 | 108.3 ms |
| 9 | Decider chat · Qwen3.6-27B (Mapika) | 27.8B | stock Qwen3.6-27B | inference technique | 51.35 | 0.021 | 83.6 ms |
| 10 | Winnow-12B Q8 (EldanRing) | 12.0B | Gemma-4-12B | LoRA | 50.02 | 0.168 | 72.5 ms |
| 11 | JoshuaSP diffusiongemma (open-jev) | 25.8B MoE | DiffusionGemma-26B-A4B | inference technique | 49.47 | 0.216 | 260.4 ms |
| 22 | djev (Davipar) | 25.8B MoE | DiffusionGemma-26B-A4B | inference technique | 40.28 | 0.212 | 84.4 ms |
| 27 | Kev 9B (Jared Palmer) | 9.65B | Qwen3.5-9B-Base | LoRA + head | 38.48 | 0.138 | 51.4 ms |
| 29 | razorback16 openjev (DiffusionGemma NVFP4) | 25.8B MoE | DiffusionGemma-26B-A4B | inference technique | 37.25 | 0.232 | 37.7 ms |
| 35 | mmastrac diffusiongemma (vLLM PR 57250) | 25.8B MoE | DiffusionGemma-26B-A4B | inference technique | 32.24 | 0.202 | 126.7 ms |
| 61 | Laya (Convai Innovations) | 0.42B | ModernBERT-large encoder | full fine-tune | 6.04 | 0.140 | 5.8 ms |

Sources: [index.json, models](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json); entrant metadata in [methodology.json, entrants](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json); rename to pplx-decider in the [commit history](https://huggingface.co/spaces/multimodalart/jev-decision-index/commits/main). Ranks count Jev as #1.

- Entrant mix (70): by kind, 24 full fine-tunes, 15 inference techniques (no new weights), 14 LoRA, 9 head/adapter, 8 LoRA+head; by technique, 55 autoregressive, 6 GLi-family, 5 encoder, 4 diffusion — [methodology.json, entrants.counts](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- **Cloudflare's self-reported overlay**: its eval site re-renders the board with Clef added. Clef is #1 at **61.21** (209.3 ms median) and Clef-flash #5 at **57.07** (38.8 ms). Both rows show `"source": "self-reported"`, `"missing": [40, 45]` (iSarcasmEval and HLE), and null ECE and Brier. The site states: "Clef scores and latency are self-reported (missing benchmarks scored 0; latency not measured on the board's hardware)" and that they "were run by Cloudflare, the models' authors, and have not been reproduced by the upstream board" — [Cloudflare eval data](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json); [Cloudflare eval site](https://clef-evals.workers-ai-mle.workers.dev)
- Cloudflare's blog states: "Clef is currently the leader when evaluated against the Jev Decision Index". Its blog table shows only 10 of the index benchmarks, while noting "the 43 eval benchmarks that we ran" — [Cloudflare blog: Introducing Clef](https://blog.cloudflare.com/clef-decision-models/)
- As of 2026-10-03, the index Space's 38 discussions and PRs include no Clef submission. There is a self-scored 0.2.1 run for Xor 26B-A4B (56.08, #36) and pending news entries for "Decision 2.0" and "CMF Decision" — [Space discussions](https://huggingface.co/spaces/multimodalart/jev-decision-index/discussions)
- **Cross-check of Cloudflare's comparison table against index.json (0.2.1)**:
  - Jev's 10 scores match the index (BFCL 95.75, ToolRet 65.28 …), and so does Jev's latency (524.1/536.0 ms).
  - Kev-9B's 10 scores match the "Kev 9B" row exactly (0.9451 → 94.51 … 0.5075 → 50.75), as does its latency (51.4/187.9).
  - Laya's scores match to within 0.1 point (ToolRet 12.78 in the index vs 12.69 in the blog; API-Bank 11.46 vs 11.41; the rest exact), as does its latency (5.8/222.5).
  - The "DiffusionGemma Jev" quality numbers (96.52, 61.21, 83.66, 42.05, 75.44, 74.28, 83.49, 42.94, 53.37, 85.35) equal the **JoshuaSP open-jev** row exactly. The latency pair 84.4/211.2 equals the **djev** row; JoshuaSP's own latency is 260.4/537.3.
  - Sources: [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/) vs [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

### Inferences
- Cloudflare's "leader" claim holds only on Cloudflare's own run of the community suite. It is plausible, since even with two benchmarks scored as zero Clef would lead, but it is unverified and omits calibration, which is the category's selling point. A fair on-screen phrasing: "Cloudflare reports Clef tops the community index; the index maintainers haven't reproduced it yet."
- Mixing JoshuaSP's quality with djev's latency makes "DiffusionGemma Jev" look both faster and better than any single DiffusionGemma setup measured by the index. It is probably an editorial mistake rather than deliberate, but it should be flagged.
- The index shows that the top of the field is crowded. Five or more open 26–32B models sit within about 6 points of Jev. Several of them are "inference techniques" on stock weights (e.g., Decider chat on Gemma-4-31B), which suggests much of the quality comes from the base LLM plus the readout trick rather than from special training.

### Gaps
- No uncertainty intervals exist yet, so differences of a point or two between entrants (e.g., Jev 57.91 vs Rune 57.44) may not be significant.
- I could not find whether the index maintainers plan to run Clef. No Clef submission was visible.
- Apolinário's exact job title at Hugging Face was not verified; only Hub org membership was.

---

## 2. DiffusionGemma Jev: the base model, who built the Jev-compatible variants, Matt Mastracci's vLLM work, and Cloudflare's experiment

### Takeaway
DiffusionGemma is Google DeepMind's open text-diffusion LLM, released on Hugging Face on 2026-06-09: 26B total parameters with about 4B active per token (mixture of experts), Apache-2.0. There is no single official "DiffusionGemma Jev" model. It is an inference trick on Google's unchanged weights. Pre-fill the output "canvas" with the answer template, leave only the answer slots blank, run one read-only denoising step, and read the probability of each allowed label token. Matt Mastracci built this into vLLM (PR #57250, merged 2026-09-22) and showed it was competitive with Jev. Several others packaged it, among them JoshuaSP, razorback16, Davipar, GitHub Next and Red Hat. Cloudflare's Michelle Chen shipped a DiffusionGemma demo on Workers AI on Sept 18 that seeded Clef. On the index these variants are fast but poorly calibrated (ECE about 0.20–0.23).

### Cited Findings

**The base model**
- `google/diffusiongemma-26B-A4B-it` was created on the Hub 2026-06-09 and had 583,543 downloads and 1,268 likes on 2026-10-03 — [HF model API](https://huggingface.co/api/models/google/diffusiongemma-26B-A4B-it)
- Card: "DiffusionGemma is a generative model built by Google DeepMind. Based on the 26B A4B Mixture-of-Experts (MoE) Gemma 4 architecture, DiffusionGemma generates tokens using discrete diffusion." License Apache 2.0. Authors: Google DeepMind — [DiffusionGemma model card](https://huggingface.co/google/diffusiongemma-26B-A4B-it)
- Specs from the card:
  - 25.2B total and 3.8B active parameters; 8 of 128 experts active, plus 1 shared.
  - 30 layers, context up to 256K, canvas length 256.
  - Text and image inputs, with a vision encoder of about 550M.
  - Architecture: an autoregressive encoder pre-fills and caches the prompt, and a decoder "applies bidirectional attention over the generation canvas" and denoises blocks of tokens in parallel. It produces "15-20 tokens per forward pass" and ">1100 tokens per second in low batch size settings (H100, FP8)".
  - Source: [DiffusionGemma model card](https://huggingface.co/google/diffusiongemma-26B-A4B-it)
- It scores below its autoregressive sibling, e.g., MMLU-Pro 77.6% vs 82.6% for Gemma 4 26B A4B, and GPQA Diamond 73.2% vs 82.3% — [DiffusionGemma model card](https://huggingface.co/google/diffusiongemma-26B-A4B-it)

**Matt Mastracci's work: exposing logprobs for "Jev-like" structured reads**
- Early X post: "We have Jev at home. vLLM patch that turns DiffusionGemma into Jev. Runs on a DGX Spark. Can solve ASCII mazes optimally, step-by-step. Completely unoptimized, would likely be 5-10x faster (est.) on better hardware." — [X @mmastrac (search-result text)](https://x.com/mmastrac/status/2100373761195401724)
- 2026-09-17 post (1,135 likes, 444,010 views when fetched): "I ran some real, live evals on Jev vs DiffusionGemma-as-Jev (my patch for vLLM!) … Is Jev faster than DiffusionGemma? No ❌ (API vs DGX Spark) Is Jev smarter than DiffusionGemma? No ❌ (they're roughly tied!)" — [X @mmastrac, 2026-09-17](https://x.com/mmastrac/status/2100626193943052784) (fetched via ScrapeCreators)
- The index's news card describes it as "Adds a Jev-like structured mode for DiffusionGemma to vLLM (PR #57250) and runs live evals: not slower than Jev's API and roughly tied on quality" — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- **vLLM PR #57250**, "[Core] structured generation mode for DiffusionGemma model (Jev-like)", was merged to vLLM `main` as commit `1b3b88e` with author date 2026-09-22, authored by Matt Mastracci. I verified this in vLLM's git history — [vLLM commit 1b3b88e](https://github.com/vllm-project/vllm/commit/1b3b88ec2b7457aa030db4d0e7d8aaf04f6d0fb8); [PR #57250](https://github.com/vllm-project/vllm/pull/57250)
- His trail of related vLLM commits (dates from git history):
  - #57414 "hand out stashed logprobs only on the committing step" (09-17)
  - #57417 "honor logprob_token_ids on the converging step" (09-18)
  - #57462 (09-19)
  - #57589 "fix multimodal support" (09-20)
  - #57250 (09-22)
  - #58216 "constrained reads over the request's logprob_token_ids" (09-24)
  - #58226 "one-pass sampler statistics kernel" (09-25)
  - Sources: [vLLM PR #57417](https://github.com/vllm-project/vllm/pull/57417); [PR #58216](https://github.com/vllm-project/vllm/pull/58216); [PR #58226](https://github.com/vllm-project/vllm/pull/58226)
- How it works, in the example server's README:
  - "A discrete diffusion model denoises a whole canvas per forward pass. If the canvas is seeded with the answer's fixed text and only the answer slots are left as noise, one denoise step gives a distribution over each slot."
  - New request fields: `diffusion_seed_canvas`, `diffusion_pinned`, `diffusion_max_steps`, and `diffusion_read_only` ("emit the argmax canvas … and return temperature-1 logprobs at every position").
  - "Each label must be a single token in the answer template."
  - The server implements `POST /v1/systemone` (the Jev API) and returns "one distribution per question with a standard error over a few noise draws".
  - Source: [GitHub mmastrac/djev README](https://github.com/mmastrac/djev)
- PR page details, via a fetch-tool summary that I could not open directly:
  - A read requests exact logprobs for the label token IDs (`logprob_token_ids`), up to 128 IDs.
  - On a DGX Spark: a single read ran at 8.7 req/s and 120 ms; 32-way concurrency gave 54 req/s at 580 ms (about 162 decisions/s).
  - Source: [PR #57250](https://github.com/vllm-project/vllm/pull/57250). The performance figures are corroborated by [Red Hat Developer, 2026-09-28](https://developers.redhat.com/articles/2026/09/28/run-decision-model-vllm-and-red-hat-ai)
- Search-result text from a secondary source explains why exact label IDs matter: "a read asks for its label ids instead of hoping they rank in the top-k (with 26 options only 1-8 did)" — [explainx.ai summary (secondary)](https://explainx.ai/blog/diffusiongemma-jev-vllm-open-source-2026)

**Who built "Jev-compatible" DiffusionGemma variants** (none ship new weights)
- **JoshuaSP / open-jev** (2026-09-16): "An experimental inference harness for typed JSON decisions with DiffusionGemma. Denoise freely, then choose the most likely allowed tokens from the final logits. No training or fine-tuning." It describes itself as "an independent experiment, not a reproduction of Jev's architecture, training, calibrated probabilities". On Jev's 20 public cases its grouped 1-step run scored 86.1% against saved Jev's 90.8% — [GitHub JoshuaSP/open-jev](https://github.com/JoshuaSP/open-jev)
- **razorback16 / openjev** packages "the same vLLM PR #57250 route … as a Jev-wire /v1/systemone service … one read-only denoise step reads out the distribution", with a public host at api.codiv.ai — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- **Davipar / djev-dev**: "An open implementation of small, typed decisions on DiffusionGemma + vLLM … builds on … PR #57250 … It does not introduce new model weights". It adds image input and images as options — [GitHub Davipar/djev-dev](https://github.com/Davipar/djev-dev)
- **GitHub Next / LocalJev** (2026-09-19): oMLX DiffusionGemma behind `/v1/systemone`. It "Prompts for JSON probabilities instead of reading logits: wire-compatible, not equivalent" — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html); [GitHub githubnext/localjev](https://github.com/githubnext/localjev)
- **Red Hat** (Lucas Wilkinson and Rob Greenberg, 2026-09-28) wrote a guide to running DiffusionGemma decision reads on vLLM and Red Hat AI. Steps: canvas seeding, a single read-only denoise, and logprobs at answer slots, where "the top choice is the decision, and the entropy of the distribution is the confidence". On Google Cloud Run it reports 35–60 ms single-step latency and over 300 decisions/s at batch 32. Caveats: single-token answers, vLLM nightly required, and "not a replacement for LLMs". (Read via a fetch-tool summary.) — [Red Hat Developer](https://developers.redhat.com/articles/2026/09/28/run-decision-model-vllm-and-red-hat-ai)

**Cloudflare / Michelle Chen's experiment**
- Michelle Chen (@michellechen; X bio "terminal romantic @cloudflare") posted on 2026-09-18 (218 likes, 60,645 views when fetched): "what if we could simulate jev with an oss language model and token probabilities? we break down how jev works and shipped a demo running with DiffusionGemma on @CloudflareDev workers ai". The link is kev.workers-ai-mle.workers.dev — [X @michellechen](https://x.com/michellechen/status/2101091012559151480) (via ScrapeCreators)
- The demo page's title is "Kev — parallel decisions with DiffusionGemma", described as "a Jev-shaped parallel decision API powered by DiffusionGemma on Cloudflare Workers AI". Its preview image alt text reads "Kev and Jev face off in a pixel-art fighting game". The page is a JavaScript app with no readable article text — [Cloudflare demo page](https://kev.workers-ai-mle.workers.dev/)
- Cloudflare's blog: "In the same week that Jev came out, we posted about some experiments … how we adapted the DiffusionGemma model to output deterministic probabilities by exposing the logprobs … Our initial approach built upon independent research by Matt Mastracci … Clef builds upon this concept, but uses a different base model … Qwen". Michelle Chen is the first-listed author — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

**How the DiffusionGemma variants score on the index**
- All four diffusion entrants are "inference technique" entries on the unchanged 25.8B checkpoint:

| Entrant | DI | Median | Accuracy vs confidence | ECE |
|---|---|---|---|---|
| JoshuaSP | 49.47 | 260.4 ms | 68.1% vs 89.6% | 0.216 |
| djev | 40.28 | 84.4 ms | 63.2% vs 84.5% | 0.212 |
| razorback16 (NVFP4) | 37.25 | 37.7 ms | 62.1% vs 85.3% | 0.232 |
| mmastrac PR build | 32.24 | 126.7 ms | 65.0% vs 85.1% | 0.202 |

  Source: [index.json, models](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- The mmastrac PR build "supports at most 26 answer options per question", leaving 12.05% of requests unanswered. These include BANKING77, CLINC150 and API-Bank, and unanswered requests count as wrong — [index.json, gaps](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Determinism on the index:
  - The mmastrac build's re-run control rows "agree with the scored run on 99.6% (1,688 of 1,695)".
  - razorback16's build "is not deterministic on the author's default flags; two smoke passes agree on 85.3% of choices … 95.6% with vLLM batch-invariant mode".
  - Source: [methodology.json, notes.run_variation](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- djev's board run was "lifted": "max_model_len raised from 32,768 to 262,144, canvas from 128 to … 256 … 388 previously refused rows answered" — [methodology.json, notes.lifts](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)

### Inferences
- "Deterministic probabilities" does not mean "calibrated probabilities". The diffusion read gives a repeatable distribution, but the index shows it is overconfident by roughly 20 points. Clef added a trained head plus Brier-loss post-training, which is the step that addresses calibration.
- For the video, DiffusionGemma Jev is best described as "a clever way to *read* a diffusion model's mind instead of letting it *write*". Mastracci did the engine work, and the community, Cloudflare and Red Hat built on it.
- Naming confusion risk: Cloudflare's Sept 18 demo was called "Kev". That is unrelated to Jared Palmer's Kev models, which also launched Sept 18–20.

### Gaps
- I could not open the GitHub PR page directly (blocked), so the reviewer discussion and exact PR text come from a fetch-tool summary. Merge state and date are verified from git.
- Mastracci's professional background beyond his X profile (account since 2008, 9,303 followers, Mastodon handle) and his vLLM commit history was not verified.
- The exact configuration of Cloudflare's Sept 18 demo (Workers AI model ID, canvas settings) is not visible because the page is a JS app.
- The date of Mastracci's first "Jev at home" post is not confirmed. Its status ID precedes his Sept 17 post.

---

## 3. Kev-9B and Jared Palmer

### Takeaway
Jared Palmer is VP of Engineering at Cognition (the company behind Devin). He was previously at Xbox, Microsoft CoreAI/GitHub and Vercel, where he created v0. In his own name he released Kev, an Apache-2.0 family of "Jev-like" decision models. Kev-9B is a LoRA adapter (45.4M parameters) plus a small "pointer head" on a frozen Qwen3.5-9B-Base. It is run prefill-only and answers TypeSafe's System One API, so the TypeSafe SDK works by changing `base_url`. The repo was created 2026-09-20, and v2 ("Kev 1.0") shipped 2026-09-30. Its card is unusually candid: strong in-domain results, but not better than v1 on new tasks, and 13 points behind Jev on a breadth index.

### Cited Findings

**Who Jared Palmer is today**
- X bio: "VP of Engineering @Cognition. Previously: VP Eng @Microsoft. VP of AI @Vercel, Creator of @v0 and @aisdk, Founder of @Turborepo (acquired by Vercel)"; location New York — [X @jaredpalmer](https://x.com/jaredpalmer) (via ScrapeCreators)
- His official bio: "Jared Palmer is the VP of Engineering at Cognition, the applied AI lab behind Devin". Previous roles: VP of Engineering at Xbox, SVP of Product at GitHub, VP of AI at Vercel (v0.app, AI SDK), founder of Turborepo (acquired by Vercel in late 2021) — [jaredpalmer.com/info](https://jaredpalmer.com/info)
- KitGuru (2026-07-23): Palmer joined Xbox as VP of Engineering in May 2026 and left after about 3 months, posting "Personal update: I've joined @Cognition to lead engineering". Before Xbox he was "CoreAI vice president of product" and "senior vice president of Microsoft's GitHub subsidiary" — [KitGuru](https://www.kitguru.net/tech-news/mustafa-mahmoud/xbox-loses-its-vp-of-engineering-after-just-3-months/)

**Release timeline**
- Kev repos on the Hub by creation date:
  - kev-0.5b (2026-09-18)
  - kev-0.6b, kev-4b, kev-8b (2026-09-19)
  - kev-9b, kev-0.8b (2026-09-20)
  - kev-27b (2026-09-24)
  - Source: [HF models by jaredpalmer](https://huggingface.co/jaredpalmer)
- 2026-09-20 X post (2,698 likes, 291,195 views when fetched):
  - "Kev is a family of small open source Jev-like decision models you can train and run yourself … same LoRA + small pointer head technique … Out of domain … Kev-8B 79.6%, Jev 85.7%."
  - "Drop-in TypeSafe System One API; their SDK works with one `base_url` change … Kev-4B trains in 40 minutes on one H100."
  - It quotes his earlier Kev-0.5B (Qwen2.5-0.5B) post.
  - Source: [X @jaredpalmer](https://x.com/jaredpalmer/status/2101715352258232539)
- The family was later "refactored onto Qwen3.5 at 0.8B/4B/9B". The GitHub repo had 6,082 stars in the index's 2026-09-24 snapshot — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- Palmer asked the index to drop the superseded Qwen2.5/Qwen3 Kev generations and keep the Qwen3.5 family — [Space discussion #10](https://huggingface.co/spaces/multimodalart/jev-decision-index/discussions/10); [methodology.json, rules.withdrawn](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)

**Kev-9B model card details** (all from the [Kev-9B model card](https://huggingface.co/jaredpalmer/kev-9b) unless noted)
- Summary: "Kev-9B is a decision model. It reads one document (the *state*) and a set of typed questions about it, and returns a calibrated probability distribution over the options supplied with each question, in a single forward pass and without generating text." It "fits one 24 GB-class GPU". The card describes "version 2, released on 2026-09-30 and included in Kev 1.0" (revision `b5d8c18e`).
- Architecture:
  - "a causal language-model backbone run prefill-only, with a pointer head over the options".
  - Backbone: `Qwen/Qwen3.5-9B-Base` (frozen), with 32 layers (24 Gated DeltaNet linear-attention and 8 full-attention) and hidden size 4,096.
  - LoRA rank 16, α 32, 45.4M parameters.
  - Pointer head: "two projections score each option's closing token against the question's final token; a softmax gives the probabilities".
  - Calibration: "One temperature, T = 2.19".
- Inputs and context:
  - Question types: `choice` (1–255 named options), `score` (1–255 ordered levels), `noul` (yes/no).
  - "Each question is answered as its own row that continues from the shared state … the state is computed once and cached."
  - Context: states up to 65,536 tokens are served, but the "Validated context length" is 8,192 tokens.
  - English only. License Apache-2.0. Library PEFT. Hub pipeline tag `text-classification` ([HF API](https://huggingface.co/api/models/jaredpalmer/kev-9b)).
- Training:
  - 12,576 base records from 10 public datasets plus generated policy and rule records.
  - 1,425 generated date and missing-evidence records.
  - 16,539 "documents and skills" records (CFPB complaints, programmatic skill families, developer-tooling sets).
  - "No output of Jev … was used."
  - The final stage took "2.6 hours on one NVIDIA H200".
- Claimed results:
  - Out-of-domain transfer-v4 locked test: accuracy 0.852, Brier 0.199, ECE 0.034.
  - breadth-v1 test (14 held-out public datasets): 0.698 vs Jev 0.757. On the community Decision Index 0.2 formula over the same items, **41.0 vs Jev 54.0**.
  - documents-v1 test 0.900; hard-v1 test 0.834; devtools-v1 test 0.791.
  - MMLU-Pro 0.590 vs Jev 0.840.
  - Date arithmetic 0.725 vs Jev 0.95.
- Self-reported limitations:
  - "Its large gains are in distribution."
  - "It is not better than v1 on new work."
  - "Kev-27B leads it by 11 points on the breadth-v1 index, Jev by 13."
  - "Option order can change an answer."
  - "Accuracy and calibration shift under domain change."
  - Long-document accuracy falls from 0.850 at 8k tokens to 0.801 at 64k.
- Serving (measured on v1, same architecture):
  - H100: 24.0 ms for 6 questions on a new short state and 16.6 ms on a repeated state; 79.5 requests/s with 64 clients.
  - L40S: 66.4 ms and 42.7 ms.
  - 21.9 GB resident memory.
- **Index result (board checkpoint)**: DI 38.48 (#27), with ECE 0.138 and median 51.4 ms. The run used the board checkpoint with "raw probabilities, no temperature, as on the board". "A first run on the newer checkpoint … was set aside." — [index.json, Kev 9B latency path](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

### Inferences
- Kev appears to be a personal side project (the card names "Developer: Jared Palmer" and his personal GitHub) rather than a Cognition product. No Cognition branding was found.
- The Kev-9B numbers in Cloudflare's table are the index's run of the pre-v2, un-temperature-scaled checkpoint. They understate Kev-9B v2's calibration and probably its accuracy on document tasks. Cloudflare did not say which version it compared.
- Kev-9B scores only 50.75 on PhishNChips, where chance is 50%. On that benchmark it is effectively guessing.

### Gaps
- No independent (index) score exists yet for Kev-9B v2 or Kev-27B.
- Kev-27B is mentioned (card created 2026-09-24, v2 on 2026-09-30), but I did not examine it in depth.

---

## 4. Laya: who made it, size and architecture, and why it is so fast but scores poorly

### Takeaway
Laya is a 421M-parameter **encoder** model (ModernBERT-large plus a small decision head), published 2026-09-18 by Convai Innovations, whose author is Nandakishor M of DeepMost Innovations. It was trained with an RL scheme rewarding honest probabilities. It is fast because it is tiny (about 1/20th to 1/60th the size of the 9–27B LLM-based models), reads everything in one encoder pass, and was measured on the index with a fused-kernel and CUDA-graph fast path. It scores poorly (DI 6.04, near the bottom) for several reasons:
- It lacks an LLM's world knowledge and reasoning.
- Its 192-token budget for *all* options crushes many-option questions.
- Its own card admits the base checkpoints are "near chance on typed-decisions zero-shot".
- The index's chance-correction turns near-random scores into near-zero.

### Cited Findings

**Who made it**
- The Hub org "Convai Innovations" created `convaiinnovations/laya` on 2026-09-18. It is Apache-2.0, with 421,293,830 parameters (F16). On 2026-10-03 it had 5,011 likes, while the API reported 0 downloads — [HF model API](https://huggingface.co/api/models/convaiinnovations/laya)
- Code is at github.com/NandhaKishorM/laya, and there is a PyPI package `laya` — [Laya model card](https://huggingface.co/convaiinnovations/laya)
- The author's write-up (dev.to, 2026-09-18) is by Nandakishor M of DeepMost Innovations. He claims to have built non-autoregressive decision models in March 2025, with arXiv 2503.23303 and arXiv 2510.01237 (Sept 2025). He says Jev used "the exact same non-autoregressive decision concept" (read via a fetch-tool summary) — [dev.to post](https://dev.to/nandakishor_m_6cc0adfde9f/i-built-non-autoregressive-decision-models-a-year-ago-then-a-frontier-lab-called-it-a-18me)
- The index lists his DeepMost sales-conversion model under "prior art", noting "PPO over embeddings; loosely related" — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- The index news snapshot (2026-09-24) shows Laya's GitHub at 20,703 stars and 3,133 Hub likes — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html); snapshot date per [Space README](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/README.md)

**Size and architecture** (from the [Laya model card](https://huggingface.co/convaiinnovations/laya) unless noted)
- "ModernBERT-large (395M, bidirectional, fully fine-tuned) + a decision head trained from scratch: 2 transformer layers, an option-marker scorer, and an act/escalate head. 421M total."
- "Every option is scored at its own `[MASK]` token, then softmaxed over that question's options. The answer space is defined at request time, so new schemas need no retraining."
- "Every question in a call is answered in one single forward pass."
- Variants:
  - `laya-multilingual`: mmBERT-base, 322M, 100+ languages.
  - `laya-typed-decisions`: fine-tuned on TypeSafe-style workflows.
- Budget: "512 tokens per question for English (`head_max_len = 192`)". The config shows `max_len` 512 and `head_max_len` 192, with per-option-count temperatures — [rl_agent_config.json](https://huggingface.co/convaiinnovations/laya/blob/main/rl_agent_config.json)
- Training (RLCD): "exploration adds zero-mean Gaussian noise to the logits; the reward is a strictly proper scoring rule (log + spherical, plus ranked probability score for ordinal questions). Expected reward is maximised only by reporting honest probabilities. Updates are REINFORCE with a group-mean baseline (GRPO-style)."
- The run's config records 7,313 updates in 1.96 hours on one GPU — [rl_agent_config.json](https://huggingface.co/convaiinnovations/laya/blob/main/rl_agent_config.json)
- It implements the Jev wire format: "`laya-serve` exposes the `Router` on the same `POST /v1/systemone` request and response shape as TypeSafe Jev".

**Speed**
- Laya's own T4 numbers: 39.5 ms for 1 question (English) and 32.8 ms (multilingual); 158.6 ms for 10 questions — [Laya model card](https://huggingface.co/convaiinnovations/laya)
- The index's 5.8 ms median / 222.5 ms p95 was measured *by the index*, on an RTX PRO 6000:
  - Path: "laya Agent.accelerate(use_graphs=True): TileLang fused kernels + CUDA graphs per shape bucket … measured with a warm TileLang JIT cache".
  - "p95 still includes first-use CUDA graph capture per bucket. Stock path (19.8 / 51.2 ms) kept".
  - Source: [index.json, Laya latency path](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Cloudflare's blog reproduces 5.8 / 222.5 ms and says "Laya … is very fast but trades off quality" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

**Why it scores poorly**
- Index: DI 6.04 (61st of 71). Accuracy 37.7% against mean confidence 51.7% (ECE 0.140). Area skills are knowledge 3.6, language 9.0, retrieval 7.2, tools 5.8 and arts 2.9 out of 100 — [index.json, Laya](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Benchmark detail: PhishNChips 50.15% (chance is 50%); Home appliances 0; BANKING77 14.3 and CLINC150 3.2 macro-F1 — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- From the card:
  - "Base checkpoints are near chance on typed-decisions zero-shot — 0.362 here … against a 0.318 random and 0.461 majority-class baseline … Laya is a fast base to specialise, not a zero-shot decision engine."
  - "a 77-option question like Banking77 allocates only (256 - 16) // 77 ≈ 3–4 tokens per label, causing accuracy to fall off sharply (0.425 vs Jev's 0.870)."
  - "Ships over-confident: Refitting one temperature … moves mean ECE 0.466 → 0.081."
  - "The English checkpoint collapses on non-Latin scripts (Khmer scores 0.000 accuracy at 0.952 confidence)."
  - "`noul` can follow its option labels instead of the state".
  - Source: [Laya model card](https://huggingface.co/convaiinnovations/laya)
- Its own eval file: in-task accuracy 0.753 (ECE 0.030) vs zero-shot task families 0.651 (ECE 0.204) — [Laya eval/results.md](https://huggingface.co/convaiinnovations/laya/blob/main/eval/results.md)
- Laya's card compares against "third-party published, never measured here" Jev figures, e.g., its own 32.8 ms against Jev's "236–276 ms p50" — [Laya model card](https://huggingface.co/convaiinnovations/laya)

### Inferences
- The index is dominated by knowledge, reasoning, tool and many-option tasks, where a 0.4B encoder without LLM pretraining cannot compete. Laya is a specialist base model judged on a generalist exam. Its quoted wins (AG News, Emotion, fine-tuned typed-decisions) are narrow classification tasks.
- In plain words: Laya is a sprinter, not a scholar. It answers in milliseconds, but zero-shot it is often guessing, and its own authors say to fine-tune and recalibrate it first.
- The 5,011 likes against 0 reported downloads probably reflects that Laya loads through its own `laya` package, which may bypass the Hub's download counter. This is an inference and was not checked.

### Gaps
- The prior-art papers (arXiv 2503.23303, 2510.01237) were not read. The author's claim of priority is unverified.
- No independent latency for Laya on Cloudflare hardware was found.

---

## 5. Other decision models and Jev-compatible releases (Sept–Oct 2026)

### Takeaway
Within about two weeks of Jev's launch (community reactions date from 2026-09-16), dozens of open "Jev-like" models appeared. The index tracks 70 scored entrants and a 66-card news feed. They come from:
- Big labs and platforms: Cloudflare, Perplexity, Together AI, InternLM, Red Hat, GitHub Next.
- Startups: Surogate/Invergent, Bespoke Labs, Fastino, Juspay, FLock.io, Maincode, Doccy and others.
- Many individuals.

Nearly all are built on Qwen3.5/3.6/3.8 or Gemma 4 backbones and speak TypeSafe's `/v1/systemone` wire format. They use one of three tricks: reading option-token probabilities from a stock LLM, adding a LoRA or head, or full fine-tuning. Encoder-only models (GLiNER, ModernBERT and mmBERT based) form a fast but low-scoring tier.

### Cited Findings

**Notable releases** (DI = official Decision Index 0.2.1 where scored; Hub creation dates)

| Model | Who | Date | Size / base | Approach | DI 0.2.1 | Source |
|---|---|---|---|---|---|---|
| Jev (jev-1.13.0) | TypeSafe AI | launched mid-Sept 2026 | undisclosed, closed API | "System One" model trained with RLCD | 57.91 (#1) | [TypeSafe post](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json) |
| Clef / Clef-flash | Cloudflare | Hub 2026-09-30; blog 2026-10-01 | 27.36B (Qwen3.8-27B frozen) / 9.41B (Qwen3.5-9B); vision; Apache-2.0 | routing head + rank-256 LoRA, prefill-only, Brier-loss post-training plus RLCD-style RL | self-reported 61.21 / 57.07 | [Clef API](https://huggingface.co/api/models/Cloudflare/clef); [Clef-flash API](https://huggingface.co/api/models/Cloudflare/clef-flash); [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/) |
| pplx-decider-v1-27b | Perplexity | Hub 2026-10-01 | Qwen3.8-27B full fine-tune; Apache-2.0 | card: "results were measured through the Perplexity API" | 56.40 (#4) | [model card](https://huggingface.co/perplexity-ai/pplx-decider-v1-27b) |
| Rune 26B-A4B v3 | Surogate (Invergent) | 2026-09-21 | Gemma-4-26B-A4B MoE, 262k context, text+images | full fine-tune | 57.44 (#2) | [model card](https://huggingface.co/surogate/rune-26b-a4b-GGUF) |
| decider family + "Decider chat" | Mapika | 2026-09-16 onward | 0.8B–35B-A3B Qwen3.5 fine-tunes; chat readout on stock Gemma-4-31B | full fine-tunes; readout trick | 57.33 (#3, chat on Gemma-4-31B) | [decider-35b-a3b card](https://huggingface.co/Mapika/decider-35b-a3b); [index news](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html) |
| Jebadiah 27B | Frontier Infra | 2026-09-26 | Qwen3.8-27B LoRA | logit readout | 54.67; best ECE 0.014 | [model card](https://huggingface.co/frontier-infra/jebadiah-27b) |
| Tev1-4B / 0.8B-experimental | Together AI | 2026-09-23 | Qwen3.5-4B SFT; "$17" to train | "not a non-autoregressive Jev runtime"; keeps LM head | 29.24 (4B) | [model card](https://huggingface.co/togethercomputer/Tev1-4B-experimental) |
| Intern-Decision 0.8B/2B/4B | InternLM | 2026-09-26 | Qwen3.5, multimodal | single-token option symbols, one pass | 37.81 (4B) | [model card](https://huggingface.co/internlm/Intern-Decision-4B) |
| Decision 1.0 (Kai, Lex, Sol, Nox, Lux-9B, Eos) | vLLM Semantic Router team | 2026-09-21/22 | mmBERT encoders to Qwen3.5-9B | Choice/Noul/Score, 50 languages | 43.49 (Lux-9B) | [Lux-9B card](https://huggingface.co/llm-semantic-router/Decision-1.0-Lux-9B); [index news](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html) |
| GLiNER2.5-Decide | Fastino | 2026-09-23 | 340M encoder (card) | label set passed at call time, "No generated tokens" | 11.21 | [model card](https://huggingface.co/fastino/GLiNER2.5-Decide) |
| Xor 1.0–1.2 | Juspay (Xyne) | 2026-09-21 | Qwen3.6-35B-A3B; up to 8 images | post-train behind /v1/systemone | 41.48 (v1.0) | [model card](https://huggingface.co/juspay/xor) |
| Bespoke Nimble 9B (v1/v2) | Bespoke Labs | 2026-09-18 / 09-23 | Qwen3.5-9B LoRA | "open data, open model, open recipe" | 39.57 (v2) | [Nimble v2 card](https://huggingface.co/bespokelabs/Bespoke-Nimble-9B-v2); [index news](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html) |
| Winnow-12B / E4B | EldanRing | 2026-09-20 | Gemma 4 12B / E4B | decisions plus chat and vision from one llama.cpp server | 50.02 (12B) | [model card](https://huggingface.co/EldanRing/Winnow-12B) |
| Solomon | Doccy (Archer Hume) | 2026-09-21 | Qwen3.8-27B LoRA + heads | letter-logit probabilities | 36.43 | [model card](https://huggingface.co/DoccyHealth/Solomon) |
| this-that 1.2 | FLock.io | 2026-09-23 | 1.9B (from decider-2b) | policy-rule following | 28.14 | [model card](https://huggingface.co/flock-io/this-that-model-1.2) |
| JEV-27B / JEV-27B-VL | autotrust | 2026-09-25 / 09-30 | Qwen3.8-27B; System 1 `/v1/decide` plus System 2 chat | not on board; 179,237 downloads | not scored | [model card](https://huggingface.co/autotrust/JEV-27B-VL) |
| MATILDA-jev v1 | Maincode | 2026-09-30 | 26.1B, 255-option readout, validated on AMD MI355X | not on board | not scored | [model card](https://huggingface.co/Maincode/matilda-jev-v1) |
| FRIDA-Decisions | ai-forever | 2026-10-02 | 0.82B encoder, Russian | single encoder pass | not scored | [model card](https://huggingface.co/ai-forever/FRIDA-Decisions) |
| Torchcast Decision 12B | Torchcast AI | 2026-10-02 | Gemma-4-12B LoRA; CC-BY-NC | not on board | not scored | [model card](https://huggingface.co/torchcast-ai/torchcast-decision-12b) |
| StartLux-Decision (0.8B–35B-A3B) | StartLux | 2026-09-29 / 10-01 | MoE 35B (3B active); CC-BY-NC | card cites its own DI 0.2.1 runs | not on board | [model card](https://huggingface.co/startlux-models/StartLux-Decision-35B-A3B) |
| Docto Decision (FR medical) | bofenghuang | 2026-09-30 / 10-02 | Qwen3.5 / Gemma 4 / MedGemma LoRAs | French medical decisions | not scored | [model card](https://huggingface.co/bofenghuang/docto-decision-qwen3.5-4b-fr-v0.1) |

- Notable individual and "decoding-trick" projects:
  - Harsha Gundal's Qwen-2.5-1B-RLCD (2026-09-16; 5,831 likes, about 1.29M views): "Batches every JSON key at once and reads category probabilities from stock Qwen 2.5 1B logits, ~5× faster than generating JSON".
  - Theo Lee's openjev (4,109 GitHub stars): "21 decisions in 1.02s vs 5.33s for JSON".
  - Eric Zhang's openjev-sglang: "64 parallel tasks finish in under a second. Prefill-only, no generation".
  - reflex by Kshetrajna Raghavan (Shopify), with Qwen3.5-4B temperature-scaled to "0.039 ECE vs Jev's 0.031".
  - Vinny LaRouge's jevlike.
  - Logan Markewich's jeff on GLiFormer.
  - Source: [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- News feed composition: 66 items, of which 33 trained models, 18 decoding tricks, 4 diffusion, 2 prior-art claims and 9 explainers — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- A Hub search for "jev" returned 50+ models, e.g., Jev-Omni, autotrust JEV-9B/27B, NeoHorse-Jev-4B and Jev-Style GGUF builds — [HF model search API](https://huggingface.co/api/models?search=jev&limit=50)
- Pending as of 2026-10-03: news PRs for "Decision 2.0" (2026-10-03) and "CMF Decision" (2026-10-02), and a self-scored Xor 26B-A4B run at 56.08 (2026-10-01) — [Space discussions](https://huggingface.co/spaces/multimodalart/jev-decision-index/discussions)
- Common API: TypeSafe's `POST /v1/systemone` takes a `state` and named `questions`, each of type `noul` (yes/no probability), `choice` (named options with probabilities) or `score` (ordered levels) — [mmastrac/djev README](https://github.com/mmastrac/djev); [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

### Inferences
- The category commoditized very quickly. Within roughly 10–14 days, open models on commodity backbones reached within a few points of Jev on the community index. Cloudflare's and Perplexity's entries show that platforms see decision models as a serving product, sold per input token, rather than a research novelty.
- Most "decision models" are not new architectures. They are existing LLMs read out differently, plus optional small heads and calibration. That is the key message for a non-specialist audience.

### Gaps
- The launch date of Jev itself is not confirmed by this research; that is another team's scope. Community posts begin 2026-09-16. A fetch of TypeSafe's post returned "September 28, 2026" (author "Diogo Almeida, Founder"), which conflicts with that timeline and may be an update date.
- Organizational details for several startups (Surogate/Invergent, Maincode, autotrust, StartLux) were not verified beyond their model cards.
- No closed-source competitor other than Jev was found. Perplexity's model is open-weight but also served through its API.

---

## 6. The concept: what a decision model is, how it differs from classifiers, zero-shot classifiers, LLM structured outputs, and LLM-as-judge or reward models, and why prefill-only scoring gives speed, calibrated probabilities and determinism

### Takeaway
A decision model is software's multiple-choice oracle. You give it a situation (the "state") and one or more questions, each with the allowed answers listed. It returns a probability for every allowed answer, computed in a single "reading" pass without writing any text. It differs from a classic classifier because the labels are supplied at request time rather than baked in by training. It differs from older zero-shot classifiers because it rides on a large LLM backbone, so it knows more and follows instructions. It differs from an LLM with JSON mode because it never generates: it scores the options directly, which is faster, cannot go off the list, and yields usable probabilities. It differs from an LLM judge or reward model in being cheap, fast, typed and calibrated, but it cannot explain itself.

### Cited Findings

**Definitions from the builders**
- TypeSafe: a "System One" model is a "new class of frontier models built to make fast, structured decisions that software can use directly". Jev is "a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out". TypeSafe contrasts parallel versus sequential sampling and training with RLCD ("Reinforcement Learning for Calibrated Decisions") versus RLHF/RLVR (read via a fetch-tool summary) — [TypeSafe launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Cloudflare: "A decision model makes classifications to help agents decide how to act, based on certain probabilities … returns typed answers with probabilities (outputs), which your code can use to route the ticket, trigger an escalation, or defer to a human". Such models "work over any set of inputs without constantly retraining the model to incorporate new classification categories". This contrasts with LLMs, "which are largely non-deterministic, but are open-ended enough to reason and generate text" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Cloudflare on mechanism: "Clef uses Qwen for a prefill-only pass, then scores the valid schema choices in parallel. The decision step is non-autoregressive, so there's no intermediate text to generate token by token". Training uses "label-smoothed cross-entropy … paired with a Brier loss to refine probability calibration" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Victor Dibia's explainer (updated 2026-09-24): a decision model gives "the same kind of output" as a BERT classifier, "except the classes are defined at inference time, in the prompt, instead of being fixed when the model is trained" (read via a fetch-tool summary) — [Victor Dibia, "How Jev works"](https://victordibia.com/explainers/jev/)

**(1) vs traditional trained classifiers (fixed label set)**
- A standard fine-tuned classifier (e.g., a BERT-style model) attaches an output layer with one unit per class, so its label set is fixed at training time. Adding a label means new labelled data and retraining. This is established practice; see the BERT fine-tuning setup in [Devlin et al. 2018](https://arxiv.org/abs/1810.04805) (established literature).
- Decision models move the label set into the request: Laya says "The answer space is defined at request time, so new schemas need no retraining" ([Laya card](https://huggingface.co/convaiinnovations/laya)), and FRIDA-Decisions says "a new label set is a new JSON, not a new training run" ([FRIDA-Decisions card](https://huggingface.co/ai-forever/FRIDA-Decisions)).
- Cloudflare concedes that fine-tuning still helps for narrow domains: "When you fine-tune a model, you may give up some general purpose performance in exchange for higher accuracy in a specific domain" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

**(2) vs zero-shot classifiers (NLI/BART-MNLI, GLiClass/GLiNER, SetFit)**
- NLI zero-shot classification turns each candidate label into a hypothesis ("This text is about {label}") and scores entailment with a model like BART-MNLI. That means one pass per label — [Yin et al. 2019](https://arxiv.org/abs/1909.00161); [facebook/bart-large-mnli card](https://huggingface.co/facebook/bart-large-mnli) (established literature)
- GLiNER-style encoders put the labels into the input and score them in one pass — [GLiNER, Zaratiana et al. 2023](https://arxiv.org/abs/2311.08526); [GLiClass model](https://huggingface.co/knowledgator/gliclass-modern-base-v2.0) (established literature)
- SetFit is few-shot: it fine-tunes a sentence encoder and trains a classification head on a handful of labelled examples, so the label set is fixed after training — [Tunstall et al. 2022](https://arxiv.org/abs/2209.11055) (established literature)
- The "prior art" debate:
  - Fastino responded to Jev's launch by pointing to GLiNER 2.5, "a pretrained zero-shot encoder-classifier already doing single-pass classification over caller-supplied labels".
  - Logan Markewich argued "jev itself can basically be boiled down to a classfier or an encoder, just like GliFormer".
  - Source: [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- On the community index, the encoder and GLi-family models (GLiNER2.5-Decide 11.21, jeff 8.04, Laya 6.04, GLiNER 2.5 base 6.76) score far below LLM-backbone decision models (27B entrants in the 50s) — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

**(3) vs LLM structured outputs (JSON mode, constrained decoding, function calling)**
- Constrained decoding (e.g., Outlines) and "Structured Outputs" guarantee that generated text matches a schema, but the model still generates token by token — [Willard & Louf 2023 (Outlines)](https://arxiv.org/abs/2307.09702); [OpenAI, Introducing Structured Outputs](https://openai.com/index/introducing-structured-outputs-in-the-api/) (established literature)
- Dibia measured "generating JSON may not parse" (7% invalid JSON in his test). Scoring the options instead was "7× to 54× faster than generating the probabilities" on Qwen2.5-7B. "Scoring cannot return anything off the list, because you supplied the text of every option" (fetch-tool summary) — [Victor Dibia](https://victordibia.com/explainers/jev/)
- Community measurements: openjev "21 decisions in 1.02s vs 5.33s for JSON"; Qwen-2.5-1B-RLCD "~5× faster than generating JSON". GitHub Next's LocalJev, which asks the LLM to *write* probabilities in JSON, is called "wire-compatible, not equivalent" — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- Function calling still generates the call text, but BFCL on the index is recast as yes/no per function: "Says yes or no for each supplied function: call it for this request?" Tool *selection* becomes a decision task, while filling in the arguments is still generation — [index.json, BFCL explainer](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

**(4) vs LLM-as-judge and reward models**
- LLM-as-judge uses a strong LLM to write a verdict, often with reasoning. It is useful but costly and shows position and verbosity biases — [Zheng et al. 2023](https://arxiv.org/abs/2306.05685) (established literature)
- A reward model outputs a scalar preference score for a (prompt, response) pair, trained on human comparisons, mainly to train other models (RLHF). It is a single-purpose scorer, not a probability over arbitrary caller-defined options — [Ouyang et al. 2022](https://arxiv.org/abs/2203.02155) (established literature)
- Decision models are being pitched as fast judges. Kev's intended uses include "judging a proposed answer against stated criteria" ([Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)); the pplx-decider card reports JudgeBench and RAGTruth ([pplx-decider card](https://huggingface.co/perplexity-ai/pplx-decider-v1-27b)); and the index includes RAGTruth hallucination detection ([index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)).

**Why prefill-only scoring gives speed**
- An LLM writes one token per forward pass, and each pass depends on the previous token. Scoring reads the prompt once and scores all options side by side: "two passes, however long the options are" versus "one forward pass per token of the answer" (fetch-tool summary) — [Victor Dibia](https://victordibia.com/explainers/jev/)
- Sharing the state across questions: Kev answers each question "as its own row that continues from the shared state … the state is computed once and cached" ([Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)). Eric Zhang's SGLang version uses the radix cache so "64 parallel tasks finish in under a second" ([index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)).
- Economics follow: TypeSafe charges only input tokens ($0.042/MTok, output free), per [TypeSafe launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev). The index's Jev bill equals input tokens × $0.042/M ([methodology.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)).
- Speed has limits. In Dibia's 7B test, at 77 options "scoring became slower than generating a label" (fetch-tool summary) — [Victor Dibia](https://victordibia.com/explainers/jev/)

**Why it can give calibrated probabilities, and why that is not automatic**
- The output *is* a probability distribution over the allowed options (a softmax over option scores), so it can be trained and checked directly with proper scoring rules.
  - Clef: cross-entropy plus Brier loss ([Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)).
  - Laya: RL reward = strictly proper scoring rule ([Laya card](https://huggingface.co/convaiinnovations/laya)).
  - Kev: cross-entropy plus a fitted temperature T = 2.19 ([Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)).
- Temperature scaling, which divides logits by one fitted constant, is the standard post-hoc fix for overconfident neural networks — [Guo et al. 2017](https://arxiv.org/abs/1706.04599) (established literature)
- Pre-trained LMs are reasonably calibrated on multiple-choice when options are scored, but RLHF/instruction tuning tends to make them overconfident — [Kadavath et al. 2022](https://arxiv.org/abs/2207.05221); [OpenAI GPT-4 technical report](https://arxiv.org/abs/2303.08774) (established literature). Dibia found the same: "Base models were close to calibrated; instruct models were overconfident … average confidence 95%, right 64% of time". Temperature scaling took ECE from 0.10 to 0.03 — [Victor Dibia](https://victordibia.com/explainers/jev/)
- On the index, raw DiffusionGemma readouts are overconfident (ECE about 0.20–0.23), while trained and calibrated entrants reach ECE 0.014–0.02 (Jebadiah 27B, Xor, pplx-decider) — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

**Why it can be deterministic, with caveats**
- There is no sampling step. The answer is the highest-probability allowed option, and the probabilities are a function of the input. Hallucinated off-list answers are impossible because "you supplied the text of every option" — [Victor Dibia](https://victordibia.com/explainers/jev/)
- In practice GPU batching can still change results. On the index, razorback16's DiffusionGemma build agreed with itself on only 85.3% of choices by default (95.6% in vLLM batch-invariant mode), mmastrac's build 99.6% — [methodology.json, run_variation](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json). Background on batch-induced nondeterminism: [Thinking Machines, "Defeating Nondeterminism in LLM Inference"](https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/) (established literature)
- Jev's hosted API drifted: "Its answers on this sample drifted from the Sep-19 board rows (20 choice flips)" — [methodology.json, latency.jev](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)

**Calibration in plain words (Brier score, ECE)**
- Dibia: "A model is calibrated when its confidence matches its accuracy: if it gives a thousand answers at 90% confidence, about 900 of them are right." — [Victor Dibia](https://victordibia.com/explainers/jev/)
- The Brier score was invented for weather forecasts. It is the average squared difference between the forecast probability and what actually happened (1 or 0): 0 is perfect, and always saying "50%" on a yes/no question scores 0.25 — [Brier 1950, Monthly Weather Review](https://journals.ametsoc.org/view/journals/mwre/78/1/1520-0493_1950_078_0001_vofeit_2_0_co_2.xml) (established literature). The index uses exactly this 0.25 "always predict p = 0.5" baseline for ForecastBench — [index.json, lower_rules](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- ECE (expected calibration error) groups answers by stated confidence and averages the gap between confidence and actual accuracy — [Guo et al. 2017](https://arxiv.org/abs/1706.04599) (established literature). Worked example from the index: Jev is right 73.9% of the time while its average confidence is 81.2%, so it is a little overconfident (ECE 0.074) — [index.json, jev.calibration](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)

### Inferences
- The cleanest one-sentence distinction for viewers: **an LLM writes an answer; a decision model grades a list of answers you give it.** Everything else (speed, no hallucinated labels, usable probabilities) follows from that.
- "Calibrated" is a trained property, not a free one. The same readout trick is badly overconfident on raw models and well calibrated only after temperature fitting or Brier/RL training. That is why Clef, Kev, Laya and TypeSafe all emphasise their calibration step.
- The meaningful novelty over GLiNER, NLI or SetFit is putting a large instruction-following LLM behind a multiple-choice interface, plus a common API and calibration focus. It is not the idea of scoring caller-supplied labels, which predates Jev.

### Gaps
- TypeSafe has not disclosed Jev's architecture or RLCD details; only inferred designs exist (e.g., Archer Hume's teardown, listed in [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)).
- The fetch of TypeSafe's post found no numeric ECE or Brier claims there.

---

## 7. Limitations and risks

### Takeaway
Decision models are fast, cheap and bounded, which is also what limits them:
- They can only choose among the options you list (typically at most 255).
- They give no reasoning trace and are weak at multi-step reasoning or arithmetic.
- Their confidence drifts on unfamiliar data.
- Instructions hidden in the input "state" can nudge the probabilities.
- Benchmark comparisons in this young category are easy to cherry-pick.

The emerging pattern is to put a decision model in front as the gate or router, and use an LLM or a human when the decision is uncertain or needs generation or reasoning.

### Cited Findings

**Bounded outputs only**
- TypeSafe lists a maximum cardinality of 255 choices and no image support yet (fetch-tool summary) — [TypeSafe launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Kev and Laya take 1–255 options ([Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)). Laya degrades beyond about 20 options ([Laya card](https://huggingface.co/convaiinnovations/laya)). The vLLM PR build "supports at most 26 answer options per question" ([index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)).
- Kev's out-of-scope list: "Text generation, chat, summarisation or open-ended question answering. The model only scores the options it is given." — [Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)

**No reasoning trace; weak at multi-step work**
- "Everything happens in one pass, so tasks that need step-by-step reasoning are a poor fit". TypeSafe lists "arithmetic and counting among Jev's weak spots" (fetch-tool summary) — [Victor Dibia](https://victordibia.com/explainers/jev/)
- Kev-9B scores 0.725 on date arithmetic vs Jev's 0.95, and 0.590 on MMLU-Pro vs Jev's 0.840 — [Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)
- Agent-harness test of Jev (Aitejiu, 2026-09-21, about 22,500 calls costing $2.19):
  - Model-difficulty routing scored 51% (random level), and trajectory failure attribution reached only 0.560 AUROC.
  - Intent classification scored 97.9% with 7 classes and 80.3% with 77; reranking MRR rose from 0.622 to 0.843.
  - Read via a fetch-tool summary.
  - Source: [dev.to, Benchmarking Jev in an agent harness](https://dev.to/aitejiu/benchmarking-jev-what-a-decision-model-can-and-cant-do-in-an-agent-harness-20po)

**Calibration drift on new domains**
- The jev-ood-calibration study refit temperature to "2.7 on the unseen task vs 0.96–1.35 on the benchmarks; Choice/Score overconfident, Boolean underconfident" — [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html); [GitHub scienthoon/jev-ood-calibration](https://github.com/scienthoon/jev-ood-calibration)
- Jev's own calibration varies by area on the index: tools ECE 0.020 (94.6% accuracy at 95.3% confidence) vs retrieval ECE 0.154 (66.9% accuracy at 82.1% confidence) — [index.json, jev.calibration.areas](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json)
- Kev's card: "The temperature was fitted on public held-out datasets and does not transfer to every workload; measure … on a labelled sample of your own data". Laya's card cites Khmer at "0.000 accuracy at 0.952 confidence" — [Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b); [Laya card](https://huggingface.co/convaiinnovations/laya)
- Calibration degrades under dataset shift in general — [Ovadia et al. 2019](https://arxiv.org/abs/1906.02530) (established literature)

**Prompt injection through the "state" input**
- "Decision Hijacking: Prompt Injection Attacks on Jev's Typed Probabilistic Decisions" (Tiantong Wu, Wei Yang Bryan Lim; submitted 2026-09-23):
  - Setup: 510 reconstructed InjecAgent cases. "Malicious content shifts action probabilities but rarely causes Jev to select the attacker's target".
  - Adaptive attacks using score feedback doubled the attacker-target probability during optimization, and success on fresh calls rose from 1.8% to 3.5%.
  - Override markers reduce influence. "Schema-defined outputs change but do not eliminate prompt-injection risk."
  - Read via abstract and fetch summary.
  - Source: [arXiv 2609.28613](https://arxiv.org/abs/2609.28613v1)
- Background: indirect prompt injection via retrieved or third-party content — [Greshake et al. 2023](https://arxiv.org/abs/2302.12173); [OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/) (established literature)
- Option order and position effects: Kev's card says "Option order can change an answer" ([Kev-9B card](https://huggingface.co/jaredpalmer/kev-9b)). LLM multiple-choice selection bias is documented in [Zheng et al. 2023](https://arxiv.org/abs/2309.03882) (established literature). The index's shuffle test of 12 entrants flagged none for a drop of 5 points or more ([methodology.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)).

**Benchmark cherry-picking and comparability**
- Cloudflare's blog table shows 10 of the 38 index benchmarks and claims the index lead. That lead exists only on Cloudflare's self-reported copy (Clef 61.21; 2 benchmarks missing and scored 0; no ECE) — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/); [Cloudflare eval data](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json)
- The blog's "DiffusionGemma Jev" column combines JoshuaSP's scores with djev's latency (section 1). Its latency table places Jev's network round-trip (524 ms) beside on-card times, which the index says "is not a controlled speed comparison" — [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json); [methodology.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)
- Published Jev latencies vary with method:
  - 524 ms median (index, from its lab over HTTPS).
  - 236–276 ms p50 (third-party figures cited by Laya).
  - "70ms-500ms" (TypeSafe's claim).
  - P50 0.30–0.33 s (Aitejiu).
  - Sources: [index.json](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/index.json); [Laya card](https://huggingface.co/convaiinnovations/laya); [TypeSafe post](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [dev.to Aitejiu](https://dev.to/aitejiu/benchmarking-jev-what-a-decision-model-can-and-cant-do-in-an-agent-harness-20po)
- Cloudflare's Typesafe-workflow table claims "beating Jev in 3 out of 4 areas", e.g., customer service 76.3 vs 76.0, without confidence intervals — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- TypeSafe's own launch workflows were authored by its capabilities team, a bias TypeSafe itself acknowledges (fetch-tool summary) — [TypeSafe post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Contamination is common enough that the index removed or penalised entrants for training on test items (reflex 4B, pngwn open-jev, Lumma-Fev, Eikos FinEntity) — [methodology.json, notes.contamination](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/data/methodology.json)

**When you would still need an LLM**
- Red Hat calls decision models "Not a replacement for LLMs; positioned as complementary routing/gating component" (fetch-tool summary) — [Red Hat Developer](https://developers.redhat.com/articles/2026/09/28/run-decision-model-vllm-and-red-hat-ai)
- Cloudflare suggests putting "Clef into the hot path for agents to make decisions and combine that with one of our LLMs on Workers AI to take action" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Aitejiu: "For tasks requiring world knowledge, multi-step reasoning, or predicting other models' behaviors—keep general-purpose LLMs in the loop" (fetch-tool summary) — [dev.to Aitejiu](https://dev.to/aitejiu/benchmarking-jev-what-a-decision-model-can-and-cant-do-in-an-agent-harness-20po)

### Inferences
- An LLM is still needed for anything that requires *writing*:
  - replies, summaries, code;
  - free-form extraction, such as names and amounts, unless the values can be enumerated;
  - tool-call *arguments*;
  - explanations for audit;
  - multi-step planning or maths;
  - any question whose right answer is not already in your option list.
- A practical design rule viewers can remember: **decision model first; escalate when confidence is low.** Thresholds must be set on your own labelled data, because calibration drifts.
- Bounded outputs limit the blast radius of prompt injection: the attacker cannot make the model *say* arbitrary text. But for security gates (is this phishing? is this bot good?), flipping a yes/no is exactly what the attacker wants, so injection still matters.

### Gaps
- No public incident of a production decision model being hijacked was found. The evidence is the research paper and general literature.
- No independent reproduction of Clef's calibration was found; Cloudflare reported none.

---

## 8. Plain-language analogies for a YouTube audience (with attribution)

### Takeaway
Five analogies work well:
- System 1 vs System 2 (TypeSafe's own framing, echoed by Red Hat, Laya, Dibia and others).
- A multiple-choice exam vs an essay.
- A smart function call, or "if-statement".
- A weather forecaster (calibration).
- A bouncer vs a concierge.

For this creator's edge/CDN audience, an original "edge rule vs origin" framing fits Cloudflare's own "hot path" language.

### Cited Findings

**1. System 1 vs System 2 (Kahneman)**
- Used by TypeSafe: the "System One models" name references Kahneman's *Thinking, Fast and Slow* (fetch-tool summary) — [TypeSafe post](https://typesafe.ai/blog/introducing-system-one-models-and-jev); [Thinking, Fast and Slow](https://en.wikipedia.org/wiki/Thinking,_Fast_and_Slow)
- Also used by:
  - Red Hat: System One "picks immediately from defined options instead of deliberating token by token" ([Red Hat Developer](https://developers.redhat.com/articles/2026/09/28/run-decision-model-vllm-and-red-hat-ai)).
  - Laya: "non-autoregressive System 1 decision model" ([Laya card](https://huggingface.co/convaiinnovations/laya)).
  - Dibia: "the name echoes Kahneman's System 1, fast intuitive judgement" ([Victor Dibia](https://victordibia.com/explainers/jev/)).
  - autotrust, which exposes literal "System 1" (`/v1/decide`) and "System 2" (chat) modes ([JEV-27B-VL card](https://huggingface.co/autotrust/JEV-27B-VL)).
  - Commentator @hhkkmon: "Big models think. Small decision models react." ([index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html))

**2. Multiple-choice exam vs essay**
- No source used this exact analogy; it is offered here as an original framing. It matches Dibia's description of a decision model that "answers questions by completing a sentence" and scores a fixed list of options ([Victor Dibia](https://victordibia.com/explainers/jev/)), and the djev-dev pitch: "Most applications do not need a paragraph. They need to decide whether a ticket is urgent" ([Davipar/djev-dev](https://github.com/Davipar/djev-dev)).
- Script idea: "An LLM sits an essay exam: it writes word by word, can ramble, and can invent an answer that isn't on the syllabus. A decision model sits a multiple-choice exam, and next to each box writes how sure it is. It can't write an essay, but it finishes the paper in a fraction of the time and can't pick an answer that isn't printed on the sheet."

**3. A "function call" or a smart "if-statement"**
- TypeSafe: "a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out" (fetch-tool summary) — [TypeSafe post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- Commentators:
  - @hhkkmon frames agents as "expensive LLM calls pretending to be if statements".
  - @mygtmhire: "State in → probabilities out → code acts. No conversation required."
  - Source: [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html)
- djev-dev: "Text in. Images in. Decisions out." — [Davipar/djev-dev](https://github.com/Davipar/djev-dev). Aitejiu: "Model gives calibrated *local* judgments; code holds the control flow." — [dev.to Aitejiu](https://dev.to/aitejiu/benchmarking-jev-what-a-decision-model-can-and-cant-do-in-an-agent-harness-20po)

**4. The weather forecaster (calibration)**
- The Brier score comes from weather forecasting ([Brier 1950](https://journals.ametsoc.org/view/journals/mwre/78/1/1520-0493_1950_078_0001_vofeit_2_0_co_2.xml), established literature). Dibia's plain-language version: "if it gives a thousand answers at 90% confidence, about 900 of them are right" ([Victor Dibia](https://victordibia.com/explainers/jev/)).
- Script idea: "If your forecaster says 70% chance of rain on 100 days, it should rain on about 70 of them. A calibrated decision model is a forecaster you can set rules around: auto-approve above 95%, send to a human below 60%."

**5. Bouncer vs concierge**
- Not found in any source; an original suggestion. A bouncer makes an instant yes/no at the door against a rulebook he's handed tonight (a new guest list needs no retraining). A concierge has a conversation and can arrange anything, but slowly and expensively. You want the bouncer on the door and the concierge for the few guests who need real help. This maps to Cloudflare's "defer to a human" and "combine with one of our LLMs … to take action" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

**Other source analogies worth a quick on-screen mention**
- Cloudflare's name metaphor: a musical clef "assigns specific pitch names to the lines and spaces … A decision model is analogous to a music clef because it helps define the domain of the context and the subsequent notes (actions) that follow it" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Cloudflare's demo art: "Kev and Jev face off in a pixel-art fighting game" — [Cloudflare demo page](https://kev.workers-ai-mle.workers.dev/)
- Dibia lists the possible moves "as a game controller would list them" (fetch-tool summary) — [Victor Dibia](https://victordibia.com/explainers/jev/)

### Inferences
- **Edge/CDN analogy** (original, suited to a former Gcore growth director's audience): a decision model is like an edge rule engine or WAF. It makes an allow, block or route decision in milliseconds close to the user. The LLM is the origin server: powerful and slow, called only on a miss. Cloudflare's own wording ("hot path", "GPUs at the edge", "low network latency") invites this comparison ([Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)).
- Best single line for the video: "LLMs write; decision models choose."

### Gaps
- The full text of TypeSafe's launch video and post was not reviewed for further metaphors; that is another team's scope. The 45-second explainer by Matija Sosic (about 1.7M views) is listed in [index news.html](https://huggingface.co/spaces/multimodalart/jev-decision-index/blob/main/news.html) but was not watched.
