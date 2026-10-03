# Jev and TypeSafe AI: the company, the Sep 15, 2026 launch, the API, and what happened next

Research date: 2026-10-03. Everything below comes from live sources fetched today. "Jev" is TypeSafe AI's model (speech-to-text wrote it as "Jeff"). TypeSafe AI (typesafe.ai, legally "TypeSafe AI, Inc.") has nothing to do with Lightbend/Typesafe, the Scala company. The company styles its name "TypeSafe". Anything unverified or inferred is labeled as such.

---

## Q1. Who is TypeSafe AI, when did Jev launch, and what did "Introducing System One Models & Jev" argue?

### Takeaway
TypeSafe AI is a San Francisco lab founded in 2024 by ex-OpenAI researcher Diogo Almeida (CEO), Sasha Sheng (COO, ex-Meta/FAIR) and Erik Gafni (CTO). It came out of stealth on **September 15, 2026** with a **$40M seed led by DCVC** and released Jev the same day. On Sep 24, The Information reported the company was in talks to raise $1B+ at a $10B+ valuation. The launch post argues that chat LLMs, tuned with RLHF to please people, are the wrong tool for automation. Its alternative is a "System One model" (named after Kahneman's fast System 1) trained with a new method, RLCD. Such a model returns typed, calibrated, parallel decisions instead of text, at $0.042 per million input tokens with output free and a claimed 70–500 ms response time.

### Cited Findings

#### Company, founders, location, funding
- Legal name: "TypeSafe AI, Inc." — [Terms of use](https://typesafe.ai/legal/terms) (last updated Sep 19, 2026).
- **Diogo Almeida, CEO.** The team page says he "co-invented RLHF and InstructGPT, the methods that lead to ChatGPT and GPT4. Previously, he was at Google Brain." Fun fact: top 30 in League of Legends NA and top 2 in Hearthstone — [TypeSafe team page](https://typesafe.ai/team). The docs say RLHF "was co-invented by Diogo Almeida, cofounder of TypeSafe" and link [his Google Scholar profile](https://scholar.google.com/citations?user=0T4y07QAAAAJ&hl=en) — [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer).
- Diogo posts on X as **@CompleteSkeptic** (~150K followers). Bio: "AI capabilities researcher: co-created RLHF/ChatGPT @ @openai now trying to right the wrong 🤭 (ceo @typesafeai)" — [X profile](https://x.com/CompleteSkeptic).
- **Sasha Sheng, COO.** "An ex-research engineer from Meta/FAIR where she worked on the News Feed, AI Experiences, and AI Research... published work at NeurIPS and ECCV"; won 7 hackathons in 2023 — [team page](https://typesafe.ai/team). On X she is **@hackgoofer**: "Cofounder @typesafeai - all things model capability. Prev: @AIatMeta" — [X profile](https://x.com/hackgoofer).
- **Erik Gafni, CTO.** "A repeat founder (Ravel, multi-modal AI for dna-sequencing), an early employee at two unicorns (Invitae and Freenome), and an inventor with numerous publications and patents" — [team page](https://typesafe.ai/team). On X he is **@EGafni**: "Cofounder and CTO of TypeSafe. Leading the model training and gtm teams" — [X profile](https://x.com/EGafni).
- Team and office: "a close-knit, flat team from OpenAI, Google Brain, Meta/FAIR, Stripe, Airbnb, Plaid, Docker, and more... Our team works in-person five days a week in our San Francisco office near the Embarcadero station" — [team page](https://typesafe.ai/team). Diogo's October HN hiring post: "typesafe ai | ONSITE in SF | basically all forms of engineering (front-end / back-end / infra) help make jev!" — [HN Who is hiring, Oct 2026](https://news.ycombinator.com/item?id=49929657).
- **Funding press release.** Business Wire, dateline "SAN FRANCISCO, September 15, 2026": a "$40 million seed round" led by **DCVC**; the company was founded in 2024; the release names Ke Deng, Chief of Staff, as press contact. Quotes:
  - Almeida: "TypeSafe was founded to pursue an alternative path for AI research, focused on machine-native AI."
  - James Hardiman, DCVC: "TypeSafe is approaching one of the biggest remaining challenges in AI: turning increasingly capable models into technology that developers can reliably build into products at scale."
  - The release also claims Jev delivers "frontier-level intelligence" at "under 100 milliseconds" of latency and is "up to 100 times faster and less expensive" than other frontier models.
  - Source: [Business Wire release via Yahoo Finance](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html).
- Seed valuation: about **$200M** (citing PitchBook) — [AI Weekly summary of The Information](https://aiweekly.co/alerts/the-information-typesafe-in-talks-to-raise-1b-at-10b-valuation-days-after-40m).
- **Mega-round talks.** The Information reported on **Sep 24, 2026** that TypeSafe was "in talks to raise" **$1B+ at a $10B+ valuation**; the round had not closed. The same summary says "Jev hitting 13% of Vercel paid teams within 24 hours of launch" — [AI Weekly / The Information](https://aiweekly.co/alerts/the-information-typesafe-in-talks-to-raise-1b-at-10b-valuation-days-after-40m). Conflict: one aggregator's headline calls the earlier deal a "$200M round", but its body says "a prior funding round at a $200 million valuation". Treat $200M as the seed valuation, not a round size — [huggingnews](https://huggingnews.com/startups/typesafe-raises-1b-at-10b-valuation-a-week-after-200m-round-438abde2).
- Other investors: none besides DCVC are named in the release text I could access — [press release](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html). The team page says only that the company is "backed by top-tier investors" — [team page](https://typesafe.ai/team).
- Online footprint:
  - X **@typesafeai**: created Jan 23, 2026; ~163.9K followers and 141 posts as of Oct 3; bio "An AI lab building intelligence beyond chat." — [X](https://x.com/typesafeai).
  - Hugging Face org "typesafe": 5 members, **0 models**, 5 datasets, 1 space — [HF org](https://huggingface.co/typesafe).
  - GitHub org [typesafe-ai](https://github.com/typesafe-ai): ~1.5K followers. Repos: `skills` (~2.5K stars), `system-one-adapter-python`, `typesafe-sdk-js`, `typesafe-sdk-python`, `WorkflowEvals`, `n8n-nodes-typesafe-ai`, `daggerverse`, and forks of LLaDA and pulumi-clickhouse.
- Website easter eggs: the homepage hides a base64 string that decodes to "TypeSafe AI Intelligence Now" and a base64 copy of Quake III's `Q_rsqrt` fast inverse square root — [typesafe.ai](https://typesafe.ai/) (decoded by me).

#### Exact launch date and the launch itself
- The blog post "Introducing System One Models & Jev" by "Diogo Almeida, founder, TypeSafe" is dated **Sep 15, 2026** — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- Diogo's launch post on X went out **Sep 15, 2026, 18:17 UTC**. Text: "After co-inventing ChatGPT, I kept asking myself: why have superhuman chat models not led to AGI? I've spent the last 2 years in stealth building a new way to train models (RLCD), and a new type of frontier AI model that we are releasing today: Jev • 20-200x faster • 40-400x cheaper (w/ output tokens free) • Frontier composable intelligence optimized for decisions." As of Oct 3 it had ~76.6K likes, ~8.3K reposts and ~39.9M views — [X post](https://x.com/CompleteSkeptic/status/2099925682726002904).
- The Hacker News launch thread reached **1,989 points and 520 comments** — [HN item 49717558](https://news.ycombinator.com/item?id=49717558) (via [HN Algolia API](https://hn.algolia.com/api/v1/search?query=jev&tags=story)).
- Availability at launch: "Our first public model is Jev, available today in early access... Today, we are opening early access and bringing developers off the waitlist as quickly as we can" — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- Lead-up:
  - Two pre-launch essays: "The Bitterest Lesson" (Sep 10, 2026), whose thesis is "doing the right task > data > compute > algorithms" — [blog](https://typesafe.ai/blog/bitterest-lesson); and "Lies, Damned Lies, and Benchmarks" (Sep 11, 2026), against "benchmaxxing" — [blog](https://typesafe.ai/blog/antibenchmaxxing).
  - First public SDK releases: JS v0.5.7 on Sep 11, Python v0.5.7 on Sep 14 — [JS changelog](https://docs.typesafe.ai/sdk/javascript/changelog), [Python changelog](https://docs.typesafe.ai/sdk/python/changelog).
- Early press: The Register (Thomas Claburn, Sep 16) — [The Register](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711); TechCrunch (Tim Fernholz, Sep 18) — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/). TechCrunch quotes Almeida: "We have lightning in a bottle, and yet it is not useful... The problem is we are optimizing for human language... but it's not useful for automation because computers speak a different language."
- Long-form interview: Latent Space podcast "Jev: System One models for Prod, not God", Sep 21, 2026, 2h21m — [Latent Space](https://www.latent.space/p/jev), [Apple Podcasts](https://podcasts.apple.com/us/podcast/jev-system-one-models-for-prod-not-god-with-diogo/id1674008350?i=1000791005427).

#### What the launch post argued (quotable lines)
- Opening question: "Models have been superhuman at chat for years, so where is all the automation?" — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- The definition: "our first System One Model: a new class of frontier models built to make fast, structured decisions that software can use directly." — same.
- The stack: "a new model architecture, parallel sampler for maximum efficiency, and training method we call Reinforcement Learning for Calibrated Decisions (RLCD)." — same.
- The headline claim: "Jev achieves similar levels of intelligence on System One tasks compared to existing LLMs, while being two orders of magnitude faster and more efficient. While Jev gives up string generation, it's optimized for structured outputs and can't hallucinate." — same.
- The one-liner: "Think of Jev as a frontier-intelligence function call: unstructured state in, typed probabilistic decisions out." Followed by: "Extraordinary claims require extraordinary evidence so see below for the receipts. 💅" — same.
- The "Frontiers, Old and New" table, LLMs vs System One + Jev (all from the [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)):
  - **Optimized with:** RLHF/RLVR vs RLCD.
  - **Optimizes for:** human preference or verifiable rewards vs "Calibrated decisions: answers with epistemically honest probabilities on System One tasks."
  - **Inputs:** an emphasis on "sequential messages" vs on "structured program state".
  - **Outputs:** strings ("chat responses, code, hallucinations, refusals...") that need parsing and validation, vs "Type-safe structured values... defined in advance. The model never makes type errors. All answers are accompanied with calibrated probabilities and confidence scores."
  - **Sampling:** "Sequential. Generates one token at a time" vs "Parallel. Generates all outputs in a single query. Incredibly efficient and hardware-aware."
  - **Cost:** input $0.20–$10/MTok with output "~5x more expensive than input", vs input "$0.042 / MTok ($42 per billion tokens)" with output "FREE (too cheap to meter)."
  - **Speed:** "3 to 329 seconds for frontier models" vs "70ms-500ms for TypeSafe... 40x-200x faster for the same levels of frontier intelligence for System One shaped queries."
  - **Confidence:** LLMs "tend to be overconfident and inconsistent", vs Jev "Always communicates confidence and uncertainty with every output. Calibrated: higher confidence means higher accuracy. More consistent: returns similar answers for similar inputs."
- Use cases pitched for System One models: "AI-Powered Workflows / smart if-statements", "Map-reducing over big data", "Real-time applications. 100ms speeds...", and "Verify everything. Score, judge, verify, guardrail, and detect jailbreaks of LLM prompts, reasoning traces, and/or outputs." LLMs keep human-in-the-loop tasks, verifiable problems and "Demos... prototypes that only work sometimes." — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- Self-disclosed caveats ("Nuance" boxes; [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)):
  - "our published evals are generally run from our laptops on the West Coast (this is where our service is currently based)."
  - "We can't prove it isn't subsidized."
  - The "193.6x faster, 444.6x cheaper" homepage claims "are on the higher end of real world gains."
  - The eval workflows "were made by individuals on our model capabilities team, so some bias could exist."
  - Using GPT-6 Astra and Fable 5.1 as the reference "biases answers towards OpenAI and Anthropic's models."
  - The side-by-side demo was compared with GPT-5.6 Terra.
- Demos ([launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)):
  - **Doom:** Jev plays from game state as a data structure, not images. 10 queries a second "ends up costing ~$7/hour".
  - **Wikiracing.** Fine print: "Jev supports a cardinality up to 255. For the higher cardinality choices, we do a 2 stage-system of scoring independently then making an explicit choice."
- **Kahneman framing (FAQ):** "We were inspired by Daniel Kahneman, Thinking, Fast and Slow... fast, intuitive System 1 thinking and slow, deliberate System 2 reasoning. 'System 1 thinking' has also implied error-prone. For reasons we will get into in the future, we believe System One Models can be made more reliable than its alternatives." — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev). The docs: "Here, the emphasis is on fast, focused judgments." — [System One](https://docs.typesafe.ai/concepts/system-one).
- **The name Jev:** "We named Jev after William Stanley Jevons. We expect machine intelligence to follow a similar path to coal... Every order of magnitude drop in the cost of intelligence unlocks orders of magnitude more use cases." — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- Other FAQ answers, recovered from the page's embedded data ([launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev)):
  - "Is Jev just a smaller LLM? Jev is neither small nor an LLM, hence being off the intelligence Pareto curve."
  - On RLHF: "Every lab optimizes for the same task during [RLHF]: produce the text that a human rater prefers... the wrong task for automation." And: "RLVR... tends to cause spikey / non-robust intelligence."
  - On data: "TypeSafe is primarily a data research lab... We make all the data ourselves. We wouldn't train on your data even if you asked us to (no offense)."
- **Manifesto:** "Composable AI: Build Prod, Not God." Mission: "to pave the shortest path to an AI-based economic revolution by making intelligence composable to catalyze a Cambrian explosion of intelligent software." Also: "Computers can do so much by just branching on bits, imagine if they could also branch on common sense, understanding, and intent." Current AI is compared to "horseless carriages" — [manifesto](https://typesafe.ai/manifesto).
- **Homepage claims:**
  - "193.6x Faster, 444.6x Cheaper. *based on workflows for System One tasks".
  - A side-by-side demo: "Cost $0.000081, Completed in 0.114s" vs LLMs "Cost $0.013880, Completed in 8.566s".
  - "$42 Per Billion input tokens"; "238x Lower input price than Claude Fable 5.1"; "Zero Hallucinations".
  - Source: [typesafe.ai](https://typesafe.ai/).

#### "Decision model" vs classifiers vs LLMs
- **Typesafe's term is "System One model", not "decision model".** "Like an LLM, a System One model understands natural-language input. It returns typed decisions and probabilities rather than generated text... System One models do not write replies, produce code, or generate explanations of their reasoning." — [docs: System One](https://docs.typesafe.ai/concepts/system-one).
- The "decision model" label is Cloudflare's framing: "Jev introduces a new decision model concept into the world of AI — a model that produces bounded structured outputs cheaply, quickly and consistently... capable enough to work over any set of inputs without constantly retraining the model to incorporate new classification categories." — [Cloudflare Clef blog](https://blog.cloudflare.com/clef-decision-models/).
- **Vs a classic classifier:** the label set is defined per request, not baked into training. Jev "is not fine-tuned or LoRA-adapted with customer data... the same weights serve every account. You shape its answers to your domain through the request" (via `state`, `instructions`, `criteria`) — [docs: Models](https://docs.typesafe.ai/models).
- **Vs JSON mode or structured outputs (homepage FAQ):** "Valid JSON gives software a format it can read. But forcing an LLM into that format can leave some of its intelligence on the table. System One Models are trained for structured decisions from the start, returning typed answers with calibrated probabilities." — [typesafe.ai](https://typesafe.ai/).
- **Vs coding-agent LLMs:** "Jev is **not** a drop-in replacement for the LLM behind Claude Code, Cursor, opencode, Copilot..." — [docs: Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents).
- The philosophy: "We call this Machine Native Intelligence: AI with software-like properties such as structure, reliability, observability, testability, speed, consistency, and low cost." The company expects large-scale automation to be "closer to 99% machine-to-machine interactions and 1% human interaction" — [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer).

### Inferences
- "Decision model" became the category name through third parties (Cloudflare, press, clones). Typesafe itself consistently brands the class "System One models" and the API endpoint `/v1/systemone`.
- The funding story moved fast: a $40M seed at about $200M on Sep 15, then reported talks at $10B+ nine days later. The $10B figure is a reported negotiation, not a closed round.

### Gaps
- **Headcount is not disclosed.** Search-result snippets mention "30 employees" or an "11-50" range, but I could not reach the underlying pages (PitchBook returned 403), so treat these as unverified.
- No participating investors beyond DCVC, no angels, no exact incorporation date (beyond "founded in 2024"), and no revenue figures were found in primary sources.
- One more blog post, "AI: too good to be true, too bad to be useful", is linked from the homepage; I did not read it.

---

## Q2. What is Jev technically? (size, architecture, base model, weights, context, modalities, typed probabilistic outputs, determinism, calibration, latency)

### Takeaway
Jev is a **closed, API-only** model. No weights have been released, and the customer agreement bans distillation and reverse engineering. TypeSafe has **not disclosed parameter count, base model or architecture** beyond "new model architecture, parallel sampler" and the claim that it is "neither small nor an LLM". TechCrunch calls it "transformer-based".

The current and only public version is **jev-1.13.0**. It accepts text only (strings, JSON objects or arrays). Each request has a 64K-token budget, but only 32K covers the state plus the longest question. It returns Choice, Score or Noul answers with full probability distributions and a derived confidence, computed in parallel for all questions. TypeSafe claims calibration and "consistency" rather than strict determinism. It claims 70–500 ms latency from a service based on the US West Coast; Cloudflare measured a 524 ms median.

### Cited Findings
- **Weights and access.** Closed API; the HF org lists **0 models** — [HF org](https://huggingface.co/typesafe).
  - The Master Customer Agreement (updated Sep 23, 2026) forbids using "the Services or any Output... to perform model distillation, train a model to imitate the output of the Services, or develop (or to facilitate the development of) a similar or competing product or service." It also forbids reverse engineering "the underlying ideas, algorithms, structure" — [MCA](https://typesafe.ai/legal/mca).
  - "Jev is not trained on customer requests or responses"; zero data retention (ZDR) is offered to enterprise customers — [docs: Models](https://docs.typesafe.ai/models), [docs: Legal](https://docs.typesafe.ai/legal).
- **Architecture (what is public):**
  - "a new model architecture, parallel sampler... and training method we call [RLCD]" — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
  - "Jev is neither small nor an LLM" — same.
  - Homepage FAQ: "Jev replaces sequential generation with parallel computation... Fun fact: the jump from sequential to parallel is similar to that made by the transformer over RNNs" — [typesafe.ai](https://typesafe.ai/).
  - TechCrunch: "a transformer-based model that is not a large language model"; Almeida is "tight-lipped about the model's architecture" — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/).
  - On Latent Space: "I probably shouldn't talk too much about the insides of ML" (00:09:20) — [Latent Space](https://www.latent.space/p/jev).
- **Parameter count and base model:** not disclosed in any TypeSafe source I found (launch post, docs, team page, podcast notes, press release).
- **Weak architecture hint (inference only):** TypeSafe's GitHub org includes a fork of **LLaDA** ("Official PyTorch implementation for Large Language Diffusion Models", forked, last updated Jun 17, 2025) — [github.com/typesafe-ai](https://github.com/typesafe-ai). A fork does not prove Jev is a diffusion model. Community reproductions (including Cloudflare's DiffusionGemma experiment) explored that idea independently — [Clef blog](https://blog.cloudflare.com/clef-decision-models/).
- **Training:**
  - RLCD is "an unpublished technique that optimizes for answers with epistemically honest probabilities" — [Latent Space](https://www.latent.space/p/jev).
  - Data: "100% of our data is synthetic (but not the type of crap that is just spit out from an LLM obviously)... we consider ourselves a data research lab" (Sep 17) — [Diogo on X](https://x.com/CompleteSkeptic/status/2100617775823966680).
  - TechCrunch: trained "exclusively on synthetic data"; Almeida: "We made an early bet that we will be making all of our data, and that has been one of the best bets I've ever made in my life." — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/).
  - The RLCD output contract: "The model does not generate text. It returns decisions and probabilities. Higher probability should correspond to a greater chance that the answer is correct." — [AI primer](https://docs.typesafe.ai/introduction/machine-learning-primer).
- **Version and aliases:** the current model is **Jev 1.13, ID `jev-1.13.0`**. `jev-latest` and `jev-preview` both point to it: "There is no preview build available right now." The docs advise pinning the versioned ID if you have tuned thresholds — [docs: Models](https://docs.typesafe.ai/models).
- **Context window:** "64k tokens per request; 32k tokens for `state` plus the longest question." Jev "ingests the `state` once and evaluates every question against it in parallel" — [docs: Models](https://docs.typesafe.ai/models).
  - Cloudflare's catalog lists Jev at "32,000 tokens" — [Cloudflare docs: Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/).
  - The Clef blog says "64k context window (compared to Jev's 32k)" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/).
- **Modality:** "Text only. String, JSON object, or array of text values. No image, audio, or video input." — [docs: Models](https://docs.typesafe.ai/models). The docs on images, audio and video: "not supported (yet)" — [docs: System One](https://docs.typesafe.ai/concepts/system-one). Cloudflare: "Jev, which only does text classification today" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/).
- **Languages:** "English is the primary training language... Other languages, including CJK scripts, are handled but not equally well" — [docs: Models](https://docs.typesafe.ai/models).
- **How typed answers with probabilities work** (all from the [API reference](https://docs.typesafe.ai/api)):
  - **Choice:** up to 255 options. Returns `choice` (the argmax), `probabilities` (sums to 1) and `confidence`.
  - **Score:** 2–10 ordered levels. Returns `score`, a probability-weighted value "can land between levels", plus `legend`, `probabilities` and `confidence`.
  - **Noul:** returns a single `noul` value from 0 to 1, the probability of "yes".
- **Confidence formula** for a Choice with n options: `confidence = (p_max − 1/n) / (1 − 1/n)`. This is 0 at chance and 1 at certainty, and there is no separate confidence for a Noul — [docs: Confidence](https://docs.typesafe.ai/confidence). On Oct 3 TypeSafe posted: "Confidence is sexy. Calibrated confidence is sexier! We publish our confidence calculations 💅" — [X](https://x.com/typesafeai/status/2106197282274324846).
- **Parallel and isolated questions:** "Every question is evaluated in parallel and in isolation against the same state in one go. Adding questions barely changes the response time... adding more questions does not create context-rot." — [docs: Introduction](https://docs.typesafe.ai/introduction). Example: one cookbook shows a 13-question batch was "12.2x cheaper and 10.0x faster with no change in answers" than separate calls — [cookbooks index](https://docs.typesafe.ai/llms.txt).
- **Determinism (homepage FAQ, "Is Jev deterministic?"):** "Determinism means returning the same result for an identical input. This is less valuable than consistency. We define consistency as making similar decisions when the meaning stays similar, even if the wording changes. Jev is designed for consistency." — [typesafe.ai](https://typesafe.ai/). The jaggedness doc says: "`jev-1.13` is extremely consistent" — [docs: Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
- **Calibration caveat:** "Calibration is measured across groups of predictions; it does not guarantee that an individual answer is correct." — [docs: System One](https://docs.typesafe.ai/concepts/system-one).
  - Structural invariants are not guaranteed. For one ticket, "refund" scored 0.72 and "not_refund" scored 0.47, which sum to 1.19 — [jaggedness doc](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
  - Third-party critiques ("Jev Can't Be Calibrated", "How accurately calibrated is Jev?") exist — [HN search](https://hn.algolia.com/api/v1/search?query=jev&tags=story) (the social-reaction team covers these).
- **"Can't hallucinate" means type safety, not correctness.** Homepage FAQ, "Can Jev still get things wrong?": "Yes. Jev guarantees the shape of its answers, not that every decision is correct. If you provide a list of categories, it can't invent a category outside that list, but it can choose the wrong one." — [typesafe.ai](https://typesafe.ai/). The Register flagged the same issue — [The Register](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711).
- **Known failure modes of jev-1.13** (last reviewed 2026-09-17):
  1. Literal reading.
  2. Math and numbers: "Jev is not a calculator"; it "does not count reliably".
  3. Date and time comparison.
  4. Indirection.
  5. Large state full of irrelevant detail ("Jev suffers from context rot").
  6. Adversarial content: injected instructions "can move the answer".
  7. Contradictory instructions and criteria.
  8. Common-sense structural invariants.
  9. Generation.
  - Source: [docs: Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13).
- **Latency claims and measurements:**
  - TypeSafe: "End-to-end response time is 70ms-500ms" — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev). Press release: "under 100 milliseconds" — [Business Wire/Yahoo](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html).
  - Homepage demo: 0.114 s — [typesafe.ai](https://typesafe.ai/).
  - O*NET dataset: Jev mean **0.141 s per question**, vs 3.18 s for Claude Opus 5 and 2.72 s for GPT-5.6 Sol — [HF dataset.json](https://huggingface.co/datasets/typesafe/evalsafe-onet).
  - Cloudflare's measurement of Jev: **median 524.1 ms, p95 536.0 ms** — [Clef blog](https://blog.cloudflare.com/clef-decision-models/).
  - The community Jev Decision Index notes "Two different clocks: in-process GPU time for the reproductions, an HTTP round trip for Jev" — [Decision Index methodology](https://huggingface.co/spaces/multimodalart/jev-decision-index).
  - Where the service runs: "this is where our service is currently based" (the US West Coast) — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- **Speed-up offer:** "Can you make Jev even faster? Nobody has actually asked us because nobody thinks this is possible... but yes we can." (via sales@typesafe.ai) — [typesafe.ai](https://typesafe.ai/).

### Inferences
- For an edge or CDN audience, Jev's latency includes a network round trip to a West-Coast-based service. Cloudflare's 524 ms median for Jev is probably an HTTP round trip compared against Clef running on Cloudflare's own GPUs, so it is not apples-to-apples. The Clef blog does not state where it measured Jev from.
- Cloudflare's "Jev's 32k" is the narrower budget (state plus longest question). Typesafe's per-request total is 64K. Clef's 64K-vs-32K framing therefore overstates the gap somewhat.
- "Noul" semantics (one yes/no probability) match a Bernoulli trial, which supports the "short for Bernoulli" story below. This is still my inference.

### Gaps
- Parameter count, base model, encoder vs decoder, diffusion vs autoregressive, GPU type and serving regions: **all undisclosed**. Third-party "architecture" guides are speculation.
- I found no official latency SLA or uptime SLA (the status page shows observed uptime only).

---

## Q3. How does the Jev API work? (endpoint, request and response, all field types, "noul", SDKs and integrations, pricing, free tier, rate limits)

### Takeaway
There is one endpoint, `POST https://api.typesafe.ai/v1/systemone`, with Bearer auth. The body has three fields: `state` (string, object or array), `model` (`jev-latest`) and a `questions` map. Each question is one of exactly **three** types: `noul` (yes/no probability), `choice` (pick from a criteria map of up to 255 options) and `score` (an ordered criteria array of 2–10 levels). Answers come back under the same keys with probabilities, plus `confidence` for Choice and Score, and token usage.

Price is **$0.042 per million input tokens, output free**, with documented limits of **100K tokens/s and 40 requests/s** ("adjusting dynamically"). There are official Python and JS SDKs, a Claude Code/Codex agent skill, an n8n node, and distribution through Cloudflare (Workers AI/AI Gateway as `typesafe/jev`), Vercel AI Gateway, the Vercel AI SDK for Python and OpenRouter. I found no official MCP server.

### Cited Findings
- **Endpoint and auth:** `POST https://api.typesafe.ai/v1/systemone` with headers `Authorization: Bearer <API_KEY>` and `Content-Type: application/json` — [API reference](https://docs.typesafe.ai/api). Model listing: `GET https://api.typesafe.ai/v1/models` — [docs: Models](https://docs.typesafe.ai/models). Keys come from [console.typesafe.ai/keys](https://console.typesafe.ai/keys); there is a no-code [Playground](https://console.typesafe.ai/playground) — [Quick start](https://docs.typesafe.ai/introduction/quickstart).
- **Top-level fields** ([API reference](https://docs.typesafe.ai/api)):
  - `state` ("string | object | array"): "The content to evaluate. A plain string for text, or structured data (object/array) for things like chat logs, records, or the current state of your application."
  - `model` (string): "Use `"jev-latest"`."
  - `questions` (`map<string, Question>`): "You choose each key; answers come back under the same keys... The key is not sent to the underlying model and is not used in inference."
- **The three question types** (all share `type` and `instructions`; per the [API reference](https://docs.typesafe.ai/api)):
  - `"noul"`: "A yes/no question. Returns the probability the answer is yes." `criteria` is optional, `{ "true": ..., "false": ... }`, describing "What a yes (value near 1) means" and what a no means.
  - `"choice"`: "Picks one option from a set you define. Returns the chosen option and the full probability distribution." `criteria` is a "map of option to rubric description; use null when an option needs no extra detail... a maximum of 255 options per Choice."
  - `"score"`: "Rates the state along a rubric you define. Returns a probability-weighted value across your levels." `criteria` is "An ordered array of level descriptions. A Score should have at least two levels; the API accepts up to 10."
  - `instructions` (and criteria entries) can be a string, object or array. Structured instructions can reference state fields by name in backticks, e.g. ``"Is the resume for the same person as `potential_duplicate`?"``.
  - There are only these three types: "The three TypeSafe question types (Choice, Score, Noul)" — [docs index](https://docs.typesafe.ai/llms.txt).
- **What "noul" means:** "A Noul answer is a single number representing the probability that the answer is yes where 0 means no and 1 means yes... There is no separate `confidence` value for a Noul" — [docs: Noul](https://docs.typesafe.ai/primitives/noul).
  - Recorded `jev-1.13.0` values for "Is the customer asking for a human agent?": "Thanks, that fixed it!" → 0.02; "Are you a bot?" → 0.40; "I have asked three times now. Can I please just talk to a real person?" → 0.99 — [docs: Noul](https://docs.typesafe.ai/primitives/noul).
  - **Etymology: unverified.** TypeSafe's docs, skill and SDK sources never explain the name (I grepped them for "Bernoulli"). Third-party explainers say it is "short for Bernoulli" — [Sanity glossary](https://www.sanity.io/glossary/noul), [jevaiguide](https://jevaiguide.com/concepts/noul/).
- **Official example request** (from the [Quick start](https://docs.typesafe.ai/introduction/quickstart)):
```json
{
  "state": "Hi, I've been trying to connect my Stripe account for 3 days and the integration keeps failing. I'm losing sales. Please help ASAP.",
  "model": "jev-latest",
  "questions": {
    "department": { "type": "choice", "instructions": "Which team should handle this",
      "criteria": { "billing": "Payment or subscription issues", "technical": "Bugs or integration problems", "sales": "Pricing or account questions" } },
    "frustration": { "type": "score", "instructions": "How frustrated the customer appears",
      "criteria": ["Calm, just stating facts", "Frustrated but civil", "Very angry, strong language"] },
    "is_urgent": { "type": "noul", "instructions": "The message conveys urgency or time-sensitivity" }
  }
}
```
  The documented response starts `"model": "jev-1.13.0"`, `"department": {"type": "choice", "choice": "technical", "confidence": 0.78, "probabilities": {"technical": 0.85, "sales": 0.0, "billing": 0.15}}`, with `"frustration"` at `"score": 1.0, "confidence": 1.0` — [Quick start](https://docs.typesafe.ai/introduction/quickstart).
- **Response shape** from the [API reference](https://docs.typesafe.ai/api):
```json
{ "model": "jev-1.13.0",
  "answers": {
    "frustration": { "type": "score", "score": 1.05,
      "legend": { "0": "Calm", "1": "Frustrated", "2": "Very angry" },
      "probabilities": { "0": 0.0, "1": 0.95, "2": 0.05 }, "confidence": 0.92 } },
  "usage": { "input_tokens": 304, "output_tokens": 18 } }
```
  Noul answer: `{"type": "noul", "noul": 0.95}`. Choice answer: `{"type": "choice", "choice": "billing", "probabilities": {"billing": 0.88, "technical": 0.12, "sales": 0.0}, "confidence": 0.81}` — [API reference](https://docs.typesafe.ai/api).
- **Errors:** `401` (bad key), `422` (validation), `429` (rate limit) and `529 Overloaded`. Retry with exponential backoff; the SDKs do this automatically and honor `retry-after` — [API reference](https://docs.typesafe.ai/api), [docs: Models](https://docs.typesafe.ai/models).
- **Pricing:**
  - "Price (per Btok / per Mtok) $42 / $0.042... Charged per input token. Output tokens are free." — [docs: Models](https://docs.typesafe.ai/models).
  - Cloudflare's catalog lists the same: input $0.042/1M, output $0.00, cached input $0.00 — [Cloudflare docs: Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/).
  - Homepage FAQ, "Are these prices temporary or subsidized?": "We can serve Jev profitably at our current prices. Our goal is to make intelligence more affordable over time" — [typesafe.ai](https://typesafe.ai/).
  - Real per-case costs from TypeSafe's eval data: **$0.0001–$0.0011 per workflow case** and **$0.0000746 per O*NET question** (about $0.075 per 1,000 questions) — [HF WorkflowEvals datasets](https://huggingface.co/collections/typesafe/workflowevals), [EvalSafe O*NET](https://huggingface.co/datasets/typesafe/evalsafe-onet).
- **Rate limits:** "100K tokens per second / 40 requests per second"; a request over either limit returns 429. Warning: "Rate limits are adjusting dynamically. We are serving a very large volume of demand... as upcoming large GPU deals land and we let in more users... Higher limits are available on custom and enterprise plans." — [docs: Models](https://docs.typesafe.ai/models). Sasha Sheng (Oct 3): "If you are interested in ZDR or want higher rate limits, we are offering that through sales@typesafe.ai" — [X](https://x.com/hackgoofer/status/2106235188665778436).
- **Free tier: no documented free tier.** Secondary sources report a **$5 starter credit** for accounts created when the waitlist ended on Sep 20 — [DEV Community](https://dev.to/li_alex_1ea2dbc2e3e338609/jev-is-now-open-to-everyone-what-a-system-one-model-costs-and-how-to-start-with-5-in-free-4jal), [explainx](https://www.explainx.ai/blog/jev-general-availability-no-waitlist-2026). One secondary source says the credit stopped for signups from Sep 27. Not verified in TypeSafe's docs.
- **Python SDK:** `pip install typesafe-sdk` or `uv add typesafe-sdk`. Clients are `TypeSafeClient` and `AsyncTypeSafeClient`, with types `Noul`, `Choice` and `Score` — [docs: Python SDK](https://docs.typesafe.ai/sdk/python), [GitHub](https://github.com/typesafe-ai/typesafe-sdk-python). Changelog ([Python changelog](https://docs.typesafe.ai/sdk/python/changelog)):
  - v0.5.7 (Sep 14): initial public release.
  - v0.6.0 (Sep 15): Score criteria became an ordered list.
  - v0.7.0 (Sep 18): switched from msgspec to pydantic and added a `response_model` argument.
  - v0.7.1 (Sep 21): "add examples for usage with AI gateways".
  - v0.7.2 (Sep 26): `http2` extra.
- **JS/TS SDK:** `npm install @typesafe-ai/sdk` (Node 20+), with helpers `choice()`, `noul()` and `score()`. Answer types are inferred from the questions. v0.5.7 shipped Sep 11 and v0.6.0 on Sep 15 — [docs: JS SDK](https://docs.typesafe.ai/sdk/javascript), [JS changelog](https://docs.typesafe.ai/sdk/javascript/changelog).
- **Agent skill:** for Claude Code, `claude plugin marketplace add typesafe-ai/skills` then `claude plugin install typesafe@typesafe-ai`; for other agents, `npx skills add typesafe-ai/skills --skill typesafe-ai` — [docs: Agent skill](https://docs.typesafe.ai/agent-skill). The skills repo has about 2.5K stars — [GitHub org](https://github.com/typesafe-ai).
- **LLM adapter (for comparisons):** `system-one-adapter-python` is "A drop-in replacement for `typesafe_sdk`'s `system_one` evaluation API, backed by LLM APIs instead of TypeSafe. Useful for comparing TypeSafe against an LLM on cost/speed/intelligence." It supports OpenAI, Anthropic and Gemini — [GitHub](https://github.com/typesafe-ai/system-one-adapter-python). Diogo promoted it on Sep 29 — [X](https://x.com/CompleteSkeptic/status/2104983284103118927).
- **Distribution and integrations (dated):**
  - **Cloudflare (Sep 17, 20:50 UTC):** "Jev from @typesafeai is now live on @CloudflareDev AI Gateway. Try the first System One model..." — [X @CloudflareDev](https://x.com/CloudflareDev/status/2100688880798159254). Cloudflare's catalog lists `typesafe/jev` as "Third-party" and "Zero data retention", callable as `env.AI.run('typesafe/jev', {state, questions})` or via `https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run` with `"model": "typesafe/jev"` — [Cloudflare docs: Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/).
  - **Vercel AI Gateway (blog Sep 18):** "the fastest-adopted model in AI Gateway history... By hour 24, nearly 13% of paid teams were using it", which is 2x the GPT-5.6 family and more than 6x Fable 5.1 — [Vercel blog](https://vercel.com/blog/ai-gateway-jev-model-launch).
  - **Vercel AI SDK for Python (Oct 2):** "Jev is now in the AI SDK for Python" — [X @vercel](https://x.com/vercel/status/2106139101422567748).
  - **n8n (Oct 1):** "@typesafeai's Jev model just landed in n8n... Think of it as a smarter If/Switch for the fuzzy stuff" — [X @n8n_io](https://x.com/n8n_io/status/2105609243827077164). The official community node `@typesafe-ai/n8n-nodes-typesafe-ai` has two operations, **Evaluate** and **Route** — [GitHub](https://github.com/typesafe-ai/n8n-nodes-typesafe-ai).
  - **OpenRouter:** "TypeSafe: Jev Router" (`typesafe/jev-router`), created 2026-09-25 19:12 UTC per OpenRouter's API. Description: "Jev Router picks the best model and reasoning effort for each request, balancing quality, speed, and cost. It runs on Jev..." — [OpenRouter models API](https://openrouter.ai/api/v1/models), [OpenRouter page](https://openrouter.ai/typesafe/jev-router).
  - **Others:**
    - A DSPy office hours / town hall on Jev — [X](https://x.com/typesafeai/status/2105735351570755814).
    - A Spring AI blog post (Sep 21) — [spring.io](https://spring.io/blog/2026/09/21/spring-ai-typesafe-structured-judgment/).
    - InfoQ also lists Netlify, LangChain routing middleware and "five independent Elixir clients" — [InfoQ](https://www.infoq.com/news/2026/10/typesafe-ai-jev-released/).
- **MCP:** I found no official TypeSafe MCP server. Community "typesafe-mcp" and "jev-mcp" projects appear in a viral X list — [X list](https://x.com/aiwithaman/status/2106259823558115822) (unverified).

### Inferences
- Clef's "fully Jev-API compatible" claim maps directly onto this schema. Cloudflare's own Clef curl example uses the same `state` + `questions` shape and the same three types (`noul`, `choice` with a criteria map, `score` with an ordered criteria list) — [Clef blog](https://blog.cloudflare.com/clef-decision-models/). Cloudflare also already proxies or catalogs Jev itself under the same `ai/run` interface, so swapping `typesafe/jev` for `@cf/cloudflare/clef` is close to a one-line change.
- For demos: one request can carry dozens of questions over the same state at no output cost. Cost is dominated by `state` size, so the cheapest pattern is "small state, many questions".

### Gaps
- Official free-tier and credit terms, the original first-week rate limits and billing-start dates are not documented in TypeSafe sources. Third-party roundups claim higher early limits and a free first week on Vercel's gateway; these are unverified.
- `GET /v1/models` release dates require an API key, so I did not call it.

---

## Q4. Which use cases, customers and design partners does TypeSafe show? What do the WorkflowEvals contain, and how did Jev score?

### Takeaway
TypeSafe pitches Jev for classification, detection, scoring, routing, search, retrieval, ranking, verification, ML feature extraction and structured extraction. It backs this with about 20 cookbooks and four published "workflow evals": invoice processing, customer service, security incidents and agent-trace observability.

On those evals Jev is **never the most accurate model**. It sits between 61.7% and 76.0% against frontier-LLM consensus labels, ranging from 3rd to 8th of 9 depending on the workflow.

But per case it is **about 7–570x cheaper** than the eight LLM configurations tested (GPT-5.6 Luna is the closest on cost), and **about 13–485x faster**. Against the strongest LLMs, GPT-5.6 Sol and Claude Opus 5, it is about **200–570x cheaper and 27–185x faster** (my calculations from the published per-case means). That is exactly the Pareto-frontier argument TypeSafe makes. Cloudflare's Clef table reuses Jev's numbers from these datasets exactly.

Named public users and case studies include Vercel, Rox, a You.com research agent, a recruiting search reranker, Context, PageIndex and Agora voice. Diogo also claims a quarter of the Fortune 500 has been onboarded (unverified).

### Cited Findings
- **Use-case taxonomy (docs):**
  - Classification: "Intent, topic, department, risk type".
  - Detection: "Spam, fraud, urgency, jailbreaks, sensitive data".
  - Scoring: "Severity, relevance, quality, frustration".
  - Routing: "Tool use, escalation, model routing, support queues".
  - Search, Retrieval ("RAG context"), Ranking.
  - Verification: "Citation support, policy violations, tool-call errors".
  - ML Feature Extraction: "Purchase intent... churn signals".
  - Structured Data Extraction.
  - Source: [docs: Example use cases](https://docs.typesafe.ai/concepts/use-case-map).
  - Architectural patterns: speculative fan-out, confidence-gated routing, composite scoring, intent routing — [docs index](https://docs.typesafe.ai/llms.txt).
- **Cookbook headline numbers** (from the [docs index](https://docs.typesafe.ai/llms.txt)):
  - Parallel questions: a 13-question GDPR briefing "12.2x cheaper and 10.0x faster with no change in answers".
  - Re-ranking (CLERC legal): "top-1 accuracy from 5% to 18% and top-10 accuracy from 38% to 62%".
  - Skill suggestion over "the 182 in Nous Research's Hermes catalog".
  - Entity alignment on "450 candidate pairs from two beer catalogues".
  - SEC 10-K classification "into 75 industry groups".
  - Other cookbooks: LLM guardrails, citation checking, date extraction, function calling, hierarchical classification, and a "SDE cascade (mini → verify → reasoning)".
- **Launch-post use cases:** "smart if-statements", map-reduce over big data, real-time apps, and LLM guardrails or jailbreak detection — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev). The podcast also mentions "Computer use, voice control, gaming, coding agents, linting, entity resolution, natural language search, and analytics replay" — [Latent Space](https://www.latent.space/p/jev).
- **Named users and quotes in the press** ([TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)):
  - Vercel's Pranit Sharma reported results "five to 18 times more quickly and with greater accuracy" vs GPT-5.6 Luna.
  - Bryo AI CTO Nikhil Mudholkar said a Gemini alternative was "10 to 20 times more expensive".
  - Armin Ronacher (Earendil): "if this only comes back with 50% probability, maybe this is a coin toss... But if it's 95%, sure, then I can do something with it."
- **Case studies amplified by @typesafeai:**
  - Rox: "We used Jev to retrieve sales data 20x faster, 10x cheaper, and 12% more accurate than GPT-5 Mini" — [X @rox_ai](https://x.com/rox_ai/status/2104642687534293353), amplified [here](https://x.com/typesafeai/status/2105356405998063911).
  - You.com risk agent by @edwardirby: "the LLM flip-flopped: 0.35 -> 0.68 -> 0.50 on the same threat • the LLM missed 5 of 11 investigations. Jev missed none. • Jev was 250x cheaper, 3-6x faster" — [X](https://x.com/typesafeai/status/2105733977147617750).
  - Recruiting search reranker: "At 75% of the previous reranking cost, it improved our main-app search by 30.64%" — [X](https://x.com/typesafeai/status/2105741653701242938).
  - PageIndex long-document search with "No vector database. No embeddings." — [X](https://x.com/typesafeai/status/2106071115915550786).
  - Agora ConvoAI "semantic VAD" for voice turn-taking — [X](https://x.com/typesafeai/status/2105809232738283853).
  - Context's founder: "Context is now spending 1k/day on jev", amplified by Erik Gafni with "Jevon's paradox begins" — [X @EGafni](https://x.com/EGafni/status/2105525827001794950).
- **CEO claim (unverified):** "me to our GTM guy: do enterprises want benchmarks / him: no, the fast ones have already benchmarked their internal use cases. the slow ones are copying the fast ones. / he's onboarded a quarter of the fortune 500 already 🥵" (Oct 1, 20:58 UTC; ~1K likes) — [X](https://x.com/CompleteSkeptic/status/2105764336522424779).
- **WorkflowEvals method** ([evals.typesafe.ai](https://evals.typesafe.ai/)):
  - Each task is decomposed into narrow Noul, Choice and Score questions plus code rules, and "Assume the harness is correct."
  - Reference labels are "an average of the responses of GPT-6 Astra and Claude Fable 5.1, both at high thinking, answering every question in the harness"; other models run at provider default reasoning.
  - Claim: "Averaged across the four example tasks, every model is more accurate, cheaper and faster in the workflow than it is with the same policy as a prompt."
  - Reproduction code (default model `typesafe:jev-1.13.0`) — [GitHub WorkflowEvals](https://github.com/typesafe-ai/WorkflowEvals).
  - The HF collection was published Sep 28–29, Apache-2.0, with "Labels are model-generated references" — [HF collection](https://huggingface.co/collections/typesafe/workflowevals).
- **What each eval contains, and Jev's score** (from each dataset's `dataset.json`; all runs use `jev-1.13.0` with reasoning off). Cost and time are means per case. The "cheaper/faster" ratios are my calculations from the published numbers.
  - **Invoice processing** (150 cases, 6,874 question instances; policies startup, enterprise, high-volume retailer). "A vendor's bill arrives. Given the bill, the order behind it, and what was actually delivered, we decide whether it gets paid, held, or sent back."
    - **Jev: 61.8% exact action-set accuracy** (83.1% primary-action match), **$0.0011 per case, 0.50 s**. Rank 8 of 9.
    - Best: GPT-5.6 Sol at 79.1% ($0.215, 34.3 s) and Claude Opus 5 at 78.4% ($0.486, 92.1 s).
    - Source: [evalsafe-invoice-processing](https://huggingface.co/datasets/typesafe/evalsafe-invoice-processing).
  - **Customer service** (204 cases, 3,287 question instances; policies A, B and C). "A customer writes in. Given the thread so far and the state of their account, we decide what the assistant should say and do next."
    - **Jev: 76.0% accuracy, $0.000107 per case, 0.37 s**. Rank 4 of 9.
    - Best: GPT-5.6 Sol at 78.3% ($0.032, 10.1 s); DeepSeek V4 Flash at 76.8%.
    - Source: [evalsafe-customer-service](https://huggingface.co/datasets/typesafe/evalsafe-customer-service).
  - **Security incidents** (240 cases, 1,820 question instances; "Alert-triage playbook"). "A security alert fires on a laptop or a server... we decide whether to close it, pass it to an analyst, or contain it now."
    - **Jev: 61.7% label agreement, $0.00010 per case, 0.26 s**. Rank 3 of 9.
    - Best: Claude Opus 5 at 66.3% ($0.057, 15.1 s); GPT-5.6 Sol at 62.5%.
    - Source: [evalsafe-security-incidents](https://huggingface.co/datasets/typesafe/evalsafe-security-incidents).
  - **Agent trace observability** (titled "Agent trace triage"; 111 cases, 1,124 question instances; balanced and cautious profiles). "A support agent has just finished with a customer. Given the whole run, every tool call included, we decide whether a person needs to look at it, and how soon."
    - **Jev: 71.6% disposition agreement, $0.00028 per case, 0.48 s**. Tied 6th–7th of 9.
    - Best: GPT-5.6 Sol at 76.6% ($0.058, 40.3 s); GPT-5.6 Luna at 76.1%.
    - Source: [evalsafe-agent-trace-observability](https://huggingface.co/datasets/typesafe/evalsafe-agent-trace-observability).
  - **Bonus O*NET dataset** (Sep 29; 150 synthetic workplace documents, 7,500 consensus-labeled questions, 9 models):
    - **Jev overall 0.934**, 3rd of 9, just behind Claude Opus 5 (0.943) and GPT-5.6 Sol (0.934).
    - Jev is best on Noul questions (0.976) and returned **100% valid answers**, vs Opus 5 at 7,439/7,500.
    - Cost: $0.075 per 1,000 questions vs $19.45 for Opus 5. Speed: 0.14 s vs 3.18 s per question.
    - Source: [EvalSafe O*NET](https://huggingface.co/datasets/typesafe/evalsafe-onet).
  - Diogo on the O*NET release: "Simply by evaluating on the 2nd one, we believe it to no longer be a valid indicator of true out-of-distribution generalization." — [X](https://x.com/CompleteSkeptic/status/2104980715414987036).
- **Cloudflare's table vs TypeSafe's data:** the Clef blog lists Jev at **61.8 / 76.0 / 61.7 / 71.6** on these four workflows and says Clef beat Jev in 3 of 4 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/). Those values match TypeSafe's published `dataset.json` results (0.6178 / 0.7598 / 0.6167 / 0.7162) to the decimal — [HF datasets](https://huggingface.co/collections/typesafe/workflowevals).

### Inferences
- Cloudflare most likely reused TypeSafe's published Jev runs rather than re-running Jev. That is legitimate, since TypeSafe published them, but it means Clef and Jev scores may come from different harness runs or dates.
- Honest framing for the video: Jev's pitch is intelligence per dollar and per millisecond, not top accuracy. In TypeSafe's own evals, the best LLMs (GPT-5.6 Sol and Claude Opus 5) beat it by about 2–17 points. But they cost about 200–570x more per case and take about 27–185x longer: seconds to minutes per case, versus 0.26–0.50 s for Jev (my calculations from the published dataset.json means).

### Gaps
- No formal, named "design partner" program or logo wall was found on typesafe.ai. Customer evidence is press quotes and X case studies.
- The Fortune 500 claim is unverified.

---

## Q5. What benchmarks did TypeSafe publish, and what is the "Jev Decision Index"?

### Takeaway
TypeSafe deliberately publishes **no public-benchmark scores**: no MMLU, no LMArena, no BFCL. It publishes only its own workflow evals (plus O*NET) and says it deprecates any dataset it evaluates on. The **Jev Decision Index** is **community-made, not official**. It is a Hugging Face Space by Apolinário ("multimodalart", a member of the Hugging Face org on HF), created Sep 17, 2026, that scores "open reproductions of Jev" against Jev on a frozen suite of about 132K decisions. Cloudflare used it as the yardstick for Clef.

### Cited Findings
- **TypeSafe's stance** (launch FAQ): "We deliberately chose not to publish performance against public benchmarks. In fact, we plan to only have one-off evals when we make product updates." Its proposed best practices: "Put no weight on public benchmarks... Encourage users to create their own evals... Disclose the nuance in your evals... De-emphasizing benchmarks even when you're ahead." — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- Supporting essay "Lies, Damned Lies, and Benchmarks" (Sep 11): "I'm not arguing against benchmarks... I'm against benchmaxxing... My claim is that many of the spikes in 'jagged intelligence' are the benchmarks." — [blog](https://typesafe.ai/blog/antibenchmaxxing).
- Diogo, Sep 29: "I am still anti-public benchmarks. In that spirit, we deprecate all datasets we evaluate on (internally or publicly)" — [X](https://x.com/CompleteSkeptic/status/2104980714106360258). Also: "tbc we aren't going to stop people from benchmarking (we removed that stuff from our terms), but we aren't going to support it as a reference!" — [X](https://x.com/CompleteSkeptic/status/2105008563274031496).
- Erik Gafni: "benchmark scores are easy to game, and benchmark maxxing is bad for the model (anyone remember llama4?)" — [X](https://x.com/EGafni/status/2105051084184293499).
- The current terms contain no benchmarking clause. The MCA (Sep 23) and AUP (Sep 23) mention none; the MCA does ban distillation and competing-product training — [MCA](https://typesafe.ai/legal/mca), [AUP](https://typesafe.ai/legal/acceptable-use-policy).
- **What was published:** four WorkflowEvals plus the O*NET bonus set (see Q4) — [evals.typesafe.ai](https://evals.typesafe.ai/), [HF collection](https://huggingface.co/collections/typesafe/workflowevals). The hallucination and type-error chart uses OpenRouter-sourced numbers for LLMs; for Jev: "Our number is not empirical. Schema matching is guaranteed, thus we can confidently add 0% into the plots." — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev).
- **Jev Decision Index: who and when.** Space `multimodalart/jev-decision-index`, created **2026-09-17**, last modified 2026-10-02, ~399 likes, static SDK. Short description: "Benchmarks and news on various repros of TypeSafe's Jev" — [HF Space](https://huggingface.co/spaces/multimodalart/jev-decision-index) (metadata via [HF API](https://huggingface.co/api/spaces/multimodalart/jev-decision-index)).
  - The owner's HF profile is "Apolinário from multimodal AI art" and lists membership in the **Hugging Face** org (plus diffusers and others) — [HF user](https://huggingface.co/multimodalart).
  - The Space is not published by TypeSafe's HF org and does not appear in TypeSafe's materials — [HF org](https://huggingface.co/typesafe).
- **What the Index does** (version "Decision Index 0.2.1"; [HF Space](https://huggingface.co/spaces/multimodalart/jev-decision-index)):
  - "The Decision Index is one number per model for how well an open reproduction of TypeSafe's Jev [performs]".
  - "Open reproductions of Jev, scored head-to-head on the frozen suite", a "frozen 132,422-decision suite" in "five capability categories".
  - "Every benchmark is chance-corrected before averaging, so 0 means random guessing and 100 means perfect"; "a request the model could not answer counts as wrong".
  - Calibration is reported as expected calibration error over ten bins.
  - Jev's "own results were recorded once and never re-run".
  - "Two different clocks: in-process GPU time for the reproductions, an HTTP round trip for Jev."
  - The Space metadata lists about 75 tracked models, including Kev, Laya, DiffusionGemma, Perplexity's pplx-decider, InternLM Intern-Decision, Together Tev1 and Fastino GLiNER2.5-Decide.
- **Cloudflare's use of it:** "Clef is currently the leader when evaluated against the Jev Decision Index" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/). The public benchmarks in Cloudflare's table (BFCL, ToolRet, API-Bank, When2Call, BANKING77, CLINC150+OOS, BRIGHT, Amazon ESCI, PhishNChips) are exactly the kind TypeSafe says it won't publish against.

### Inferences
- The two sides are measuring different things. TypeSafe: in-workflow agreement with frontier-LLM consensus. The Index and Cloudflare: chance-corrected accuracy on public classification and tool-use datasets, often from a different network location. That framing gap is itself a good video talking point.

### Gaps
- I could not render the Index's live leaderboard numbers (JS-loaded data), so I don't report Jev's index score. The Clef/landscape teams cover the scores.
- I could not verify the original pre-Sep-23 terms text that Diogo says contained benchmarking restrictions (the Wayback Machine is blocked here).

---

## Q6. What has happened since launch? (versions, pricing, outages, open-sourcing, partnerships, response to Clef)

### Takeaway
In the 18 days after launch:
- **Demand far outran capacity.** About 140K people were let in from the waitlist in under 36 hours. Signups opened to all on Sep 20, were paused on Sep 22, and reopened on Sep 27. The status page shows several short API incidents (Sep 21, 23, 24 and 28) and 99.826% API uptime.
- **Distribution came quickly.** Cloudflare AI Gateway (Sep 17), Vercel AI Gateway (record adoption), OpenRouter (a "Jev Router" on Sep 25), n8n (Oct 1) and the Vercel AI SDK for Python (Oct 2) all added Jev.
- **Funding talks** at a $10B+ valuation were reported on Sep 24.
- **Unchanged:** still **jev-1.13.0** with no preview build, still **$0.042/Mtok**, still **closed weights**. Only the eval datasets and code were opened.
- **No direct public response to Cloudflare's Clef** (Oct 1) by TypeSafe or its founders was found as of Oct 3, about 07:00 UTC. The closest thing is Diogo's same-day post that enterprises don't care about benchmarks. Notably, Cloudflare had been a Jev distribution partner since Sep 17.

### Cited Findings
- **Timeline (UTC):**

| Date | Event | Source |
|---|---|---|
| Sep 15 | Launch post, Business Wire $40M seed, Diogo's X post (18:17); early access via waitlist | [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [press](https://finance.yahoo.com/technology/ai/articles/typesafe-ai-emerges-stealth-40m-190000776.html), [X](https://x.com/CompleteSkeptic/status/2099925682726002904) |
| Sep 17 (05:20) | Diogo: "it's been < 36 hours, we've jev-ed 140k off the waitlist... I've been told we're 9th biggest launch video of the year" | [X](https://x.com/CompleteSkeptic/status/2100454726462804333) |
| Sep 17 (20:50) | Cloudflare: "Jev from @typesafeai is now live on @CloudflareDev AI Gateway" | [X](https://x.com/CloudflareDev/status/2100688880798159254) |
| Sep 17 | "Jev 1.13 jaggedness" known-limitations page last reviewed | [docs](https://docs.typesafe.ai/model-jaggedness/jev-1.13) |
| Sep 18 | Vercel: fastest-adopted model in AI Gateway history (about 13% of paid teams by hour 24). TechCrunch: the company "briefly lost the ability to serve users from its API because demand was so high" | [Vercel](https://vercel.com/blog/ai-gateway-jev-model-launch), [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/) |
| Sep 20 (21:30) | "Jev is now available to everyone. No waitlist." (~22.7K likes, ~3.16M views) | [X](https://x.com/typesafeai/status/2101786156572823624) |
| Sep 20–21 | Status page: console unavailable (Sep 20/21); "API issues: intermittent downtime and system instability" (Sep 21, 2 min down) | [status page](https://status.typesafe.ai/), [RSS](https://status.typesafe.ai/feed.rss) |
| Sep 21 | Latent Space podcast with Diogo | [Latent Space](https://www.latent.space/p/jev) |
| Sep 22 (06:19) | "We have seen such an immense swell of demand that we have to temporarily pause signups for Jev... existing signups... will continue to function." Diogo: "oops, we're full!... we figured this was the best trade-off to allow our team to sleep 🙏" | [X](https://x.com/typesafeai/status/2102281508950307159), [X](https://x.com/CompleteSkeptic/status/2102282924699840980) |
| Sep 23–24 | "Elevated API latency and connection issues" (Sep 23, 12 min down); "Elevated API latency" (Sep 24). MCA and AUP updated Sep 23 | [status page](https://status.typesafe.ai/), [MCA](https://typesafe.ai/legal/mca) |
| Sep 24 | The Information: talks to raise $1B+ at a $10B+ valuation | [AI Weekly](https://aiweekly.co/alerts/the-information-typesafe-in-talks-to-raise-1b-at-10b-valuation-days-after-40m) |
| Sep 25 | `typesafe/jev-router` created on OpenRouter | [OpenRouter API](https://openrouter.ai/api/v1/models) |
| Sep 27 (22:30) | "Ladies and gentlemen, agents and assistants, we are psyched to announce Jev is back. Capacity has increased and signups are open!" | [X](https://x.com/typesafeai/status/2104337822350221795) |
| Sep 28 | "Degradation in API Traffic: elevated latency and error rates" (11 min down) | [status page](https://status.typesafe.ai/) |
| Sep 28–29 | WorkflowEvals datasets, O*NET bonus set and repro code released (Apache-2.0); Diogo: "p.s. prepare for more sick stuff next week!" | [HF](https://huggingface.co/collections/typesafe/workflowevals), [X](https://x.com/CompleteSkeptic/status/2104980812940927141) |
| Sep 29 | Reacting to a new OpenAI offering: "begun, the clone war has / jk, I love openai and think more competition and validation is great for developers!... hopefully this is a sign for the future that building in a system one compatible way is the future". He called it "luna with constrained decoding" | [X](https://x.com/CompleteSkeptic/status/2105000685209313736), [X](https://x.com/CompleteSkeptic/status/2105003227200852221) |
| Sep 30 | Product Hunt "Hypership Day" participation; Rox case study | [X](https://x.com/typesafeai/status/2105336631775604816) |
| Oct 1 | n8n integration (Diogo: "super excited for this"). **Cloudflare launches Clef ("fully Jev-API compatible").** Diogo's "do enterprises want benchmarks" post (20:58) | [X](https://x.com/CompleteSkeptic/status/2105681741625340392), [Clef blog](https://blog.cloudflare.com/clef-decision-models/), [X](https://x.com/CompleteSkeptic/status/2105764336522424779) |
| Oct 2 | Vercel AI SDK for Python adds Jev (Diogo: "not you too jev!"); TypeSafe posts in HN "Who is hiring" | [X](https://x.com/CompleteSkeptic/status/2106204799633072371), [HN](https://news.ycombinator.com/item?id=49929657) |
| Oct 3 | Sasha Sheng: cookbooks; ZDR and higher rate limits via sales | [X](https://x.com/hackgoofer/status/2106235188665778436) |

- **Status page snapshot** (Better Stack; "Last updated on Oct 3, 2026 at 6:54am UTC"): api.typesafe.ai **99.826% uptime**, with incidents "API issues — Down for 2 minutes, Sep 21", "Elevated API latency — Down for 12 minutes, Sep 23" and "Degradation in API Traffic — Down for 11 minutes, Sep 28". console.typesafe.ai at 99.976% — [status.typesafe.ai](https://status.typesafe.ai/).
  - Conflict: a third-party roundup read the page on Sep 24 and listed outages on Sep 17 (5 min) and Sep 20 (18 min) that the current page does not show — [A week of Jev, sorted](https://mattheworiordan.github.io/jev-landscape/).
- **Versions:** no new model version. The docs, Cloudflare's catalog and the Sep 28 eval runs all show `jev-1.13.0`, and "`jev-preview` currently points to the same model" — [docs: Models](https://docs.typesafe.ai/models), [Cloudflare docs](https://developers.cloudflare.com/ai/models/typesafe/jev/). Roadmap teases: "we have stuff in the tank" — [Latent Space](https://www.latent.space/p/jev); "prepare for more sick stuff next week!" (Sep 29) — [X](https://x.com/CompleteSkeptic/status/2104980812940927141); images "not supported (yet)" — [docs](https://docs.typesafe.ai/concepts/system-one).
- **Pricing:** no change found. $0.042/Mtok input and free output on launch day, in today's docs, and in Cloudflare's catalog — [launch post](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [docs: Models](https://docs.typesafe.ai/models), [Cloudflare docs](https://developers.cloudflare.com/ai/models/typesafe/jev/). Rate limits are explicitly "adjusting dynamically" — [docs: Models](https://docs.typesafe.ai/models).
- **Open-sourcing:** no weights (HF models = 0). What was opened: SDKs, agent skills (MIT), the LLM adapter, WorkflowEvals code, five Apache-2.0 eval datasets and an n8n node — [HF org](https://huggingface.co/typesafe), [GitHub org](https://github.com/typesafe-ai).
- **Usage stats (third-party, unverified):** one roundup reports that on Sep 23 Jev took 25.2% of requests (1.8% of tokens) on Vercel's AI Gateway, and that OpenRouter served 437M requests and 1.39T tokens in one week. It also reports launch-week SDK downloads (JS 298,412; Python 331,517) — [A week of Jev, sorted](https://mattheworiordan.github.io/jev-landscape/). Only the "about 13% of paid teams by hour 24" figure is confirmed by Vercel itself — [Vercel](https://vercel.com/blog/ai-gateway-jev-model-launch).
- **Response to Cloudflare's Clef (Oct 1):**
  - I reviewed every post by @typesafeai, @CompleteSkeptic, @EGafni and @hackgoofer from Sep 29 15:29 UTC to Oct 3 ~04:30 UTC. This came from a teammate's X search capture (60 most recent posts; scratchpad `social_x/out_xa5.json`) plus the ScrapeCreators API. **None mention Clef or Cloudflare.**
  - The CTO wrote a single related line on Oct 1, quoting the n8n launch: "Large scale automation requires mathematical and logical constraints because even an epsilon probability of going off the rails is a death sentence." — [X](https://x.com/EGafni/status/2105702914123858207).
  - Diogo's Oct 1 "RIP jev 😢" was a joke reply to Deedy Das's **Sep 30** post, which read: "The thing to trust is the price. If they price it high, it's a good model. If they don't, it's benchmaxxed." It was **not** about Clef — [Diogo](https://x.com/CompleteSkeptic/status/2105679601230123150), [Deedy](https://x.com/deedydas/status/2105417575618297975).
  - On Oct 2 Diogo replied to a skeptic: "our model is not meant to be plug-n-played into agentic harnesses. It's meant to compose with code" — [X](https://x.com/CompleteSkeptic/status/2106098233231675868).
  - InfoQ's Oct 1 write-up on Jev also has "no Cloudflare Clef mention" — [InfoQ](https://www.infoq.com/news/2026/10/typesafe-ai-jev-released/).
- **The Cloudflare–TypeSafe relationship:**
  - Cloudflare catalogs `typesafe/jev` as a "Third-party", zero-data-retention model at TypeSafe's list price — [Cloudflare docs](https://developers.cloudflare.com/ai/models/typesafe/jev/).
  - Its Clef post says, "The interest in Jev shows the need for a fast, small, specific, classifier model" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/).
  - TypeSafe's MCA bars using Jev outputs "to perform model distillation, train a model to imitate the output of the Services, or develop... a similar or competing product" — [MCA](https://typesafe.ai/legal/mca).
  - Cloudflare says Clef was trained on "our own internal synthetic datasets" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/). There is no evidence or allegation of any terms issue; this is context only.

### Inferences
- Diogo's Oct 1 post about enterprises not wanting benchmarks (20:58 UTC) landed about 4.7 hours after the Clef blog was submitted to Hacker News. That submission was at 16:18 UTC, [HN item 49923692](https://news.ycombinator.com/item?id=49923692), 621 points. The post reads as an implicit counter-positioning to benchmark-based comparisons (including Clef's), but it never names Cloudflare. Treat it as **possibly** a response.
- The Framer source of the homepage still contains a "TYPESAFE IS INVITE-ONLY AGAIN / Enter your email to join the waitlist" component — [typesafe.ai](https://typesafe.ai/). It was probably the banner shown during the Sep 22–27 pause; the live FAQ now says "Jev is now available to everyone."
- Cloudflare went from distributor (Sep 17) to competitor with an API-compatible open-weights clone (Oct 1) in 14 days. That arc, plus the "fast followers adopt the Jev request format" trend (OpenAI, Perplexity, Databricks and others per X chatter), is the strongest narrative hook for the video. The landscape team holds the details.

### Gaps
- No official TypeSafe statement on Clef was found as of Oct 3. Watch @typesafeai, @CompleteSkeptic, @EGafni, @hackgoofer and the TypeSafe Discord.
- I found no official word on the outcome of the $10B talks, any new model version, or any price cut.
- What OpenAI launched on Sep 29 (Diogo's "clone war" post) was not verified here; it belongs to the competing-models team.
