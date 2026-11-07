# Fine-tuning for Video Editing, Economics of LLM-Driven Editing, and Moats for an AI Video Editor Startup

*Research date: 2026-11-07. Every claim has a URL next to it. Anything marked "ESTIMATE" or "Inference" is my own reasoning, not a sourced fact. Third-party revenue trackers (Latka, Sacra, arr.club) give estimates or self-reported figures, not audited numbers.*

**The short answer, in plain words.** Fine-tuning does help. But in 2026 the companies that won with it (Cursor, Cognition, Bridgewater) did not just fine-tune a model on examples. They used reinforcement learning (RL) inside their own product's tools, with a reliable way to score the results. For video editing, the hard part is scoring "is this a good edit?", and nobody has a big public dataset of human edit decisions. The best general agents still fail about 3 in 4 real editing tasks. They fail mostly on craft, not mechanics. So the opening is real, but the scarce asset is data and grading, not the model. You also cannot use your users' Claude subscriptions to power your product. Anthropic's terms forbid it. So the "Claude Code subsidy" helps your competitors (people editing in Claude Code directly), not you.

---

## 1. Does fine-tuning help for video editing, and how? (existing specialized models, data, approaches)

### Takeaway
Video-editing AI splits into two very different problems:
- **(a) Pixel models** change what is in the frame: Runway Aleph, Mirage/Captions models, the editing side of Adobe Firefly, and academic instruction-editing models. Training these is a huge foundation-model effort.
- **(b) Edit-decision models** choose what to cut, keep, reorder, caption and zoom. This is the timeline/EDL problem, and it is where an LLM or VLM fine-tune could fit.

For (b), the best evidence (Timeline-Bench, Sep 2026) shows frontier agents finish only about 14–27% of real editing tasks, and they fail on *quality/taste*. That is exactly what preference data and RL can target. But there is no large public dataset of raw-footage → final-cut decisions. A startup would have to build that data itself, from users' accept/reject actions and their corrections.

### Cited Findings

**How well general agents edit today (the key benchmark)**
- Timeline-Bench (arXiv 2609.35143, 28 Sep 2026) has 56 real tasks that turn raw production material into a finished video: picking dialog takes, shaping interviews into a story, cutting commercials. A quality test is calibrated on 2,582 blind judgments from 43 professional editors. — [arXiv](https://arxiv.org/html/2609.35143v1)
- It tested 16 agents (frontier models in Codex, Claude Code and OpenCode). The best, "GPT-6 Astra in Codex with curated editorial guidance", solved 15/56 tasks (26.8%). Next were Claude Opus 5 in Claude Code at 23.2% and GPT-6 Astra in Codex/OpenCode at 21.4%. The average agent solved 14.0%. Confidence intervals are about ±11 points, so the top agents "cannot be told apart". — [arXiv](https://arxiv.org/html/2609.35143v1)
- Human editors preferred the reference (human) edit in 83.5% of judgments. Of the 771 failed runs, 562 failed *only* the quality test. The authors' diagnosis: "agents perceive footage through stills and transcripts and check their renders for defects, not craft." Median runtime was 16–61 minutes per run. — [arXiv](https://arxiv.org/html/2609.35143v1)
- Adding "curated editorial guidance", meaning a better prompt or skill, helped the top agent. So harness and prompt work matters, not only weights. — [arXiv](https://arxiv.org/html/2609.35143v1)

**Other agentic-editing research and benchmarks (2025–2026)**
- VEdit-Bench (Auto-Director, Oct 2026), a benchmark for the "full lifecycle of autonomous video editing". — [arXiv 2610.28346](https://arxiv.org/html/2610.28346v1)
- "Unified Agentic Video Editing Across Levels of Complexity and Creativity" (2026). — [arXiv 2609.12769](https://arxiv.org/html/2609.12769v1)
- Traceable multi-agent workflows for long-form editing (Jul 2026). — [arXiv 2606.07636](https://arxiv.org/html/2606.07636v2)
- EditDuet: Editor plus Critic LLM agents for non-linear editing (SIGGRAPH 2025). — [ACM](https://dl.acm.org/doi/10.1145/3721238.3730761)
- An RL-based automatic video editing method. — [arXiv 2411.04942](https://arxiv.org/html/2411.04942)
- AutoCut, end-to-end ad editing that predicts video/text/audio tokens. — [arXiv 2603.28366](https://arxiv.org/html/2603.28366v1)
- "From Long Videos to Engaging Clips" (human-inspired clipping; it cites the AVE "anatomy of video editing" dataset). — [arXiv 2507.02790](https://arxiv.org/html/2507.02790v1)

**Highlight and moment detection (the "find the good bits" sub-task, where VLM fine-tuning is well established)**
- QVHighlights has about 10K videos with natural-language queries for moment retrieval and highlight detection. — [OpenReview](https://openreview.net/forum?id=tfBBt_q4nHT), [GitHub](https://github.com/jayleicn/moment_detr)
- TempSamp-R1 (NeurIPS 2025) uses reinforcement fine-tuning for temporal grounding. — [NeurIPS](https://papers.neurips.cc/paper_files/paper/2025/file/39da069a3e1baa8139b62d6603d37979-Paper-Conference.pdf)
- TVHighlights (CVPR 2026) trains highlight detection with LLM guidance and no human labels. — [CVF](https://openaccess.thecvf.com/content/CVPR2026/papers/Qiu_TVHighlights_LLM-Guided_Human-Free_Collaborative_Training_for_Video_Highlight_Detection_in_CVPR_2026_paper.pdf)
- SVHighlights covers sports videos averaging 2 hours. — [HF](https://huggingface.co/papers/2606.06926)
- An MLLM frame-segmentation approach to moment/highlight detection. — [arXiv 2512.12246](https://arxiv.org/html/2512.12246v1)

**Pixel-level (video-to-video) editing datasets and models. These are a different problem from edit decisions.**
- InsViE-1M (ICCV 2025), instruction-based video editing. — [CVF](https://openaccess.thecvf.com/content/ICCV2025/papers/Wu_InsViE-1M_Effective_Instruction-based_Video_Editing_with_Elaborate_Dataset_Construction_ICCV_2025_paper.pdf)
- RefVideo-6M, with 5M video pairs. — [arXiv](https://arxiv.org/html/2608.26101v1)
- JoyAI-Video-Edit, a 16B autoregressive diffusion model for real-time editing. — [HF](https://huggingface.co/papers/2608.03974)
- Netflix built a layered video dataset from open-source videos plus human annotation, for controllable AI editing. — [Netflix Tech Blog](https://netflixtechblog.com/toward-more-controllable-ai-video-editing-an-early-research-exploration-at-netflix-eb8160ed60a2)

**Commercial specialized models**
- **Runway Aleph** (Jul 25, 2025) is an "in-context video model" that retextures or replaces objects in existing footage. Aleph 2.0 adds keyframe-guided control. On the API it costs 28 credits per second of video (56-credit minimum). — [Runway Research](https://runway.com/research/introducing-runway-aleph), [Aleph 2.0](https://runway.com/product/aleph-2), [Runway API](https://dev.runwayml.com/endpoints/video_to_video)
- **OpusClip ClipAnything** (2024) is a multimodal model that looks beyond transcripts to find clips from a natural-language prompt. It launched with the $30M funding announcement. — [OpusClip blog](https://www.opus.pro/blog/opusclip-celebrates-30m-in-funding-and-the-launch-of-clipanything), [yespress](https://yespress.io/opusclip)
- **OpusClip 4.0** (early Nov 2026) adds whole-video auto-edit, "Recipes", "Viral Hook", "AI Producer", and an MCP server plus Skill so outside AI agents can call OpusClip. — [OpusClip 4.0 blog](https://www.opus.pro/blog/opusclip-4-0), [OpusClip changelog](https://opusclip.canny.io/changelog/run-opusclip-from-your-ai-agent-mcp-and-skill-now-available-in-beta)
- **Independent quality check on OpusClip** (a competitor's test, so possibly biased):
  - 76 clips from 6 videos: 47 publishable as-is, 19 needed light editing, 10 unusable.
  - 4 of 11 B-roll inserts were contextually wrong.
  - The "virality score" was inversely related to real performance in that sample: the best performer scored 64 and the weakest scored 87.

  — [BIGVU review citing ScaleReach](https://bigvu.tv/blog/opus-clip-tested-2026-where-ai-wins-40-percent-discard/)
- **Captions → Mirage**: rebranded in Sep 2025 to "expand beyond creator tools to AI video research" and build its own generative models. — [TechCrunch](https://techcrunch.com/2025/09/04/captions-rebrands-as-mirage-expands-beyond-creator-tools-to-ai-video-research/), [Mirage about](https://mirage.app/about-us)
- **Descript Underlord** is an "agentic co-editor" that handles rough cuts, filler removal and clips.
  - The Aug 5, 2026 release put **Claude Fable 5 in the Underlord model picker**. A June 2026 update described Claude Fable 5 as able to "analyze footage" to optimize zoom, framing and text.
  - Descript also posted that paid users can use Opus 5.5 in Underlord.
  - So Descript, a category leader, **rents frontier models for its agent brain** rather than fine-tuning its own.

  — [Descript changelog](https://descript.canny.io/changelog/release-round-upaugust-5th-2026), [createwith](https://createwith.com/tool/descript/updates/descript-adds-claude-fable-5-to-underlord-for-video-aware-ai-editing), [Descript on X](https://x.com/descript/status/2102566782590414920), [Descript help](https://help.descript.com/getting-started/underlord-beta-your-ai-co-editor-in-descript)
- A secondary review says Underlord v2 (Jan 2026) cut AI credit use by about 20%. — [aivideos.eu](https://aivideos.eu/blog/descript-review-2026)
- **CapCut** markets an "AI Video Agent" and "AutoCut" agents. — [CapCut AI Video Agent](https://www.capcut.com/features/ai-video-agent), [CapCut AutoCut](https://www.capcut.com/resource/6-most-advanced-autocut-agents)
- **Adobe** launched a "Creative Agent" (Apr 15, 2026), an "Adobe for creativity" connector that brings 50+ tools (incl. Premiere) into Claude (Apr 28, 2026), and a Firefly AI Assistant with Claude integration (Aug 2026). — [Adobe news](https://news.adobe.com/news/2026/04/adobe-new-creative-agent), [Adobe blog](https://blog.adobe.com/en/publish/2026/04/28/adobe-for-creativity-connector), [techresearchonline](https://techresearchonline.com/news/adobe-firefly-ai-assistant-claude-integration/)

**Fine-tuning evidence from other domains (what transfers)**
- **Cursor Composer** (Oct 2025):
  - A MoE model specialized "through reinforcement learning (RL) in a diverse range of development environments", with access to Cursor's production tools.
  - It is about 4x faster than similar models. RL rewarded efficient tool use and parallelism.
  - It learned useful behaviors on its own during RL.

  — [Cursor blog](https://cursor.com/blog/composer)
- **Cursor Composer 2** "builds on Kimi 2.5":
  - Training combined continual pre-training, large-scale RL and production feedback loops.
  - Scores: CursorBench 61.3, Terminal-Bench 61.7, SWE-bench Multilingual 73.7.
  - **6–10x lower inference cost** than comparable frontier coding models.
  - RL ran on Fireworks across 3–4 clusters.

  — [Fireworks case study](https://fireworks.ai/customers/cursor-composer-2-reinforcement-learning)
- Composer 2 also runs "real-time RL from production traffic". — [Phil Schmid](https://www.philschmid.de/kimi-composer-context)
- Composer 2.5 shipped May 2026. — [Cursor](https://cursor.com/blog/composer-2-5)
- **Cognition SWE-1.5** (Oct 2025):
  - RL on "a leading open-source base model" inside its own Cascade agent harness.
  - Served at up to 950 tok/s on Cerebras, which is 6x faster than Haiku 4.5 and 13x faster than Sonnet 4.5.
  - Cognition: "the quality of the coding environments in RL tasks is the most important factor for downstream model performance." Grading used classical tests plus rubrics.
  - Model and harness were co-optimized through dogfooding. SWE-1.6 followed in Apr 2026.

  — [Cognition blog](https://cognition.com/blog/swe-1-5), [SWE-1.6](https://cognition.com/blog/swe-1-6)
- **Bridgewater + Thinking Machines** (Jun 2026):
  - Fine-tuned Qwen3-235B on Tinker for 6 financial document-triage tasks.
  - Frontier models reached about 78% with expert prompting (about 50% with naive prompts). The fine-tune reached 84.7% at **13.8x lower cost per task**.
  - "Dataset quality was the first bottleneck." Noisy vendor labels were fixed by sending only contested examples to human experts.
  - Method: on-policy distillation plus RL.

  — [AlphaSignal](https://alphasignal.ai/news/bridgewater-s-fine-tuned-model-beats-gpt-claude-and-gemini-at-13-8x-lower-cost)
- **A $500 RL fine-tune of a 9B open model** beat frontier models on catalog review (HN, 342 points). A top counterpoint in the comments: for small workloads, "why wouldn't you just pay $19 to gemini API instead of $500 + time." — [Hacker News](https://news.ycombinator.com/item?id=49078454)
- OpenPipe customer cases (2024) show fine-tuned small models beating GPT-3.5/GPT-4-class models on narrow formatting and extraction tasks, and cutting a prompt's cost by 50x. These cases are old and predate today's cheaper frontier models. — [OpenPipe](https://openpipe.ai/blog/a-non-technical-explanation-of-fine-tuning), [dev.to](https://dev.to/experilearning/fine-tuning-llms-to-process-massive-amounts-of-data-50x-cheaper-than-gpt-4-4a1d)
- A 2026 survey of frontier-lab practice: "Distillation from a strong reasoner is cheaper and often better per dollar than RL from scratch." — [J. Zhang blog](https://jxzhangjhu.github.io/blog/2026/how-frontier-labs-train-llms/)
- RLVR (RL with verifiable rewards) works best "on problems with clear rewards". — [arXiv 2609.28765](https://arxiv.org/html/2609.28765v1)

**Tooling and costs**
- Thinking Machines **Tinker** is an API for fine-tuning open-weight models, generally available since Dec 2025, with vision input and Kimi K2 support. — [Tinker](https://thinkingmachines.ai/tinker/), [TML GA post](https://thinkingmachines.ai/news/tinker-general-availability/)
- Training Qwen3-8B on Tinker costs $0.40 per million tokens, rising to $0.44 after Jul 17, 2026. — [Beam](https://www.beam.cloud/blog/tinker-model-pricing), [DataCamp](https://www.datacamp.com/tutorial/tinker-tutorial)
- Fireworks provides RL rollout and inference infrastructure (it is Cursor's provider). — [Fireworks](https://fireworks.ai/customers/cursor-composer-2-reinforcement-learning)
- AWS SageMaker offers multi-turn agent RL. — [AWS blog](https://aws.amazon.com/blogs/machine-learning/fine-tune-a-search-agent-with-multi-turn-rl-on-amazon-sagemaker-ai/)

### Inferences
- **What "fine-tuned for video editing" would actually mean.** Not a brand-new LLM. More likely one of these:
  - (i) A small or medium VLM fine-tuned for highlight, hook and "dead-air" detection. This is well-trodden research and cheap to run per minute.
  - (ii) An open agent model (Kimi K2.x / Qwen3.5-VL / GLM) RL-tuned inside *your* editing harness (timeline JSON tools, ffmpeg render, preview). The reward would combine verifiable checks with a learned taste judge.
  - (iii) Pixel models. Leave those to Runway, Mirage and ByteDance, or call them through an API.
- **Rewards you can verify automatically, for RLVR:**
  - no cuts mid-word or mid-sentence (check word timestamps)
  - hitting a target duration
  - no black frames or audio pops
  - captions in sync
  - subject in frame after reframing (face/pose detector)
  - loudness normalized
  - brief requirements met (e.g., "include the product shot")

  Taste (pacing, story, hook strength) needs a reward model. You would train that on human pairwise preferences (Timeline-Bench used 2,582 editor judgments) or on downstream signals: retention, accept/reject, how much the user re-edits.
- **Possible data sources:**
  - (1) Your own users' accept/reject/undo/trim-adjust logs. This is the best source, and it is proprietary.
  - (2) Before/after pairs where creators upload both raw and final versions (opt-in and licensing required).
  - (3) Distillation: run Opus/Fable or GPT-6 with heavy prompting, keep only edits that pass checks and human review, then train a smaller model on them.
  - (4) Public highlight datasets (QVHighlights etc.) for perception.
  - (5) Scraping YouTube for before/after pairs is legally risky and rarely includes the raw footage. I found no public EDL corpus of real human edit decisions at scale.
- **When fine-tuning makes sense.** It is a scale and latency play. At low volume, frontier APIs win on time-to-market (the HN counterpoint). Fine-tuning pays off once (a) you have tens of thousands of graded edits and (b) inference spend or latency hurts. That is exactly how Cursor and Cognition sequenced it: both built the product on frontier APIs first.
- **The case against fine-tuning now:**
  - Frontier models improve every few months. Composer-style work needs RL infrastructure and an ML team.
  - Timeline-Bench's failure mode is partly *perception* (stills plus transcripts). Better perception tools, like native video input and audio-energy or motion features, might help more than tuning weights.
  - Better prompts and skills ("curated editorial guidance") measurably helped.

### Gaps
- I did not verify which in-house models Descript runs for audio (Overdub / Studio Sound) or how they were trained. I also did not find the model architecture or training data behind OpusClip's ClipAnything or Mirage's editing models (proprietary).
- I found no open model publicly fine-tuned on human edit decisions or EDLs, and no large open EDL dataset. AVE ("anatomy of video editing") is a related research dataset, but I did not verify its scope.
- I did not find specific CapCut/ByteDance research papers on edit-decision models in this pass. Google/Meta editing models (Veo editing, Movie Gen Edit) were not checked.
- Timeline-Bench's per-run dollar costs exist (its Appendix H.3) but I did not extract them.

---

## 2. Unit economics: Claude subscriptions vs API, subsidies, cost per edited minute, open-model pricing, Agent SDK terms

### Takeaway
Claude Code subscriptions are heavily discounted compared with API list prices. Estimates run from about 7x (median user) to 13x (team average) to 15–30x or 50x (heavy users). But Anthropic's terms **forbid a third-party product from using its users' Claude subscriptions**. A product must pay API rates. Since Oct 7, 2026, Max, Ultra and Team subscribers get a monthly API credit ($100 Max / $200 Ultra / up to $500 Team pooled) that covers the API and Agent SDK, not Claude Code. Open models on OpenRouter cost roughly 5–40x less per token than Opus-class models. A fine-tuned open model is therefore mainly a gross-margin lever, not a quality lever.

### Cited Findings

**Is Claude Code subsidized?**
- Upbound measured its 20 engineers' June 2026 Claude Code usage at list API prices: from under $10 to $6,470 per person, more than 90% of it Opus (mostly 4.8). Against a $125 Team Premium seat that is about **13x on average, about 7x for the median engineer, and 52x for the heaviest**. — [Upbound](https://www.upbound.io/blog/anthropic-is-subsidizing-our-ai-coding-at-13x.-how-long-will-it-last)
- SemiAnalysis (Oct 5, 2026): subscription plans "are highly subsidized", but they still make sense as customer acquisition. Subscriptions are about 10% of Anthropic revenue but have a large effect on margin and revenue per MW. The value of the $200 plan depends on the model and workload. Public pressure has "forced Anthropic to repeatedly walk back planned subscription nerfs." — [SemiAnalysis](https://newsletter.semianalysis.com/p/anthropic-subscriptions-offer-5x)
- **Counter-view** (Martin Alderson, Mar 2026):
  - API list price is not Anthropic's cost. OpenRouter hosts serve comparable open models at about 10% of Anthropic's prices (Kimi K2.5 at $0.45/$2.25 vs Opus 4.6 at $5/$25).
  - So a heavy user's "$5,000" of API-equivalent usage might cost Anthropic about $500.
  - The average Claude Code developer uses about $6/day in API-equivalent spend (90% under $12/day). That is about $18/month of real compute against a $20–200 subscription.
  - "The $5,000 figure… is roughly correct" for *Cursor*, which pays near-retail API prices.

  — [martinalderson.com](https://martinalderson.com/posts/no-it-doesnt-cost-anthropic-5k-per-claude-code-user/)
- An engineer's analysis (via The New Stack) puts Agent SDK subscription usage at roughly 15–30x the equivalent API cost. — [The New Stack](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)
- Unverified, low-quality social media claims: "$7,800 per $200 subscription" ([Reddit](https://www.reddit.com/r/ClaudeAI/comments/1u39y1c/subscription_plans_are_massively_subsidized/)) and "Anthropic is burning $19B/year" ([LinkedIn](https://www.linkedin.com/posts/mashhoodr_the-true-cost-of-claude-code-paper-compute-activity-7430476446076231681-27pW)).

**Rate-limit and plan changes, 2025–2026**
- May 6, 2026: Anthropic doubled Claude Code's 5-hour rate limits for Pro, Max, Team and seat-based Enterprise, and raised API rate limits for Opus. This was tied to a SpaceX Colossus 1 compute deal (300+ MW, 220,000+ NVIDIA GPUs). — [Anthropic](https://www.anthropic.com/news/higher-limits-spacex)
- A temporary 50% weekly-limit boost ended Sep 13, 2026. From Sep 14, 2026, weekly Claude Code limits sit permanently 25% above the pre-May level. — [ClaudeDevs on X](https://x.com/ClaudeDevs/status/2093742321473065266), [Morph](https://www.morphllm.com/claude-code-usage-limits)
- Plan prices: Pro $20, Max 5x $100, Max 20x $200, Team $20–125 per seat. — [Superblocks](https://www.superblocks.com/blog/claude-code-pricing)

**Can a product run on its users' Claude subscriptions? No.**
- Official Claude Code docs:
  > Developers building products or services that interact with Claude's capabilities, including those using the Agent SDK, should use API key authentication… Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens.

  The same docs say advertised limits "assume ordinary, individual usage of Claude Code and the Agent SDK." — [Claude Code legal & compliance](https://code.claude.com/docs/en/legal-and-compliance)
- Enforcement timeline:
  - **Policy dates to Feb 2024.** It was enforced in early 2026 against OpenClaw and OpenCode-style harnesses using subscription OAuth.
  - **May 13–14, 2026:** Anthropic announced that from June 15, programmatic and Agent SDK usage would get its own budget, billed at API rates. — [The Register](https://www.theregister.com/ai-ml/2026/05/14/anthropic-tosses-agents-into-the-api-billing-pool/5240748), [VentureBeat](https://venturebeat.com/technology/anthropic-reinstates-openclaw-and-third-party-agent-usage-on-claude-subscriptions-with-a-catch), [MindStudio](https://www.mindstudio.ai/blog/anthropic-openclaw-ban-oauth-authentication)
  - **June 15, 2026:** paused on the day it was due to take effect. — [The New Stack](https://thenewstack.io/anthropic-pauses-claude-agent-sdk-subscription-change/)
  - **Oct 7, 2026 (current state):** Max, Ultra and Team plans include monthly Claude API credits: $100 (Max), $200 (Ultra), $20 per Standard / $100 per Premium Team seat (pooled, up to $500 per the docs summary). The credits cover the Claude API, Managed Agents, the Agent SDK and the playground. They do **not** cover Claude Code. No rollover. — [Claude Platform docs](https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers), [developersdigest](https://www.developersdigest.tech/blog/claude-max-team-monthly-api-credits-2026)
  - A Reddit PSA claims the Agent SDK and `claude -p` "still work with subscription limits" after Oct 7. That fits the June pause, but **for a product serving other people the legal-docs prohibition above is what counts**. — [Reddit](https://www.reddit.com/r/ClaudeAI/comments/1x0j9g9/psa_anthropics_october_7_update_is_actually_good/)

**Live OpenRouter prices (GET openrouter.ai/api/v1/models, fetched 2026-11-07; USD per 1M input / output tokens)** — [OpenRouter API](https://openrouter.ai/api/v1/models)

*Frontier models:*

| Model | Input $/1M | Output $/1M | Notes |
|---|---|---|---|
| anthropic/claude-fable-5.1 | 10 | 50 | batch 5 / 25 |
| anthropic/claude-opus-5.5 | 4 | 20 | batch 2 / 10 |
| anthropic/claude-sonnet-5.5 | 2 | 10 | |
| anthropic/claude-haiku-5.5 | 0.10 | 0.50 | |
| openai/gpt-6-astra | 10 | 50 | |
| openai/gpt-6-sol | 2 | 10 | |
| openai/gpt-6-luna | 0.10 | 0.50 | |
| google/gemini-3.6/3.7/3.8-flash | 0.75 | 3.75 | native video + audio input |
| google/gemini-3.1-flash-lite | 0.25 | 1.50 | native video input |

*Open-weight models:*

| Model | Input $/1M | Output $/1M | Notes |
|---|---|---|---|
| moonshotai/kimi-k2.5 | 0.50 | 2.50 | text + image |
| moonshotai/kimi-k2.6 | 0.65 | 3.41 | |
| moonshotai/kimi-k3.1-pro | 2 | 10 | text + image + video |
| moonshotai/kimi-k3 | 0.192 | 16 | anomalous; its batch price is 2.28 / 11.40, so treat as a data quirk |
| qwen/qwen3-vl-30b-a3b-instruct | 0.15 | 0.60 | |
| qwen/qwen3-vl-235b-a22b-instruct | 0.21 | 1.90 | |
| qwen/qwen3.5-122b-a10b | 0.26 | 2.08 | video input |
| deepseek/deepseek-v4-flash | 0.09 | 0.18 | text |
| minimax/minimax-m3 | 0.30 | 1.20 | video input |
| meta-llama/llama-4-maverick | 0.35 | 1.00 | |

**What competitors charge (price anchors)**
- OpusClip: Starter $15/month, Pro $29/month (or $14.50/month billed yearly). About 1 credit per minute of *source* video: "A 45-minute video costs 45 credits whether you keep 5 clips or 25." — [BIGVU](https://bigvu.tv/blog/opus-clip-tested-2026-where-ai-wins-40-percent-discard/), [openshorts](https://www.openshorts.app/opus-clip-pricing)
- Runway Aleph API: 28 credits per second of output video. — [Runway API](https://dev.runwayml.com/endpoints/video_to_video)

**ESTIMATE: LLM cost per source minute for an agentic edit (my own model, not sourced)**
- *Assumptions:*
  - A 10-minute talking-head source.
  - Word-level transcript JSON of about 15k tokens.
  - About 300 sampled frames at about 450 tokens each (about 135k tokens).
  - An agent loop of 20–40 turns that re-reads context: about 2M input tokens total, about 85% of them cache reads, plus about 50k output tokens.
- *Results:*
  - **Opus 5.5** ($4/$20; cache reads assumed at about 10% of the input price): about $1.20 uncached input + $0.70 cached + $1.00 output ≈ **$3 per 10-minute source, or about $0.30 per source minute**.
  - **Kimi K2.6** ≈ $0.04–0.06 per source minute.
  - **Qwen3-VL-30B** ≈ $0.01 per source minute.
- *Caveats:*
  - These are ±3x ranges. Iterations, re-renders, and long timelines (Timeline-Bench runs took 16–61 minutes of agent time) can multiply the cost several-fold.
  - Rendering, transcription and GPU pixel models (Aleph-style) cost extra and can dominate.

### Inferences
- **The Claude Code subsidy is not an asset your startup can own.** Your product pays API (or open-model) prices. The subsidy actually works *against* you: a creator with a $200 Max plan can edit in Claude Code with free tools (e.g., "video-use" skills, Premiere skills, the Adobe connector) at a marginal cost close to zero. — [explainx video-use](https://explainx.ai/blog/video-use-claude-code-ai-video-editor-guide-2026), [premiere-ai-skills](https://github.com/stefanwebb/premiere-ai-skills)
- **A way to turn that into an advantage:** ship an MCP server or Skill so the user's own Claude subscription pays for reasoning, while you charge for what Claude can't do (rendering, pixel models, asset library, review links, publishing). OpusClip 4.0 did exactly this with its MCP plus Skill. It is legal under the terms above, because the user runs Claude Code themselves and you never touch their credentials. But it makes you a tool *inside* someone else's agent.
- **Margin math, simple version.** At about $0.30 per source minute on Opus, a $29/month plan that includes about 300 source minutes could spend about $90 on LLM costs alone. That is negative gross margin. On a fine-tuned open model (about $0.01–0.06 per minute) LLM cost drops to $3–18. That 5–30x gap is the honest economic case for fine-tuning a cheap model. The same gap explains Cursor's Composer 2 ("6–10x lower inference cost").
- **Mitigations short of fine-tuning:**
  - route between models: cheap VLM or Gemini Flash-Lite with native video for perception and highlight scoring, frontier model only for planning
  - prompt caching
  - batch pricing (about 50% off)
  - charging per source minute, as OpusClip does

### Gaps
- I found no first-party Anthropic figure for compute cost per subscriber. All subsidy multiples are third-party estimates computed against *list* prices, not cost.
- Haiku 5.5 at $0.10/$0.50 and the Kimi K3 split pricing look unusual. They were not cross-checked against first-party price pages.
- I did not find published per-minute LLM costs from any video-editing company. The cost-per-minute figures above are my estimate only.
- Fireworks, Together and OpenPipe fine-tuning/serving prices for Kimi/Qwen were not pulled in this pass (Tinker pricing only).

---

## 3. Competitive landscape and moats (funding/ARR, acquisitions, investor views, platform risk, Cursor vs Claude Code lessons)

### Takeaway
AI video is a large, fast-growing market. Avatar and generation players (HeyGen, Synthesia, Runway) are at $150–300M ARR and $4–5B valuations. Editing and clipping tools (Veed, OpusClip, Descript, Captions/Mirage) are at about $50M ARR each. Small, efficient players (Submagic, Kapwing) are at about $8–10M.

The incumbents are all moving to "agentic editing". Anthropic and Adobe have made Premiere controllable from Claude. So "an LLM plus ffmpeg" is not a moat.

The Cursor story shows the path: build on frontier APIs, then RL-train your own model on an open base (Kimi) using production data, while owning distribution and the workflow. That path produced a $60B exit. But it took $4B ARR, and the company kept depending on frontier labs while also competing with them.

### Cited Findings

**Funding and ARR (labels: company-stated vs third-party estimate)**

*Generation and avatar players:*
- **HeyGen:** "Doubles to $200M ARR in eight months" (company blog, Jun 25, 2026). — [HeyGen](https://www.heygen.com/blog/heygen-surpasses-200m-arr)
  - Sacra *estimate*: $205M in Jun 2026, up from $123M at end-2025. — [Sacra](https://sacra.com/c/heygen/)
- **Synthesia:** $200M Series E at $4B valuation (Jan 26, 2026), led by GV with NVentures. $150M ARR, expecting to pass $200M in 2026. — [CNBC](https://www.cnbc.com/2026/01/26/nvidia-alphabet-vc-arms-back-synthesia.html), [TechCrunch](https://techcrunch.com/2026/01/26/synthesia-hits-4b-valuation-lets-employees-cash-in/)
- **Runway:** $315M Series E at $5.3B (Feb 10, 2026), led by General Atlantic. — [TechCrunch](https://techcrunch.com/2026/02/10/ai-video-startup-runway-raises-315m-at-5-3b-valuation-eyes-more-capable-world-models/), [Crunchbase News](https://news.crunchbase.com/venture/gen-ai-video-startup-unicorn-runway-seriese-raise/)
  - ARR *estimates conflict*: Sacra says $200M (Aug 2026, from $96M at end-2025); morphed.app says $300M. — [Sacra](https://sacra.com/c/runway/); [morphed](https://morphed.app/stats/runway-statistics)

*Editing and clipping players:*
- **Mirage (Captions):** $75M growth financing from General Catalyst's Customer Value Fund (Mar 24, 2026). Total funding over $175M, 20M+ users, 250M+ videos created. The goal is to expand "into agentic video editing".
  - CEO's moat view: "AI has made building dramatically faster and easier… Quality is still paramount, but it's no longer enough. Going forward, the companies that win acquire customers efficiently and grow fast."
  - Earlier: $60M Series C at $500M valuation (Jul 2024).

  — [Captions blog](https://captions.ai/blog/announcing-mirages-usd75m-growth-financing-with-general-catalyst), [Index Ventures](https://www.indexventures.com/perspectives/captions-raises-60m-in-series-c-funding-to-invest-in-generative-video-research/)
- **OpusClip:** "$50M+ ARR with 20M users and 300K paying customers" (per arr.club, citing the CEO). $20M Series A in Mar 2025, about $37M raised in total. Earlier: $20M ARR about 18 months in. — [arr.club](https://www.arr.club/signal/opusclip-hit-50m-arr-with-20m-users-turning-long-video-into-shorts), [Latka](https://getlatka.com/companies/opus.pro), [readthesignal](https://readthesignal.co/p/perplexity-hit-100m-revenue-how-opus)
- **Veed:** Sacra *estimate* $50M ARR (May 2026), up from $45M in Oct 2025. Stripe says Veed passed $40M ARR from about 200K subscribers by June 2025. About 85% of revenue comes from AI features (LinkedIn post by an analyst). — [Sacra](https://sacra.com/c/veed/), [Stripe](https://stripe.com/customers/veed), [LinkedIn](https://www.linkedin.com/posts/timothe-frin-547ba064_85-of-veedios-revenue-comes-from-ai-features-activity-7391814358760181760-ly7e)
- **Descript:** Sacra *estimate* $55M ARR (Sep 2025). About $100–104M raised, the last round being a $50M Series C led by the OpenAI Startup Fund (Nov 2022) at about $550M. — [Sacra](https://sacra.com/c/descript/), [Goodwin](https://www.goodwinlaw.com/en/news-and-events/news/2022/11/11_30-descript-raises-50-million-series-c), [multiples.vc](https://multiples.vc/private-comps/descript)
- **Submagic:** $8M ARR (Jun 2025), bootstrapped, 13 employees. Hit $1M ARR in 90 days. Growth came through affiliates (30% commission) and UGC creators. — [Latka](https://getlatka.com/companies/submagic.co), [Founderpath](https://founderpath.com/resources/david-zitoun-submagic-bootstrapped-8m-arr-affiliates)
- **Kapwing:** "around $10M in ARR" as of 2026 (founder interview). $12.7M raised. — [IndieHustle](https://www.indiehustle.co/p/from-a-meme-maker-to-10m-arr-how), [Latka](https://getlatka.com/companies/kapwing)
- **CapCut:** "$815M in 2025" (LinkedIn post; *weak source*). It is ByteDance's second app to pass $100M in consumer spending. — [LinkedIn](https://www.linkedin.com/posts/earlystartupdays_capcut-is-free-no-ads-no-paywall-to-start-activity-7450070692857024512-ceLK), [TechCrunch 2023](https://techcrunch.com/2023/10/16/bytedances-video-editor-capcut-targets-businesses-with-ai-ad-scripts-and-ai-generated-presenters/)

*YC startups:*
- **Cardboard** ("agentic video editor… power of Premiere Pro or DaVinci Resolve without the learning curve", Feb 2026), **Vyra** ("personal video editing agent for shortform"), and **Palmier Pro** ("a video editor built for AI, where Claude and Codex can edit your timeline directly"). — [Launch YC Cardboard](https://www.ycombinator.com/launches/PM3-cardboard-agentic-video-editor), [YC launches](https://www.ycombinator.com/launches?ref=nocode.au), [YC content](https://www.ycombinator.com/companies/industry/content)
- Tracxn counts 48 new "automated video editing" startups founded in 2026 so far. — [Tracxn](https://tracxn.com/d/trending-business-models/startups-in-automated-video-editing/__tAuaOcK4o5YxCPZc05pvxr3I2tucoUTslKBzkeT9cgM)

**Platform risk**
- **Anthropic, "Claude for Creative Work" (Apr 28, 2026):** connectors for Adobe for creativity (50+ tools including Premiere), Blender, Ableton, Affinity by Canva, Autodesk Fusion and Resolume. Plus Claude Design (Apr 17, 2026). — [Anthropic](https://www.anthropic.com/news/claude-for-creative-work), [Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs)
- **Adobe** is bringing its tools to ChatGPT, Claude, Copilot and Gemini (Jun 2026). — [Adobe](https://news.adobe.com/news/2026/06/adobe-unveils-major-expansion)
- **CapCut** ships a free AI Video Agent. — [CapCut](https://www.capcut.com/features/ai-video-agent)
- **OpusClip and Descript** both moved to whole-video agentic editing in 2026. — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0), [Descript](https://www.descript.com/underlord)

**Cursor vs Claude Code (the analogy for your situation)**
- Cursor's growth: $2B annualized revenue (Feb 2026) → $3B (late Apr) → $4B (Jun 2026). — [Dealroom](https://dealroom.co/news/134107-cursor-tops-4b-annualized-revenue/), [MLQ](https://mlq.ai/news/ai-coding-startup-cursor-reaches-2-billion-arr/)
- SpaceX agreed to acquire Anysphere/Cursor for $60B in stock on Jun 16, 2026. The deal completed in Aug 2026. — [CNBC](https://www.cnbc.com/2026/06/16/spacex-spcx-cursor-acquisition-ipo.html), [Reuters](https://www.reuters.com/legal/transactional/spacex-buy-anysphere-60-billion-2026-06-16/), [Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/spacex-completes-record-60-billion-131311785.html)
- Cursor moved part of its workload onto its own RL-trained models built on Kimi (Composer 2) to cut inference cost 6–10x. — [Fireworks](https://fireworks.ai/customers/cursor-composer-2-reinforcement-learning)
- Martin Alderson argues Cursor's core problem is paying retail API prices for Anthropic models that users still prefer ("brand awareness… genuinely better… for now"). Anthropic, meanwhile, serves Claude Code at cost. — [martinalderson.com](https://martinalderson.com/posts/no-it-doesnt-cost-anthropic-5k-per-claude-code-user/)
- Unverified social claims: Claude Code "matched Cursor's $2.7B ARR in months" and Cursor ran "-23% gross margin". — [LinkedIn](https://www.linkedin.com/posts/rubendominguezibar_claude-code-launched-and-nearly-matched-cursors-activity-7453334862154981378-BwgI)

**Investor frameworks on AI-app moats**
- a16z "Notes on AI Apps in 2026" (Jan 2026):
  - Areas that favor AI apps are "domains that benefit from being multi-model, cornered data resources, network products and ecosystems with a lot of feature surface."
  - It cites Karpathy's "thick" AI apps (multi-model orchestration, an autonomy slider, context engineering).
  - Startups generated more than $1B of new revenue in 2025.

  — [a16z](https://a16z.com/notes-on-ai-apps-in-2026/)
- a16z Big Ideas 2026: "the collaboration layer becomes the moat" (network effects). — [a16z Big Ideas](https://a16z.com/newsletter/big-ideas-2026-part-1/)
- a16z GPs on AI moats: "19 out of 20 AI startups building the same thing will die." — [a16z video](https://www.youtube.com/watch?v=fgzr3PhzIMk&vl=en)
- Distribution and growth playbooks drove the editing winners:
  - Submagic: affiliates plus UGC creators. — [Founderpath](https://founderpath.com/resources/david-zitoun-submagic-bootstrapped-8m-arr-affiliates)
  - OpusClip: paid people to use its first product, then a single feature found product-market fit. — [yespress](https://yespress.io/opusclip)
  - Mirage: raised from General Catalyst's "Customer Value Fund", a fund that finances customer acquisition. — [Captions blog](https://captions.ai/blog/announcing-mirages-usd75m-growth-financing-with-general-catalyst)

### Inferences
- **Moats ranked for an AI video editor (strongest first):**
  1. **Distribution and brand with creators.** Every editing winner grew through virality, affiliates or templates, not model quality.
  2. **Proprietary edit-preference data plus evals.** Accept/reject logs, re-edit diffs, retention outcomes. This is the only input that makes a fine-tuned or RL'd model better than a frontier model on taste, which is where Timeline-Bench says frontier agents fail.
  3. **Workflow and system-of-record.** Asset library, brand kits, team review/approval, multi-platform publishing, analytics loop. a16z's "feature surface" and "collaboration layer".
  4. **Multi-model orchestration.** Cheap perception models, frontier planners and pixel models (Aleph etc.) behind one UX, so no single lab can replicate it just by shipping a model.
  5. **Own fine-tuned model.** A margin and latency moat only after (1)–(3) produce data and volume. On its own it is easy to copy, because the next frontier release may erase the quality gap.
- **On "no single best LLM".** The Timeline-Bench top agents are statistically tied across GPT-6 and Claude, and harness or guidance changes moved results. So treat the LLM as a swappable component. Design for model-routing from day one. The moat is the harness, data and evals, not which LLM you pick.
- **On Kimi.** Fine-tuning Kimi (as Cursor did for Composer 2) is plausible. Kimi K2.5/K2.6 are about 6–8x cheaper than Opus 5.5 per token on OpenRouter, and Tinker supports Kimi. But Kimi K2.x on OpenRouter is listed as text+image only. For video you would still need a perception front end (frame sampling, or Qwen3.5 / Gemini Flash-Lite / MiniMax-M3, which take video input).
- **Platform-risk scenarios:**
  - Anthropic (connectors), Adobe (agent inside Premiere plus Claude), CapCut (free agent) and OpusClip/Descript (agentic edit) cover the generic "prompt → rough cut" use case.
  - A startup is safer in a vertical where taste is specific and data is cornered: e.g., podcasts→shorts for B2B brands, real-estate tours, e-commerce ads with conversion feedback, sports highlights.
  - Or it can be the best tool that every agent calls (the MCP/API strategy).
- **Balanced view.** "Not relying entirely on Claude Code" is achievable through model-routing plus an open-model fallback. But a billion-dollar outcome in this category has historically come from distribution and growth efficiency (HeyGen, Synthesia, Cursor), with own models added later to protect margins.

### Gaps
- I found no recent Descript funding round (2024–2026) or Descript acquisitions in this pass. Its ARR figure is a Sept-2025 estimate.
- I found no AI video-editing acquisitions of note in 2025–2026 beyond the Amazon–Decart rumor (reported via social posts only; unverified, excluded) and Cursor (coding, not video).
- I did not retrieve Sequoia or YC-partner essays specifically on moats in AI video, and only skimmed a16z.
- Reliable CapCut revenue (Sensor Tower or Appfigures primary data) was not obtained. The $815M figure is low-confidence.
- I could not verify Claude Code's standalone ARR from a primary source.
