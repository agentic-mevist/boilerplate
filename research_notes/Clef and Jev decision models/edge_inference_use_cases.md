# Decision models at the edge: GPU footprint, latency budgets, economics, and CDN/edge use cases (research notes as of 2026-10-03)

Conventions used in these notes: "(search excerpt)" means the fact came from a search-result summary of the cited page and was not re-verified by fetching the page; "(secondary)" means an aggregator or press write-up, not the vendor or original source. All prices are list prices on the date shown. "DM" = decision model (Clef, Clef-flash, Jev and similar). "Jev" is Typesafe AI's text-only decision model (32k context, ~524 ms median latency in Cloudflare's tests). Clef is Cloudflare's model family.

---

## 1. Where can a Clef-class decision model actually run at the edge in 2026? Which providers have GPUs in their PoPs, and which only in regions?

### Takeaway
Only Cloudflare publicly claims GPUs in most of its PoP cities: more than 230 of its 335+ cities as of Oct 1, 2026. Clef and Clef-flash are served there today. Akamai is adding NVIDIA RTX PRO 6000 GPUs to a subset of its ~4,400 locations. At launch it targeted 20 locations (Oct 2025), and by Mar 2026 it had "thousands" of GPUs plus metro-edge clusters. Gcore sells L40S, H100 and A100 inference behind an anycast "Smart Routing" front door on 180–210+ PoPs, but it does not publish how many PoPs have GPUs. Fastly, Vercel, Netlify, AWS CloudFront and Azure Front Door run no GPU inference at the edge. Their edge compute is CPU-only with sub-ms to 10 ms limits, and they proxy or cache calls to LLM APIs. Fly.io shut down its GPUs on July 31, 2026. Telco "AI grids" are the next wave but are still early.

### Cited Findings

#### Clef facts that decide where it can be placed
- Clef freezes Qwen3.8-27B and Clef-flash freezes Qwen3.5-9B. Each adds a routing head and rank-256 LoRA adapters. Inference is "a prefill-only pass, then scores the valid schema choices in parallel". The decision step is non-autoregressive, so no text is generated token by token — [Cloudflare blog, Oct 1 2026](https://blog.cloudflare.com/clef-decision-models/)
- Median latency: Clef 209.3 ms, Clef-flash 38.8 ms, Jev 524.1 ms, DiffusionGemma Jev 84.4 ms, Kev-9B 51.4 ms, Laya 5.8 ms. p95: 238.6 / 122.4 / 536.0 / 211.2 / 187.9 / 222.5 ms. These come from 43 eval benchmarks — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- The Hugging Face card gives the license as Apache-2.0, "following the base model Qwen/Qwen3.8-27B". It lists 27B parameters, BF16 weights and usage examples for transformers, vLLM and SGLang. The latency figures were measured on "a single H200". The example code uses a default `max_length` of 16,384 tokens — [Hugging Face: Cloudflare/clef](https://huggingface.co/Cloudflare/clef)
- Workers AI docs list the model IDs `@cf/cloudflare/clef` and `@cf/cloudflare/clef-flash`, a 65,536-token context and text, JSON or image inputs. Image limits: max 4 images, 4 MiB and 16 MP each, 8 MiB total decoded, 13 MiB max request body. A request carries 1–64 questions, each of type `noul`, `choice` or `score` — [Workers AI Clef docs](https://developers.cloudflare.com/workers-ai/models/clef)
- Cloudflare's placement claim: "we're able to take advantage of our GPUs at the edge, leading to low network latency and faster decisions. This means that you could put Clef into the hot path for agents" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Context-length discrepancy: the blog says 64k (vs Jev's 32k) and the docs say 65,536 tokens, but the HF example defaults to 16,384 — [blog](https://blog.cloudflare.com/clef-decision-models/), [docs](https://developers.cloudflare.com/workers-ai/models/clef), [HF](https://huggingface.co/Cloudflare/clef)

#### Cloudflare Workers AI
- "our network runs in more than 335 cities across 125+ countries, with GPUs for AI inference in more than 230 of them" — [Cloudflare blog, Oct 1 2026 (Birthday Week)](https://blog.cloudflare.com/sovereign-ai-choice-one-year-later/)
- The product page still says "50+ models running close to users in 200+ cities". This is undated marketing copy — [Workers AI product page](https://www.cloudflare.com/products/workers-ai/)
- Earlier milestones: GPUs in 100+ cities by end of 2023, "nearly everywhere" by end of 2024, then "over 150 cities" and later "over 180 cities, having doubled capacity in a year" (search excerpts, 2024) — [Workers AI GA post](https://blog.cloudflare.com/workers-ai-ga-huggingface-loras-python-support/), [Bigger, better, faster post](https://blog.cloudflare.com/workers-ai-bigger-better-faster/)
- How requests reach a GPU: "When an inference request is made on Workers AI, we load the model's configuration from Workers KV and our routing layer forwards it to the closest Omni instance that has available capacity." Omni packs many models on one GPU. Its example runs 13 models "allocating about 400% GPU memory on a single GPU, saving up 4 GPUs". Swapping a ~5 GB model back into a GPU takes ~156 ms, and less for small models — [Cloudflare Omni post, Aug 27 2025](https://blog.cloudflare.com/how-cloudflare-runs-more-ai-models-on-fewer-gpus/)
- GPU types: the in-house Rust engine Infire was benchmarked on "machines equipped with an H100 NVL GPU" (search excerpt) — [Infire post](https://blog.cloudflare.com/cloudflares-most-efficient-ai-inference-engine/). Clef's latency was measured on H200 — [HF](https://huggingface.co/Cloudflare/clef). Large models such as Kimi K2.5 (>1T parameters) "need at least 8 H100s" (search excerpt) — [Workers AI large-models post, Mar 19 2026](https://blog.cloudflare.com/workers-ai-large-models/). That post also added an `x-session-affinity` header for prefix-cache routing and an async mode ("our async requests usually execute within 5 minutes") — [same post](https://blog.cloudflare.com/workers-ai-large-models/)
- Access: the Clef blog shows a REST call to `https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/ai/run/@cf/cloudflare/clef` — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

#### Gcore
- Everywhere Inference "deploys trained AI models on edge inference nodes across 180+ locations worldwide". GPUs are L40S, H100 and A100 in 1×–4× configurations. Custom models are supported. "Smart Routing selects the closest inference region through a single endpoint", and health checks redirect traffic when a regional pod fails. The docs do not say how many locations have GPUs — [Gcore docs](https://docs.gcore.com/edge-ai/everywhere-inference)
- Everywhere Inference prices per hour: 1×L40S (48 GB) €1.08, 2×L40S €2.16, 4×L40S €4.32. 1×H100 (80 GB) €1.53, 8×H100 €12.24. 1×A100 (80 GB) €1.26, 8×A100 €10.08. No per-token or serverless price is listed — [Gcore AI pricing](https://gcore.com/pricing/ai)
- Everywhere AI (Nov 3, 2025) covers training and inference across on-prem, hybrid, public, private and "fully air-gapped" setups. It uses "Gcore's global edge network (210+ PoPs)" for Smart Routing, and "Inference requests automatically reach the nearest compliant GPU region". Claims include "2× higher GPU utilization" (~40% to 80–95%) — [Gcore blog](https://gcore.com/blog/introducing-everywhere-ai)
- The June 2024 "Inference at the Edge" launch said nodes are "equipped with NVIDIA L40S GPUs" on 180+ PoPs. Gcore marketing also claimed a typical response time under 30 ms (search excerpts) — [EdgeIR, Jun 11 2024](https://www.edgeir.com/gcore-unveils-new-inference-solution-at-the-edge-promising-low-latency-ai-experiences-20240611), [Gcore press release](https://gcore.com/press-releases/gcore-unveils-inference-at-the-edge-bringing-ai-applications-closer-to-end-users-for-seamless-real-time-performance)
- FastEdge is a WebAssembly serverless edge in "more than 210 data centers". Its page says "average global latency is just 30 ms" and "Cold start in microseconds", with JavaScript and Rust support. Listed use cases include AI inference, personalization, A/B testing and "Quick authentication" — [Gcore FastEdge](https://gcore.com/fastedge)
- PoP count differs by page: 180+ in the Everywhere Inference docs, 210+ in the Everywhere AI post and on the FastEdge page — [docs](https://docs.gcore.com/edge-ai/everywhere-inference), [blog](https://gcore.com/blog/introducing-everywhere-ai), [FastEdge](https://gcore.com/fastedge)

#### Akamai
- On Oct 28, 2025 Akamai announced Inference Cloud, built on NVIDIA RTX PRO 6000 Blackwell Server Edition GPUs, BlueField-3 DPUs and BlueField-4. It was "Targeting 20 initial locations globally", with requests routed over its 4,200+ edge locations. Target uses include "fraud detection and secure payments", "real-time financial insights and decisioning" and multi-step agentic workflows. Tom Leighton: "putting AI's decision-making in thousands of locations worldwide" — [Akamai press release (SEC 8-K Ex. 99.1)](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm)
- On Mar 3, 2026 Akamai said it would deploy "thousands" of RTX PRO 6000 Blackwell GPUs. It did not say how many of its 4,400 locations would get GPUs. Claims: "reducing latency up to 2.5x" and saving "as much as 86%" versus hyperscalers. Quote: "Centralized AI factories remain essential for building models, but bringing those models to life at scale requires a decentralized nervous system." — [Akamai press release](https://www.akamai.com/newsroom/press-release/akamai-to-deploy-thousands-of-nvidia-blackwell-gpus-to-create-one-of-the-worlds-most-widely-distributed-ai-platforms)
- CRN Asia (2026; exact date not shown) describes a split: the 4,400+ edge locations handle "lighter inference and request routing", while multi-thousand-GPU clusters sit in core and metro-edge data centers. It cites a "$200 million, four-year agreement for a multi-thousand GPU cluster in one metro-edge facility" and says "Gaming companies are using the platform to deliver sub-50 millisecond AI-driven interactions" — [CRN Asia](https://www.crnasia.com/india/news/2026/akamai-takes-ai-inference-to-the-edge-with-nvidia-powered-grid-across-4-400-locations)
- RTX PRO 6000 Blackwell Server Edition specs: 96 GB GDDR7 ECC, up to 1.6 TB/s, MIG up to 4 × 24 GB, 400–600 W (search excerpt) — [NVIDIA](https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/), [Lenovo Press](https://lenovopress.lenovo.com/lp2263.pdf)

#### Fastly
- "Fastly is a high-performance delivery and optimization layer that sits in front of your existing AI infrastructure and LLM providers". The fetch tool's summary added "Fastly does not run GPU inference". Products: AI Accelerator (semantic caching), AI Runtime Control, AI Firewall, AI Bot Management, and Compute for "low-latency agents and real-time personalization". Fastly claims AI traffic grows "6.5X faster than human traffic" — [Fastly for AI](https://www.fastly.com/products/ai)
- AI Accelerator launched Jun 13, 2024 — [Fastly IR](https://investors.fastly.com/news-releases/news-release-details/fastly-helps-developers-build-better-internet-new-ai-accelerator). Press headline: "9x faster response times" — [EdgeIR, Dec 18 2024](https://www.edgeir.com/fastlys-ai-accelerator-tackles-generative-ai-bottlenecks-with-9x-faster-response-times-20241218)

#### Vercel, Netlify, Bunny.net
- Vercel: no evidence found of Vercel-run GPU inference. Its relevant edge-decision product is BotID, a Kasada-powered ML bot check (see Sections 3–4) — [Vercel BotID docs](https://vercel.com/docs/botid)
- Netlify: Edge Functions handle "personalization, redirects, A/B routing, access checks". AI Gateway proxies to OpenAI, Anthropic, Google and open models, billed at 180 Netlify credits per $1 of provider cost (search excerpts) — [Netlify AI Gateway](https://www.netlify.com/platform/ai-gateway/), [Netlify AI pricing docs](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/pricing-for-ai-features/)
- Bunny.net: Magic Containers run on CPUs and NVMe across 40+ regions. Bunny ran a DeepSeek R1 demo through Ollama and teased "GPU-powered edge servers" as "coming next" (search excerpts; date of the X post not verified) — [Bunny blog](https://bunny.net/blog/deploying-deepseek-r1-on-magic-containers-ai-inference-at-the-edge/), [Bunny on X](https://x.com/BunnyCDN/status/1906711528578892224)

#### Fly.io (counter-evidence)
- Fly.io: "developers don't want GPUs. They don't even want AI/ML models. They want LLMs." Also: "inference latency just doesn't seem to matter yet". GPU servers were "drastically less utilized and thus less cost-effective than ordinary servers", and only L40S saw real adoption. The post is undated in the fetch — [Fly.io blog](https://fly.io/blog/wrong-about-gpu/)
- "Fly.io GPUs will be fully deprecated as of July 31, 2026" (thread opened Feb 11, 2026) — [Fly.io community](https://community.fly.io/t/gpu-migration-fly-io-gpus-will-be-deprecated-as-of-july-31-2026/27110)

#### Hyperscaler CDNs
- CloudFront Functions: JavaScript, "Submillisecond", 2 MB memory, 10 KB code, no network access, "millions of requests per second". Lambda@Edge: Node.js or Python, up to 30 s, 128 MB memory for viewer events (10 GB for origin events), up to 10,000 requests/s per Region. No GPU option appears in the comparison — [AWS docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html)
- Azure Front Door "Edge Actions" (public preview, Jul 2026): JavaScript in a Hyperlight micro-VM, "16KB max per action", "10ms max per request" and no network calls. Uses: A/B testing, request rejection, origin selection, UA blocking — [navsplace, Jul 14 2026 (secondary)](https://www.navsplace.net/azure-front-door-edge-actions-serverless-compute-20260714/). Microsoft's own post is titled "...programmable compute for a secure, resilient, AI-ready edge" (its body did not render) — [Microsoft Tech Community](https://techcommunity.microsoft.com/blog/azurenetworkingblog/azure-front-door-edge-actions-programmable-compute-for-a-secure-resilient-ai-rea/4542177)

#### Telco / MEC: NVIDIA "AI Grid"
- Mar 17, 2026: NVIDIA defines an AI grid as "Geographically distributed and interconnected AI infrastructure". Telcos run "about 100,000 distributed network data centers worldwide". Spectrum has "more than 1,000 edge data centers" with capacity "less than 10 milliseconds away from 500 million devices". Comcast's validation showed "significantly higher throughput and lower cost per token" during demand spikes. T-Mobile is exploring RTX PRO 6000 GPUs and AT&T is building an IoT AI grid with Cisco. Akamai's grid spans "more than 4,400 edge locations with thousands of NVIDIA RTX PRO 6000" GPUs. Target workloads: small language models, vision AI, voice agents — [NVIDIA blog](https://blogs.nvidia.com/blog/telecom-ai-grids-inference)
- Critical industry commentary: "Nvidia's AI grid and the telco dilemma" (not fetched) — [RCR Wireless, Apr 10 2026](https://www.rcrwireless.com/20260410/ai/nvidias-ai-grid-telco)

#### Market-size reports (use with caution)
- Edge AI market estimates for 2026 (search excerpts):
  - Grand View: $30.0B, rising to $118.7B by 2033 — [Grand View](https://www.grandviewresearch.com/industry-analysis/edge-ai-market-report)
  - GMI: $30.9B — [GMI](https://www.gminsights.com/industry-analysis/edge-ai-market)
  - Research and Markets: $37.51B, rising to $102.97B by 2030 — [R&M](https://www.researchandmarkets.com/reports/6226171/edge-ai-market-report)
  - Fortune Business Insights: $46.96B, rising to $445.75B by 2034 — [FBI](https://www.fortunebusinessinsights.com/edge-ai-market-107023)
  - ABI (chipsets only): $34.4B in 2026, rising to $96B in 2031 — [ABI](https://www.abiresearch.com/blog/edge-ai-market-trends)

### Inferences
- "Edge" means three different things today:
  - **PoP-level GPUs:** only Cloudflare, with GPUs in ~69% of its cities (230/335).
  - **Regional or metro GPU clusters behind an anycast PoP network:** Akamai, Gcore and the telco AI grids.
  - **CPU-only edge plus LLM proxying or caching:** Fastly, Vercel, Netlify, CloudFront, Azure Front Door and Bunny (for now).

  For the thesis, the honest wording is "decision models belong near the edge". For most providers that means a GPU region within ~10–30 ms RTT of the PoP, not in every PoP.
- Memory fit (rough arithmetic: params × bytes; excludes activations and KV cache):
  - Clef 27B in BF16 needs about 54 GB of weights. It fits one H100 80 GB (Gcore €1.53/h), one RTX PRO 6000 96 GB (Akamai's GPU) or one H200.
  - It does not fit one L40S 48 GB (Gcore €1.08/h) unless quantized to FP8 (~27 GB) or split across 2×L40S.
  - Clef-flash 9B in BF16 is ~18 GB. It fits easily on one L40S and might squeeze into a 24 GB MIG slice of an RTX PRO 6000, but that is unverified and tight for long-context prefill.
- Cloudflare's latency numbers come from a single H200, a top-end data-center GPU. Edge GPUs such as the L40S or RTX PRO 6000 (up to 1.6 TB/s memory bandwidth per NVIDIA) are likely slower for this prefill-heavy workload, so expect Clef-flash latency above 38.8 ms on them. This is unmeasured, and H200 and L40S specs were not gathered here.
- Network proximity matters mainly for Clef-flash. A 50–100 ms round trip to a distant region would double or triple a 39 ms decision. For Clef (209 ms) or the 2.2 s Browser Run workflow, the network adds only marginally. So PoP-level GPUs are a real advantage only for the fast model in the request path.
- Omni sends each request to "the closest Omni instance that has available capacity". Even on Cloudflare, a Clef call may leave the PoP when local GPUs are busy or the model isn't loaded there. Edge latency is therefore best-effort, not guaranteed.

### Gaps
- Cloudflare does not say in which of its 230+ GPU cities Clef or Clef-flash is resident, or which GPU types are in which cities.
- Gcore does not publish how many of its 180–210+ PoPs have GPUs. Akamai's GPU location count as of Oct 2026 was not found.
- No evidence found of GPU inference at the Vercel or Netlify edge. Bunny's "GPU-powered edge servers" release status is unverified.
- The Microsoft primary source for Azure Edge Actions limits could not be rendered, so those limits come from a secondary source.
- The edge AI market figures mostly size device and on-prem edge AI (chips, IoT, PCs), not CDN-hosted inference. No reliable sizing of "network-edge inference for CDNs" was found.

---

## 2. Latency budgets: what can a CDN afford inline, what must be cached per key, and what belongs off the request path?

### Takeaway
CDNs budget microseconds for per-request ML. Cloudflare's bot detection requirement is ≤100 µs added per request, and its WAF ML runs in 275 µs. Clef-flash's 38.8 ms median (122 ms p95) is roughly 100–1,000× over those budgets, so a decision model cannot score every request. It fits in four places:
1. Inline on a small set of high-value routes, such as login, signup, checkout, APIs and LLM endpoints, where tens of ms are acceptable.
2. As a per-key cached decision (per ASN, IP, fingerprint, URL or content hash), computed once and reused.
3. Asynchronously next to the request, so the decision applies to later requests.
4. In non-request workflows that run in seconds to minutes, such as upload moderation, abuse reports, SOC alerts and support tickets.

### Cited Findings
- Cloudflare Bot Management requirement (2020): "not slowing down request processing by more than 100 microseconds". "less than 50 microseconds to apply any of our models"; "hundreds of heuristics can be applied just under 20 microseconds" — [Cloudflare blog, May 6 2020](https://blog.cloudflare.com/cloudflare-bot-management-machine-learning-and-more/)
- After the 2023 rewrite from Lua to Rust, the bot management module's p50 fell from 388 to 309 µs and its p99 from 940 to 813 µs. ML detections are ~15% of the module's latency — [Cloudflare blog, Jun 19 2023](https://blog.cloudflare.com/how-cloudflare-runs-ml-inference-in-microseconds/)
- WAF attack-score inference fell from 1,519 µs to 275 µs (5.5×). The last step was adding an LRU cache, which took it from 552 to 275 µs. Scale: "9.5 million requests per second passing through WAF ML" with a "~70% cache hit ratio" — [Cloudflare blog, Jul 25 2024](https://blog.cloudflare.com/making-waf-ai-models-go-brr/)
- CloudFront Functions run in "Submillisecond" time — [AWS docs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/edge-functions-choosing.html). Azure Front Door Edge Actions allow "10ms max per request" and no network calls — [navsplace (secondary)](https://www.navsplace.net/azure-front-door-edge-actions-serverless-compute-20260714/)
- Page-level budget: TTFB "good" is ≤0.8 s, "needs improvement" 0.8–1.8 s, "poor" >1.8 s — [web.dev](https://web.dev/articles/ttfb)
- The closest existing example of a GPU classifier in a CDN request path is Cloudflare's Firewall for AI, which runs Llama Guard 3 on Workers AI. "a Cloudflare Worker makes parallel, non-blocking requests to our different detection modules". "We also enforce a hard 2-second threshold for each analysis; if this time limit is reached, we fall back to any detections already completed". Results appear as WAF fields such as `cf.llm.prompt.unsafe_topic_categories` — [Cloudflare blog, Aug 26 2025](https://blog.cloudflare.com/block-unsafe-llm-prompts-with-firewall-for-ai/)
- Vercel BotID adds protection "to high-value routes, such as checkouts, signups, and APIs". The server-side `checkBotId()` triggers Deep Analysis, and "Passive page views or requests that don't invoke the `checkBotId()` function are not charged" — [Vercel BotID docs (updated 2026-06-16)](https://vercel.com/docs/botid)
- Out-of-band examples:
  - BotID Deep Analysis traced a 500% traffic spike to a bot network and "reclassified and blocked those sessions within roughly 10 minutes" (search excerpt) — [Vercel blog](https://vercel.com/blog/botid-deep-analysis-catches-a-sophisticated-bot-network-in-real-time)
  - AI Labyrinth pre-generates decoy pages with Workers AI, sanitizes them and stores them in R2 "for faster retrieval" instead of generating inline (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/ai-labyrinth/)
- Async workflows and their timelines:
  - Clef plus Browser Run classifies a domain in 2.2 s, versus 4.7 s for gpt-oss-120b — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
  - Cloudflare's hosted-phishing reports went from a 3.4-day median time to action (H1 2024) to "under an hour" (H2 2024) — [Cloudflare blog, Mar 17 2025](https://blog.cloudflare.com/how-cloudflare-is-using-automation-to-tackle-phishing/)
  - In the SOC, "56 minutes pass on average before anyone acts on an alert" and investigation takes 70 minutes — [The Hacker News / Prophet Security, Sep 2025](https://thehackernews.com/2025/09/the-state-of-ai-in-soc-2025-insights.html)
- Latency figures marketed by edge providers:
  - Gcore FastEdge: "average global latency is just 30 ms" — [Gcore](https://gcore.com/fastedge)
  - Akamai gaming customers: "sub-50 millisecond AI-driven interactions" — [CRN Asia](https://www.crnasia.com/india/news/2026/akamai-takes-ai-inference-to-the-edge-with-nvidia-powered-grid-across-4-400-locations)
  - Spectrum: "less than 10 milliseconds away from 500 million devices" — [NVIDIA](https://blogs.nvidia.com/blog/telecom-ai-grids-inference)

### Inferences
- Share of the 800 ms "good" TTFB budget: Clef-flash median 38.8 ms ≈ 4.8%, Clef-flash p95 122.4 ms ≈ 15.3%, Clef median 209.3 ms ≈ 26%, Clef p95 238.6 ms ≈ 30%. A CDN serves cached content in a few ms of server time, so even 39 ms is a large relative slowdown there. On an uncached dynamic route (origin TTFB in the hundreds of ms) it is small.
- Proposed placement tiers:

| Tier | Latency budget | What runs there | DM role |
|---|---|---|---|
| T0: every request | ≤0.1–1 ms | CatBoost/TFLite on CPU (bot score, WAF score), CloudFront Functions, Azure Edge Actions | None. Too slow by 2–3 orders of magnitude |
| T1: selected routes, inline | ~40–150 ms | Login, signup, checkout, password reset, high-cost APIs, uncertain bot-score band | Clef-flash, time-boxed with a fallback (like Firewall for AI's 2 s ceiling, but ~100 ms) |
| T2: slow endpoints, inline | ≤1–2 s | LLM/agent endpoints, MCP tools, paid APIs (x402) | Clef: 209 ms is small next to LLM response times; replaces or augments Llama Guard |
| T3: cached per key | first decision async, then ~0 ms | Per ASN, IP range, TLS/JA4 fingerprint, UA string, Web Bot Auth key, URL or content hash, session | Either model; result stored in KV or cache with a TTL, as WAF ML's LRU cache does at a ~70% hit rate |
| T4: out of band | seconds to minutes | Upload/VOD moderation, live thumbnails, abuse/phishing reports, SOC alerts, support tickets, email, crawler reclassification, domain categorization | Clef (accuracy over speed), optionally with Browser Run |

- Patterns that hide decision-model latency:
  - **Escalate only the uncertain:** classic ML scores everything, and only scores in the ambiguous middle go to the DM.
  - **Run beside the origin fetch:** start the DM call in parallel with the origin fetch, so it adds latency only if it is slower than the origin.
  - **Act on the first request now, decide later:** serve or challenge the first request with cheap rules, and let the DM verdict apply to the rest of the session or key.
  - **Pre-compute:** generate outputs ahead of time and store them, as AI Labyrinth does in R2.

### Gaps
- No public measurement found of Worker-to-Workers AI call overhead within one PoP, or of Clef latency under concurrent load and batching. Cloudflare's 38.8 ms is a benchmark median on an H200.
- No authoritative CDN-wide numbers found on how long customers tolerate an added inline delay on dynamic routes. TTFB guidance is page-level.
- Image inputs: no published figures on Clef's latency or token count per image.

---

## 3. Precedents: ML already running at CDN edges (what, how fast, how big)

### Takeaway
CDNs already run ML on most requests, but those models are small CPU models (CatBoost gradient-boosted trees, TFLite) running in microseconds with fixed labels. GPU and LLM classifiers exist but are confined to specific endpoints (Llama Guard in Firewall for AI), to pre-generation (AI Labyrinth) or to offline discovery (LLMs in email security, phishing triage). Decision models would fill a new middle tier: milliseconds, schemas that can change without retraining, and calibrated probabilities.

### Cited Findings

#### Cloudflare
- Scale (2023): "over 46 million HTTP requests per second, surging to more than 63 million requests per second during peak times". Per the fetched summary, Bot Management ML classifies "over 72%" of HTTP requests. The redesigned ML serving path (BLISS, a Rust sidecar and library) cut latency from p50 532 µs to 9 µs and p99 9,510 µs to 18 µs. The summary does not make clear whether that covers feature fetching or inference — [Cloudflare blog, Jun 19 2023](https://blog.cloudflare.com/scalable-machine-learning-at-cloudflare/)
- Bot Management uses CatBoost ("gradient boosting on decision trees"). "multiple CatBoost models run on Cloudflare's Edge in the shadow mode on every request on every machine". Customers set bot-score thresholds in firewall rules — [Cloudflare blog, May 6 2020](https://blog.cloudflare.com/cloudflare-bot-management-machine-learning-and-more/)
- WAF attack score: requests are normalized, then features extracted, then TFLite inference produces a 1–99 score for SQLi, XSS, command injection and RCE. It runs on CPU (AVX2/XNNPACK) at 275 µs per request after optimization and handles 9.5M rps. Cloudflare says this saves "approximately 32 years of processing time every single day" — [Cloudflare blog, Jul 25 2024](https://blog.cloudflare.com/making-waf-ai-models-go-brr/)
- Firewall for AI runs Llama Guard 3 on Workers AI GPUs in parallel, non-blocking, with a 2-second ceiling — [Cloudflare blog, Aug 26 2025](https://blog.cloudflare.com/block-unsafe-llm-prompts-with-firewall-for-ai/). Workers AI list price for llama-guard-3-8b: $0.484 per M input tokens and $0.030 per M output — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- AI crawler detection (2023) relies on "attack signature matching, heuristics, machine learning, and behavioral analysis" and is available on all plans, including free — [Cloudflare blog, Sep 29 2023](https://blog.cloudflare.com/ai-bots/)
- In 2026 bot classification moved from "AI or not" to behaviour. Main categories: Search ("collects or indexes your content"), Agent ("acting, usually in real time, on a person's behalf") and Training. Further categories: Data Collection, Security Testing, SEO, Ads Verification, Social/Link Preview, Feed Fetching, Monitoring & Operations. From Sep 15, 2026, Training and Agent bots are blocked by default on ad-monetized pages, and multi-purpose crawlers (Googlebot, Applebot, BingBot) "follow the most restrictive rule" — [Cloudflare blog, Jul 1 2026](https://blog.cloudflare.com/content-independence-day-ai-options/)
- AI Labyrinth uses "Workers AI with an open source model to create unique HTML pages", pre-generated, sanitized against XSS and stored in R2. It doubles as a honeypot: "no real human would go four links deep" (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/ai-labyrinth/)
- The CSAM Scanning Tool fuzzy-hashes images "as they enter the Cloudflare cache" and compares them with known-CSAM hash lists from groups such as NCMEC. It matches known content only (search excerpt) — [Cloudflare docs](https://developers.cloudflare.com/cache/reference/csam-scanning/)
- Email Security (Mar 3, 2026): "LLMs act as the discovery layer by surfacing new linguistic variants, while the specialized model performs fast and scalable enforcement". Analysis happens after delivery and feeds retraining. Reported misses for "Sales Outreach" phishing fell 20.4% between Q3 and Q4 2025, and average daily submissions fell by two-thirds in Q1 2026 — [Cloudflare blog](https://blog.cloudflare.com/email-security-phishing-gap-llm/)
- Phishing abuse-report pipeline: the URL Scanner runs first, then "Machine learning classifiers" on HTML and page resources. IOCs go to threat feeds and domain-categorization tools, and rules mirror "how T&S investigators have traditionally responded". Automated resolution rose from 37% (H1 2024) to 78% (H2 2024) — [Cloudflare blog, Mar 17 2025](https://blog.cloudflare.com/how-cloudflare-is-using-automation-to-tackle-phishing/)
- Domain threat detection extends pre-trained transformer networks to spot DGA domains (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/threat-detection-machine-learning-models/)
- Fraud Detection uses "machine learning models" against fake signups, account takeover and carding (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/cloudflare-fraud-detection/). Account Abuse Protection entered Early Access (Mar 12, 2026) with disposable-email and email-risk checks and hashed user IDs (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/account-abuse-protection/)
- Planned Clef uses inside Cloudflare: "evaluate Trust & Safety submissions, help us triage Cloudflare Support requests, or even to be built-in to our Bot products to decide if a crawler is a good bot or bad bot". The Threat Intelligence team already uses it for domain classification — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

#### Others
- Akamai Bot Manager uses "AI models for user behavior analysis, browser fingerprinting" and assigns "a score from 0 (human) to 100 (bot), looking at all anomalies, starting with the very first request". Responses are tiered Cautious, Strict or Aggressive. Akamai claims "visibility into more than 40 billion bots a day" and offers a "Verify Your Bot or AI Agent with Akamai" registration — [Akamai Bot Manager](https://www.akamai.com/products/bot-manager)
- Gcore WAAP (Sep 17, 2024): "Advanced AI analyzes traffic patterns, automatically detecting and mitigating threats". No model metrics are published — [Gcore blog](https://gcore.com/blog/waap-launch). An "AI-driven IP filtering profiler that analyzes daily traffic patterns from known users" (search excerpt) — [Gcore blog](https://gcore.com/blog/how-ai-enhances-bot-protection-waap)
- Gcore Video AI moderates NSFW, hard and soft nudity and sports, for VOD only, using "multiple AI models running on owned infrastructure" — [Gcore](https://gcore.com/streaming-platform/ai-for-video)
- Vercel BotID Deep Analysis, powered by Kasada, "uses machine learning to analyze thousands of client side signals" and changes "detection methods on every page load" — [Vercel docs](https://vercel.com/docs/botid). Launched Jun 25, 2025 (search excerpt) — [Kasada](https://www.kasada.io/kasada-and-vercel-launch-botid/)
- Fastly offers AI Bot Management ("Detect and control the AI crawlers scraping your content") and an AI Firewall — [Fastly](https://www.fastly.com/products/ai)

### Inferences
- The existing division of labour:
  - Classic CPU ML runs on every request (µs, fixed labels, retrain to add a class).
  - GPU or LLM models run on few requests or offline (seconds, open-ended, costly).
  - Cloudflare's own email-security design confirms the split: LLMs find new patterns offline, and a specialized model enforces inline.

  A DM fits between the two: ~40–200 ms, typed probabilities, and new categories by editing the schema instead of retraining. Cloudflare's 2026 move to behavioural categories (Search, Agent, Training plus ~7 others) is the kind of moving taxonomy that strains fixed-label classifiers.
- A DM can also label data for CPU models. It can label ambiguous traffic offline and those labels can train the µs-tier CatBoost or TFLite models, as the email pipeline does with LLMs. That suggests DM GPU demand may be "a labelling and escalation tier", not "a per-request tier".
- Firewall for AI shows Cloudflare already accepts a GPU model in the request path when the protected request (an LLM prompt) is slow. Clef-flash is ~5× cheaper per 500-token prompt than Llama Guard 3 at list price (see Section 4) and can answer several questions in one pass, so it is a natural replacement candidate. Cloudflare has not announced this.

### Gaps
- No public details found on model sizes or latency for Akamai Bot Manager, Fastly Next-Gen WAF or AI Bot Management, or Gcore WAAP ML.
- The AI Labyrinth "Maze, Summary, Poison" modes in one search excerpt were not verified on the original post.

---

## 4. Economics: cost per decision (Clef vs LLM vs classic ML), and how deterministic, cacheable decisions change the math

### Takeaway
At Workers AI list prices (Oct 1, 2026), a 500-token Clef-flash decision costs $0.000045, or $45 per million. Clef costs $120 per million. Both are input-only pricing because no output tokens are generated. Once output and reasoning tokens are counted, Clef-flash is roughly 4–9× cheaper than a general LLM on the same platform; Clef is only ~1.5–3× cheaper. Clef-flash is also ~5× cheaper than Llama Guard 3. But it is ~45,000× more than a 50 µs CPU model and ~150× more than a Workers request. So scoring all CDN traffic is impossible, and the business case rests on routing a small fraction of requests to the DM and caching its verdicts. The economics compare well with what customers already pay for premium decisions: Vercel charges $1 per 1,000 BotID Deep Analysis calls ($1,000 per million).

### Cited Findings
- Workers AI pricing (Oct 1, 2026): "$0.011 per 1,000 Neurons", with "10,000 Neurons per day at no charge" — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
  - Clef: $0.240 per M input tokens (21,818 neurons per M input tokens)
  - Clef-flash: $0.090 per M input tokens (8,182 neurons per M)
  - llama-3.1-8b-instruct: $0.282 in / $0.827 out per M
  - llama-3.3-70b-fp8-fast: $0.293 / $2.253
  - gpt-oss-120b: $0.350 / $0.750
  - gpt-oss-20b: $0.200 / $0.300
  - qwen3-30b-a3b-fp8: $0.051 / $0.335
  - llama-guard-3-8b: $0.484 / $0.030
  - distilbert-sst-2-int8: $0.026 per M input
  - bge-large-en-v1.5: $0.204 per M input
  - ResNet-50: $2.51 per M images
- The Clef model page lists only "$0.24 per M input tokens", with no per-request fee — [Workers AI Clef docs](https://developers.cloudflare.com/workers-ai/models/clef)
- Cloudflare Workers Standard (no AI): $0.30 per additional million requests and $0.02 per additional million CPU-ms. KV: $0.50 per million reads, $5.00 per million writes, $0.50 per GB-month — [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- AI Gateway caching "applies only to identical requests" and keys on a hash of provider, endpoint, model, auth header and "the complete request body". "Any difference in the body ... will result in a separate cache entry". TTL ranges from 60 s to one month, with a 5-minute default when using a custom cache key. Headers: `cf-aig-cache-ttl`, `cf-aig-skip-cache`, `cf-aig-cache-key`. Semantic caching is "planned" — [AI Gateway caching docs](https://developers.cloudflare.com/ai-gateway/features/caching/)
- Example of cached ML verdicts at the edge: the WAF ML LRU cache halved latency (552 to 275 µs) at a ~70% hit ratio — [Cloudflare blog](https://blog.cloudflare.com/making-waf-ai-models-go-brr/)
- What customers pay today for a premium per-request decision: Vercel BotID Deep Analysis is "$1/1000 `checkBotId()` Deep Analysis calls" on Pro and custom on Enterprise. Basic is free — [Vercel BotID docs](https://vercel.com/docs/botid)
- Self-hosting reference prices are Gcore's per-hour GPU rates (Section 1): 1×L40S €1.08 and 1×H100 €1.53 — [Gcore AI pricing](https://gcore.com/pricing/ai)
- Traffic scale (2023): Cloudflare averages 46M+ HTTP requests per second, peaking above 63M — [Cloudflare blog](https://blog.cloudflare.com/scalable-machine-learning-at-cloudflare/)
- Clef runs a "prefill-only pass, then scores the valid schema choices in parallel" with no autoregressive decoding. The blog describes decision models as producing outputs "cheaply, quickly and consistently" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- Privacy: "we don't read, store, or train on your requests or responses (unless you want to use our fine-tuning product)" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

### Inferences
- Cost per decision, my arithmetic from the list prices above (token counts are assumptions):

| Model | Input / output tokens | $ per decision | $ per 1M decisions |
|---|---|---|---|
| Clef-flash | 200 / 0 | 0.000018 | 18 |
| Clef-flash | 500 / 0 | 0.000045 | 45 |
| Clef-flash | 2,000 / 0 | 0.00018 | 180 |
| Clef | 500 / 0 | 0.00012 | 120 |
| Clef | 2,000 / 0 | 0.00048 | 480 |
| llama-3.1-8b | 500 / 50 | 0.000182 | 182 |
| gpt-oss-20b | 500 / 300 (reasoning + JSON) | 0.00019 | 190 |
| gpt-oss-120b | 500 / 50 | 0.000213 | 213 |
| gpt-oss-120b | 500 / 300 | 0.0004 | 400 |
| llama-guard-3-8b | 500 / 10 | 0.000242 | 242 |
| distilbert-sst-2 (fixed labels) | 500 / 0 | 0.000013 | 13 |
| CPU model, 50 µs (Workers CPU price) | n/a | 0.000000001 | 0.001 |
| Vercel BotID Deep Analysis | n/a | 0.001 | 1,000 |
| Workers request fee (reference) | n/a | 0.0000003 | 0.30 |
| KV read (cached verdict) | n/a | 0.0000005 | 0.50 |

- Clef's price per token is not dramatically lower than small LLMs' input pricing. Its cost edge comes from three things: no output or reasoning tokens, up to 64 questions answered in one prefill (one call can return bot intent, risk, category and price tier together), and predictable cost per call.
- Scale check, using the 2023 traffic figure and list prices (an illustration, not Cloudflare's internal cost):

| Share of requests sent to Clef-flash (500 tokens) | Decisions per day | Cost per day |
|---|---|---|
| All 46M rps | ~4.0 trillion | ~$179M |
| 1% | ~40 billion | ~$1.8M |
| 0.01% | ~400 million | ~$18k |

  A CDN can only afford DMs on a small, high-value slice, or with very high cache hit rates.
- Caching math. Blended cost = hit rate × $0.50/M for a KV read + miss rate × ($45/M for a fresh Clef-flash call + $5/M for a KV write):

| Cache hit rate | Blended cost per 1M decisions |
|---|---|
| 0% | ~$50 |
| 90% | ~$5.45 |
| 99% | ~$0.95 |

  Per-key decisions (per ASN, IP range, JA4/TLS fingerprint, Web Bot Auth key, UA string, URL template or content hash) can reach high hit rates because the key space is much smaller than request volume. That is the mechanism that would make DMs affordable at CDN scale.
- Determinism and caching. Clef scores a fixed set of options in one forward pass rather than sampling, so identical inputs should produce identical or near-identical probabilities. That makes cached verdicts reusable and auditable. Two caveats:
  - GPU floating-point batch effects may cause tiny variations. This is unverified.
  - AI Gateway caches only byte-identical bodies, so the provider must normalize inputs: drop timestamps and request IDs, and bucket numeric features before building the cache key.

  Sampled LLM outputs are harder to cache safely because the same input can legitimately produce different answers.
- Self-hosting sensitivity on Gcore GPU prices. The throughput figures are assumptions, not measurements:

| GPU | 25 decisions/s (sequential at ~40 ms) | 100 decisions/s | 400 decisions/s |
|---|---|---|---|
| 1×L40S at €1.08/h | €12 per 1M | €3.00 per 1M | €0.75 per 1M |
| 1×H100 at €1.53/h | €17 per 1M | €4.25 per 1M | €1.06 per 1M |

  Prefill-only workloads usually batch well, so a well-utilized GPU could beat Cloudflare's list price. Fly.io's experience shows that utilization, not the hourly price, is the real risk.
- Free tier: 10,000 neurons/day ≈ 1.22M Clef-flash input tokens ≈ ~2,400 decisions/day at 500 tokens. That is enough for prototypes and small workflows such as support or abuse triage, not for traffic decisions.

### Gaps
- Not found: the token count of an image in Clef, measured throughput (decisions per second per GPU), whether AI Gateway cache hits on Workers AI models are billed (the docs don't say), and Cloudflare's internal cost per decision.
- No published hit rates for per-key bot or agent verdict caches. The ~70% WAF ML LRU figure is the only data point, and it covers a different signal.
- Typesafe's Jev pricing is covered by another team. It is needed for a full competitive cost comparison.

---

## 5. Candidate business use cases for CDN, edge and content-delivery companies and their customers

### Takeaway
The strongest cases share four traits: the CDN already sits in the data path, the label set changes faster than classic ML can be retrained, a wrong decision is costly, and only a small slice of traffic needs the decision. In rough order of strength:
1. AI-crawler and agent intent classification, plus gating and monetization: Search, Agent or Training; signed or unsigned; price tier.
2. Account-abuse, signup and checkout decisions on high-value routes.
3. Prompt and response firewalls for LLM endpoints.
4. UGC and VOD moderation at upload, extended to live thumbnails and age or geo-compliance ratings.
5. Trust & Safety abuse-report and phishing triage.
6. SOC, WAF false-positive and support triage. These are real operational pain but run off the request path, so the "edge" adds little there.

Smart caching, origin routing and A/B bucketing are weak fits. They are numeric or hash problems where classic ML and control loops win.

### Cited Findings

#### 5.1 Bot and AI-crawler intent classification, and crawl pricing tiers
- **Pain and scale:**
  - Imperva puts automated traffic at "more than 53% of all web traffic in 2025, up from 51%". API endpoints draw 27% of bot attacks, and financial services take 24% of bot attacks and 46% of account-takeover incidents — [Imperva, Apr 29 2026](https://www.imperva.com/blog/bad-bot-report-2026-bots-agentic-age/). A search excerpt of the same report says bad bots were 40% of traffic, up from 37% (not confirmed in the fetched text).
  - Cloudflare's CEO said on Jun 3, 2026 that bots had passed humans in web-page traffic, at ~57% (secondary) — [Forbes, Jun 4 2026](https://www.forbes.com/sites/josipamajic/2026/06/04/bots-now-outnumber-humans-online-and-the-internet-was-never-built-for-this/), [Media Copilot](https://mediacopilot.ai/bots-passed-human-traffic-online-cloudflare-ceo/)
  - HUMAN Security reported that AI-agent and agentic-browser traffic grew ~8,000% in 2025 (secondary, search excerpt) — [Semrush](https://www.semrush.com/blog/ai-agent-bot-traffic/)
- **Pages crawled per referral sent back** (Cloudflare Radar data, July 2026; secondary): Mistral 3,389:1, Anthropic 2,237:1, Perplexity 225:1, OpenAI 217:1, Microsoft 35:1, Google 4.6:1 — [SEOmator](https://seomator.com/blog/crawl-to-refer-ratio-ai-crawlers-llm-bots)
- **Today:**
  - Cloudflare's behavioural categories and Sep 15, 2026 defaults (Section 3) — [Cloudflare, Jul 1 2026](https://blog.cloudflare.com/content-independence-day-ai-options/)
  - Classic-ML bot scores — [Cloudflare 2020](https://blog.cloudflare.com/cloudflare-bot-management-machine-learning-and-more/), [Akamai](https://www.akamai.com/products/bot-manager)
  - Fastly AI Bot Management — [Fastly](https://www.fastly.com/products/ai)
  - Cloudflare plans to use Clef "to decide if a crawler is a good bot or bad bot" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.2 AI agent traffic gating, authorization and monetization (Web Bot Auth, signed agents, x402, Pay Per Use)
- **Today:**
  - Web Bot Auth uses HTTP message signatures to verify bots and agents. "Signed agents" are user-directed agents whose platforms sign requests. The first cohort was ChatGPT agent, Goose (Block), Browserbase and Anchor Browser (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/signed-agents/)
  - Cloudflare and Coinbase launched the x402 Foundation (search excerpt) — [Cloudflare blog](https://blog.cloudflare.com/x402/)
  - Monetization Gateway, closed beta, Sep 30, 2026: sellers "charge agents for access to their website, APIs, MCP tools, or datasets". "You write pricing rules that match any part of a request, such as the URL, headers, or query parameters". Settlement is in USDC on Base, and API2PDF uses variable maximum-price quoting. The post does not mention ML-based classification or pricing — [Cloudflare blog](https://blog.cloudflare.com/monetization-gateway-beta/)
  - Pay Per Use, beta, Sep 30, 2026: "Pay Per Crawl...charges for access. Pay Per Use pays for what happens next." AI companies self-report use as "one line of JSON", and "Cloudflare checks that each reported use maps to an enrolled publisher". No ML is mentioned — [Cloudflare blog](https://blog.cloudflare.com/pay-per-use/)
  - Akamai offers bot and agent registration ("Verify Your Bot or AI Agent") — [Akamai](https://www.akamai.com/products/bot-manager)

#### 5.3 Prompt and response firewalls for customers' LLM and agent endpoints
- **Today:** Cloudflare Firewall for AI runs Llama Guard 3 on Workers AI, in parallel, with a 2-second ceiling. Results appear as WAF fields — [Cloudflare blog, Aug 26 2025](https://blog.cloudflare.com/block-unsafe-llm-prompts-with-firewall-for-ai/). Fastly offers an "AI Firewall" — [Fastly](https://www.fastly.com/products/ai)

#### 5.4 Account abuse, fake signups and checkout fraud on high-value routes
- **Pain:**
  - Juniper Research (2023 forecast, so dated) put cumulative online payment fraud losses at more than $362B over five years — [PR Newswire / Juniper](https://www.prnewswire.com/apac/news-releases/juniper-research-losses-from-online-payment-fraud-to-exceed-362-billion-globally-over-next-5-years-as-ecommerce-growth-in-emerging-markets-accelerates-fraud-301862532.html)
  - Financial services take 46% of account-takeover incidents — [Imperva](https://www.imperva.com/blog/bad-bot-report-2026-bots-agentic-age/)
- **Today:**
  - Cloudflare Fraud Detection (ML against fake signups, ATO and carding) and Account Abuse Protection (Early Access Mar 12, 2026) (search excerpts) — [Cloudflare](https://blog.cloudflare.com/cloudflare-fraud-detection/), [Cloudflare](https://blog.cloudflare.com/account-abuse-protection/)
  - Vercel BotID protects checkouts, signups and APIs at $1 per 1,000 Deep Analysis calls — [Vercel](https://vercel.com/docs/botid)
  - Akamai Inference Cloud targets "fraud detection and secure payments" — [Akamai 8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm)

#### 5.5 WAF and security request triage, and false-positive review
- **Today:** the WAF attack score (TFLite on CPU, 275 µs) labels SQLi, XSS and RCE — [Cloudflare](https://blog.cloudflare.com/making-waf-ai-models-go-brr/). Gcore WAAP uses "Advanced AI" — [Gcore](https://gcore.com/blog/waap-launch)
- **Pain** (from SOC data, as a proxy for security-ops load): an average of 960 alerts per day; large enterprises see 3,000+ per day from ~30 tools; "40% of security alerts go completely uninvestigated"; 61% admitted ignoring alerts that later proved critical. This is a vendor-sponsored survey of 282 leaders — [The Hacker News / Prophet Security, Sep 2025](https://thehackernews.com/2025/09/the-state-of-ai-in-soc-2025-insights.html)
- On Typesafe's "Security incidents" workflow eval, Clef scores 62.9, Clef-flash 61.7 and Jev 61.7 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.6 UGC image and video moderation at upload, and geo-compliance or content-rating decisions
- **Today:**
  - Gcore VOD moderation: NSFW, hard and soft nudity, sports — [Gcore](https://gcore.com/streaming-platform/ai-for-video)
  - Cloudflare CSAM tool: hash matching on content entering the cache — [Cloudflare docs](https://developers.cloudflare.com/cache/reference/csam-scanning/)
  - Clef has a vision encoder (up to 4 images per request) — [Clef blog](https://blog.cloudflare.com/clef-decision-models/), [docs](https://developers.cloudflare.com/workers-ai/models/clef)
- **Regulatory pain** (UK Online Safety Act; secondary sources, search excerpts):
  - Age checks are enforced from 25 July 2025, with fines up to £18M or 10% of qualifying worldwide revenue — [Wikipedia](https://en.wikipedia.org/wiki/Online_age_verification_in_the_United_Kingdom)
  - By Feb 2026 Ofcom had opened 90+ investigations and issued six fines, including £800,000 against Kick Online Entertainment (13 Feb 2026) for missing age checks. A search summary gave these figures without naming which result they came from; check against Ofcom's own announcements before quoting — [Wikipedia](https://en.wikipedia.org/wiki/Online_age_verification_in_the_United_Kingdom)
  - Ofcom fined a site £600,000 for non-compliance even though it later geo-blocked the UK, so geo-blocking alone may not protect a platform — [Biometric Update, Aug 2026](https://www.biometricupdate.com/202608/ofcom-fines-geoblocked-porn-site-signaling-tougher-age-assurance-enforcement)

#### 5.7 Live-video and stream thumbnail moderation
- **Today:** Gcore's AI features are "for VOD only", and its FAQ says "We are working to enable AI for live streaming" — [Gcore](https://gcore.com/streaming-platform/ai-for-video). Earlier Gcore marketing said moderation acts "within seconds of a user uploading a video ... or starting an online stream" (search excerpt; this contradicts the current FAQ) — [Gcore blog](https://gcore.com/blog/ai-content-moderation)

#### 5.8 Abuse and phishing report triage (Trust & Safety)
- **Pain and today:**
  - Cloudflare raised automated resolution of phishing reports from 37% to 78% and cut median time to action from 3.4 days to under an hour (H1 to H2 2024) — [Cloudflare, Mar 17 2025](https://blog.cloudflare.com/how-cloudflare-is-using-automation-to-tackle-phishing/)
  - H1 2025: 131,405 phishing reports, action on 40,596 and 62% resolved automatically. Copyright reports jumped from 11,508 (H2 2024) to 124,872 (H1 2025) (secondary) — [GIGAZINE](https://gigazine.net/gsc_news/en/20260105-cloudflare-transparency-report). The primary report PDF was not fetched — [Cloudflare transparency report H1 2025](https://cf-assets.www.cloudflare.com/slt3lc6tev37/5DiewkfYlBVgef9zHC00ib/42d5fadccefce6be832b0d7cdfe7d26c/1H_2025_Cloudflare-s_Transparency_Report_Abuse_V3.pdf)
  - Cloudflare names T&S as a Clef fine-tuning target — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.9 Threat-intel domain categorization (secure web gateway, DNS filtering)
- **Today:** Clef plus Browser Run classifies a domain in 2.2 s, versus 4.7 s for gpt-oss-120b, which returned only two classifications. Example output: "95% chance it is a fashion website, 85% ecommerce, <1% phishing" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
- Cloudflare also runs DGA detection with transformers (search excerpt) — [Cloudflare](https://blog.cloudflare.com/threat-detection-machine-learning-models/)
- On PhishNChips accuracy, Clef scores 79.60, Clef-flash 75.05, Jev 62.55 and DiffusionGemma Jev 85.35 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.10 SOC alert and log triage
- **Pain:** see 5.5. Investigating an alert takes 70 minutes on average. 55% of teams already use AI copilots in production for triage, and "60% of all SOC workloads are expected to be handled by AI in the next three years" — [The Hacker News / Prophet Security](https://thehackernews.com/2025/09/the-state-of-ai-in-soc-2025-insights.html)

#### 5.11 Support ticket routing (the provider's own support and its customers')
- **Today:**
  - Clef's launch example is support triage: urgent yes/no, team choice and severity score — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
  - Typesafe "Customer service" eval: Clef 76.3, Clef-flash 77, Jev 76.0 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
  - Zendesk Intelligent Triage already classifies intent, sentiment and language (~150 languages) with confidence scores and routes tickets (search excerpt) — [Zendesk](https://support.zendesk.com/hc/en-us/articles/4550640560538-Automatically-classifying-customer-intent-sentiment-and-language)
- Intent benchmarks: CLINC150+OOS macro-F1 is 97.43 for Clef but only 66.77 for Clef-flash. BANKING77 macro-F1: 94.20 vs 90.93 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.12 Email routing, spam and phishing
- **Today:** Cloudflare Email Security uses LLMs for offline discovery and a specialized model for enforcement. Reported misses fell 20.4% in one quarter — [Cloudflare, Mar 3 2026](https://blog.cloudflare.com/email-security-phishing-gap-llm/)

#### 5.13 E-commerce search query intent (Amazon ESCI)
- **Benchmark facts:** Amazon's Shopping Queries Dataset has 130,652 queries and 2,621,738 judgments. Labels are Exact, Substitute, Complement and Irrelevant, in English, Japanese and Spanish. Reddy et al., 2022 — [GitHub: amazon-science/esci-data](https://github.com/amazon-science/esci-data)
- Clef scores 57.48 macro-F1, Clef-flash 57.39 and Jev 55.21 — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)

#### 5.14 Edge personalization and A/B variant selection
- **Today:**
  - Edge experimentation vendors assign variants inside CDN workers to avoid flicker, citing "sub-millisecond bucketing latency" (search excerpts) — [Optimizely Edge Delivery](https://www.optimizely.com/field-notes/demo-edge-delivery), [Uniform](https://www.uniform.dev/features/ab-testing)
  - Gcore FastEdge lists personalization and A/B testing — [Gcore](https://gcore.com/fastedge)
  - Fastly Compute targets "real-time personalization" — [Fastly](https://www.fastly.com/products/ai)
  - Azure Edge Actions target A/B testing within a 10 ms cap — [navsplace](https://www.navsplace.net/azure-front-door-edge-actions-serverless-compute-20260714/)
  - Akamai pitches "Smart commerce agents and personalized digital experiences" — [Akamai 8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm)

#### 5.15 Smart caching decisions (TTL, cacheability, prefetch, purge)
- **Prior work:** Learning Relaxed Belady (NSDI 2020) used ML to approximate Belady's optimal cache eviction. On 6 production CDN traces it cut WAN traffic by 5–24% versus a production design, with modest overhead deployable "on today's CDN servers" — [USENIX NSDI 2020](https://www.usenix.org/conference/nsdi20/presentation/song)
- Fastly's AI Accelerator does semantic caching of LLM responses — [Fastly](https://www.fastly.com/products/ai). AI Gateway caches only identical requests, with semantic caching planned — [Cloudflare docs](https://developers.cloudflare.com/ai-gateway/features/caching/)

#### 5.16 Origin routing, failover and load shedding
- No source found showing DMs or LLMs being used for these decisions. Azure Edge Actions list "dynamic origin selection based on geography or device type" as a ≤10 ms JavaScript task — [navsplace](https://www.navsplace.net/azure-front-door-edge-actions-serverless-compute-20260714/)

### Inferences
- How each use case fits the edge, and why a DM beats the alternatives:

| # | Use case | Where it runs | Why a DM instead of classic ML | Why a DM instead of an LLM | Evidence of pain or budget | Fit for a Gcore-like provider |
|---|---|---|---|---|---|---|
| 5.1 | Crawler and agent intent (Search, Agent or Training, plus price tier) | T3 cached per UA, ASN, signature or fingerprint; T1 for unknowns | Taxonomy changed in 2026 (10+ behavioural classes) and keeps moving; DM adds a class via the schema; can read robots.txt-style context and request patterns as text | 1 prefill, calibrated probabilities to threshold, cheaper and faster, cacheable | Strong (bots >50% of traffic; publishers monetizing) | High: Gcore CDN/WAAP could launch AI-crawler controls and pay-per-crawl-style tiers |
| 5.2 | Agent gating and pricing (x402, signed agents) | T2 inline (paid endpoints tolerate tens of ms) plus T4 audits of Pay Per Use self-reports | Rule matching on URL and headers can't judge purpose or content value | Typed outputs map directly onto pricing schemes; deterministic, so a disputed price decision can be audited | Medium-strong (new 2026 products; volume unknown) | High, as a differentiator vs Cloudflare's rule-based gateway |
| 5.3 | LLM prompt and response firewall | T2 inline, parallel, time-boxed | Unsafe-content categories vary by customer; schema per customer | ~5× cheaper than Llama Guard 3 per 500 tokens at list price; many questions per pass (toxicity, PII, injection, off-topic) | Medium (exists as a product; adoption unknown) | High: sell alongside Everywhere Inference to AI-app customers |
| 5.4 | Signup, ATO and checkout risk | T1 inline on few routes; T3 per account, email domain or device | Combines structured signals with free text (email, address, cart) without per-merchant retraining | Speed fits checkout; probabilities feed risk thresholds | Strong (fraud losses; Vercel charges $1/1k checks) | High: WAAP add-on "decision on high-value routes", priced per check |
| 5.5 | WAF false-positive review and rule tuning | T4 async on blocked or flagged requests | Classic attack scores don't explain why a request looks benign or business-legit | Cheaper and more consistent than an LLM reviewer; a human gets a ranked queue | Medium (alert fatigue is real; WAF-specific data not found) | High: managed-WAAP service efficiency, reducing analyst time |
| 5.6 | UGC moderation and content rating at upload; age and geo-compliance | T4 at upload, then verdict cached per object or URL and enforced by geo at the edge | Policies differ by country and platform; schema-driven rating; vision encoder | Fixed choices, calibrated thresholds, cheaper per image than generative VLMs (not quantified) | Strong (Online Safety Act fines; Gcore already sells VOD moderation) | Very high: extends Gcore Video and Storage; per-country rating schemas |
| 5.7 | Live-stream thumbnail moderation | T4 near-real-time (sample a frame every N s; act within seconds) | Fixed-label detectors miss context (e.g., "is this gambling promotion?") | Flash latency allows frequent sampling at bounded cost | Medium (Gcore says live is "working to enable") | Very high: a gap in Gcore's own product |
| 5.8 | Abuse and phishing report triage (T&S) | T4 | Reports are messy free text plus a URL, and categories evolve | Cheaper and more consistent at volume (100k+ reports per half-year at Cloudflare) | Strong for the provider's own operations | High internally (cost-out), medium as a product for hosting customers |
| 5.9 | Domain or URL categorization | T4, then cached per domain | Multi-label, open taxonomy; vision on rendered page | 2.2 s vs 4.7 s and more labels than gpt-oss-120b | Strong (Cloudflare's own live use) | Medium (needs a secure-web-gateway or DNS product) |
| 5.10 | SOC alert triage | T4 (central is fine) | Alert schemas vary by tool | Determinism and probabilities for SLA routing; cheaper than LLM triage | Strong pain, but crowded AI-SOC market | Low-medium (edge adds nothing; it's a managed-security play) |
| 5.11 | Support ticket routing | T4 (central is fine) | Taxonomies per company; no retraining | Cheap, consistent; but incumbents like Zendesk already ship triage | Medium | Low as a product; medium for internal use |
| 5.12 | Email spam and phishing middle tier | T4 (post-delivery), or inline at the MTA (seconds are fine) | Catches new linguistic variants that fixed models miss | Cheaper than LLM "discovery" on a larger share of mail | Medium | Low for Gcore (no email product) |
| 5.13 | E-commerce query intent (ESCI) | T1 inline on the search API, or T3 per normalized query | Product-specific labels | Fast, but accuracy is modest (~57 macro-F1) | Weak-medium | Low-medium |
| 5.14 | Personalization and A/B | T3 per segment or referrer; bucketing stays on a hash | Only for semantic targeting (e.g., classify landing intent from referrer or query) | Cheaper than LLM page rewriting | Weak (bucketing is sub-ms hashing) | Low-medium (FastEdge integration demo) |
| 5.15 | Caching (TTL, cacheability, purge) | T4 per URL template (e.g., "is this response personalized or does it contain PII?") | Per-object eviction is best done by classic ML (LRB) | Semantic judgments about content type, cached per template | Weak for eviction; medium for "safe-to-cache" audits | Low-medium |
| 5.16 | Origin routing and failover | Mostly not a DM job; possibly T4 "soft-error page" detection (an HTTP 200 that is actually an error page) | Telemetry is numeric, so classic control loops win | Only useful for reading error pages (text or screenshot) | No evidence found | Low |

- Additional ideas a Gcore-like provider could productize. These are ideas, not evidence-backed demand:
  - Per-country content-rating schemas for streaming and UGC customers.
  - A "decision endpoint" add-on to FastEdge, called with one fetch from Wasm.
  - WAAP false-positive copilot for managed customers.
  - AI-crawler monetization tiers for media customers.
  - Semantic cache-equivalence judgments for LLM-API caching, a DM alternative to embedding similarity.
  - Gaming chat moderation and ad-verification or brand-safety page classification. No evidence was gathered for either.
- The highest-value DM use cases at a CDN are agentic-traffic decisions, high-value-route risk, and moderation or compliance. All three are pushed by 2025–2026 changes: bots are the majority of traffic, 402-style payments are new, and Online Safety Act enforcement has started.

### Gaps
- No public data found on customer adoption of Cloudflare's AI-crawler controls, pay-per-crawl, the Monetization Gateway or Pay Per Use. No price levels per crawl or per use were found.
- No WAF-specific false-positive-rate data found (only SOC-level proxies). No live-streaming moderation market sizing found.
- No current (2026) primary e-commerce fraud figures; the Juniper forecast is from 2023. Secondary 2026 sources cite e-commerce fraud losses of $48B (2025), rising to $107B (2029), but these were not verified.
- Image-moderation accuracy of Clef's vision encoder is unbenchmarked in the sources found. The blog's benchmarks are text-centric.

---

## 6. How could a provider like Gcore or Akamai offer this, given Clef's weights are Apache-2.0?

### Takeaway
Fastest path: self-host Clef and Clef-flash, which are Apache-2.0 open weights that run on vLLM or SGLang, on existing GPUs. Clef needs an H100 or RTX PRO 6000; Clef-flash fits an L40S. Expose a Jev/Clef-compatible API and embed it in products the provider already sells (WAAP and bot management, video moderation, AI-crawler controls, FastEdge), plus a managed fine-tuning service on customers' labelled decisions. Pricing power will be limited because Cloudflare's list price is very low ($0.09 per M input tokens for Clef-flash). Differentiation has to come from integration in the data path, proprietary labels and data residency, not from hosting the model alone.

### Cited Findings
- Clef is "fully open-sourcing ... on Hugging Face under an Apache 2.0 license". It is "fully Jev-API compatible, so you can make the swap extremely easily" — [Clef blog](https://blog.cloudflare.com/clef-decision-models/). The HF card notes Apache-2.0 "following the base model Qwen/Qwen3.8-27B", with BF16 safetensors and vLLM/SGLang examples — [HF](https://huggingface.co/Cloudflare/clef)
- Cloudflare's fine-tuning offer:
  - Starts with forward-deployed engineers (FDE), then moves to a self-serve RL platform.
  - Builds on AI Gateway (datasets from logged traffic), Workers AI (rollouts), Containers (RL sandbox), a new Trainer, and Workers AI bring-your-own-model via Cog (from the Replicate acquisition). The training objective is RLCD.
  - Cloudflare cites "more than 15 years of network data" for fine-tuning.

  — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
- Gcore building blocks:
  - Everywhere Inference supports custom models on L40S, H100 and A100 with Smart Routing — [Gcore docs](https://docs.gcore.com/edge-ai/everywhere-inference)
  - Per-hour GPU pricing — [Gcore pricing](https://gcore.com/pricing/ai)
  - "nearest compliant GPU region" routing and air-gapped deployments — [Gcore blog, Nov 3 2025](https://gcore.com/blog/introducing-everywhere-ai)
  - FastEdge Wasm in 210+ data centers — [Gcore](https://gcore.com/fastedge)
  - WAAP, which combines WAF, L7 DDoS, bot management and API security — [Gcore](https://gcore.com/blog/waap-launch)
  - Video AI moderation (VOD only, live in progress) — [Gcore](https://gcore.com/streaming-platform/ai-for-video)
- Akamai building blocks:
  - Inference Cloud on RTX PRO 6000 (96 GB) — [8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm), [NVIDIA](https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/)
  - Bot Manager with "visibility into more than 40 billion bots a day" and agent verification — [Akamai](https://www.akamai.com/products/bot-manager)
  - Target uses include "real-time financial insights and decisioning" and fraud detection — [8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm)
- Competitive context: Fastly positions itself as a proxy and control layer in front of LLM providers rather than an inference host — [Fastly](https://www.fastly.com/products/ai). Vercel buys its ML bot detection from Kasada rather than building it — [Vercel](https://vercel.com/docs/botid)

### Inferences
- **Path A: a hosted decision endpoint.**
  - Deploy Clef-flash on L40S, and Clef on H100 or 2×L40S with FP8. Expose the Jev/Clef schema API so customers can switch with a URL change.
  - Price per decision or per token, near Cloudflare's anchor. Gcore's GPU-hour price only beats Cloudflare's list price at good utilization; see the Section 4 sensitivity table.
  - Front it with Smart Routing so EU or regulated customers stay in-region. Gcore already markets "compliant GPU region" routing.
- **Path B: decisions embedded in existing products.** This is where a CDN has a structural edge over model labs: it owns the traffic, the enforcement point and the labels.
  - WAAP "uncertain-band escalation" and FP-review assistant.
  - AI-crawler and agent classes, with optional monetization.
  - Live and VOD moderation with per-country rating schemas.
  - Abuse-report triage for hosting customers.
  - A FastEdge helper library that calls the decision endpoint and caches verdicts in edge KV.
- **Path C: managed fine-tuning.** Fine-tune Clef or Clef-flash on a customer's historical decisions, such as WAF allow/block outcomes, moderator verdicts or support routing history. This mirrors Cloudflare's FDE and RL offer and could run on Gcore GPU cloud or customer on-prem through Everywhere AI. Apache-2.0 permits derivative weights; confirm the base-model license chain. The provider's own aggregated labels (bot verdicts across customers) are a moat, as Cloudflare's "15 years of network data" claim shows.
- **Path D: train its own DM.** Only worth it to differentiate, e.g., video-native moderation, regional languages or a smaller CPU-servable distilled model for tier T0/T1. Otherwise Clef's open weights make this a poor use of capital.
- **Akamai specifically:** one RTX PRO 6000 (96 GB) can hold full-precision BF16 Clef with headroom, and Akamai's bot telemetry ("40 billion bots a day") is a strong fine-tuning corpus for agent and crawler intent. Leighton's "putting AI's decision-making in thousands of locations" line fits the decision-model framing.
- **Risks:**
  - Commoditization: anyone can host Apache-2.0 weights, and Cloudflare prices low.
  - GPU under-utilization (the Fly.io lesson).
  - Accuracy without fine-tuning is mixed (Section 7).
  - Liability for automated moderation or blocking errors means human review and calibrated thresholds are needed.

### Gaps
- No public statements found from Gcore or Akamai about decision models, Clef or Jev.
- Clef throughput on L40S or RTX PRO 6000 is unknown. Cloudflare's numbers are from an H200.
- Whether Typesafe licenses Jev to infrastructure providers is out of scope (another team covers it).

---

## 7. Evidence for and against the thesis "decision models belong at the edge, and CDN applications are enormous but under-appreciated"

### Takeaway
The evidence supports "decision models are very useful to CDNs": the decisions a CDN owns (bots, agents, abuse, moderation, compliance) are multiplying, their taxonomies keep changing, and Cloudflare itself plans to put Clef in its bot products. The literal claim "they belong at the edge", meaning in the request path at the PoP, holds only for a narrow slice: Clef-flash on high-value routes or per-key cached verdicts. Most of the value is in async or cached decisions that could run in a regional GPU cluster. "Under-appreciated" is plausible for agentic-traffic gating and monetization and for moderation and compliance operations. It is not plausible for per-request scoring, where microsecond CPU models will remain the core.

### Cited Findings
**For the thesis**
- Bots are now the majority of traffic: 53% (Imperva, 2025 data) — [Imperva](https://www.imperva.com/blog/bad-bot-report-2026-bots-agentic-age/). About 57% of web-page traffic on Cloudflare (secondary) — [Forbes](https://www.forbes.com/sites/josipamajic/2026/06/04/bots-now-outnumber-humans-online-and-the-internet-was-never-built-for-this/)
- New decision categories and payment rails arrived in 2026: behavioural bot classes with new defaults — [Cloudflare](https://blog.cloudflare.com/content-independence-day-ai-options/); the x402 Monetization Gateway — [Cloudflare](https://blog.cloudflare.com/monetization-gateway-beta/); Pay Per Use — [Cloudflare](https://blog.cloudflare.com/pay-per-use/)
- Cloudflare describes decision models as able to "work over any set of inputs without constantly retraining the model to incorporate new classification categories" and plans Clef for bot, T&S and support decisions — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
- Edge GPU capacity exists or is being built: Cloudflare GPUs in 230+ cities — [Cloudflare](https://blog.cloudflare.com/sovereign-ai-choice-one-year-later/); Akamai's thousands of GPUs — [Akamai](https://www.akamai.com/newsroom/press-release/akamai-to-deploy-thousands-of-nvidia-blackwell-gpus-to-create-one-of-the-worlds-most-widely-distributed-ai-platforms); telco AI grids — [NVIDIA](https://blogs.nvidia.com/blog/telecom-ai-grids-inference)
- Akamai's CEO frames the edge build-out around "AI's decision-making in thousands of locations" — [Akamai 8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm)
- Customers already pay for premium per-request decisions: $1 per 1,000 BotID Deep Analysis calls — [Vercel](https://vercel.com/docs/botid)
- Cloudflare already runs a GPU classifier (Llama Guard) in a WAF path for LLM endpoints — [Cloudflare](https://blog.cloudflare.com/block-unsafe-llm-prompts-with-firewall-for-ai/)

**Against the thesis**
- Per-request budgets are microseconds: ≤100 µs added for bot detection, 275 µs for WAF ML — [Cloudflare 2020](https://blog.cloudflare.com/cloudflare-bot-management-machine-learning-and-more/), [Cloudflare 2024](https://blog.cloudflare.com/making-waf-ai-models-go-brr/). Clef-flash's 38.8 ms median is far outside that.
- Fly.io found "developers don't want GPUs ... They want LLMs" and "inference latency just doesn't seem to matter yet", and shut down its GPUs on Jul 31, 2026 — [Fly.io blog](https://fly.io/blog/wrong-about-gpu/), [Fly community](https://community.fly.io/t/gpu-migration-fly-io-gpus-will-be-deprecated-as-of-july-31-2026/27110)
- Several CDNs chose not to host GPUs and instead proxy, cache or partner: Fastly, Vercel/Kasada, Netlify — [Fastly](https://www.fastly.com/products/ai), [Vercel](https://vercel.com/docs/botid), [Netlify](https://www.netlify.com/platform/ai-gateway/)
- Akamai's "edge" GPUs started in only 20 locations, and heavy capacity sits in metro clusters — [Akamai 8-K](https://www.sec.gov/Archives/edgar/data/1086222/000108622225000246/ex991-prakamaiinferenceclo.htm), [CRN Asia](https://www.crnasia.com/india/news/2026/akamai-takes-ai-inference-to-the-edge-with-nvidia-powered-grid-across-4-400-locations)
- Cloudflare's own first production Clef use is threat-intel domain classification taking 2.2 s with Browser Run, which is not latency-critical. Its email-security design keeps LLMs offline and a specialized model inline — [Clef blog](https://blog.cloudflare.com/clef-decision-models/), [Cloudflare email blog](https://blog.cloudflare.com/email-security-phishing-gap-llm/)
- Accuracy is uneven:
  - PhishNChips accuracy: Clef 79.60 vs DiffusionGemma Jev 85.35.
  - ESCI macro-F1 is only ~57.
  - Clef-flash drops to 66.77 macro-F1 on CLINC150+OOS, vs 97.43 for Clef. The fast model is weaker exactly where out-of-scope detection matters.

  — [Clef blog](https://blog.cloudflare.com/clef-decision-models/)
- Edge AI market-size figures are mostly about devices and on-prem, not CDN inference (Section 1 caveat) — e.g., [Grand View](https://www.grandviewresearch.com/industry-analysis/edge-ai-market-report)

### Inferences
- A defensible framing for the video: decision models put AI's decisions where the traffic is. CDNs are where most of the internet's bot, agent, abuse and content decisions already happen. The key is to put the decision model next to the edge and call it selectively and cache its answers, not to run it on every request.
- The counter-argument to address directly is that, on cost and latency, decision models can't replace the microsecond classic-ML layer. They escalate from it, label for it and govern new categories. If the video claims "every request", the claim breaks; if it claims "every decision that matters", it holds.
- The most under-appreciated, CDN-specific opportunity is pricing and permissioning agent traffic. CDNs are the only party that sees the request, the identity signal (Web Bot Auth) and the content, and Cloudflare's current gateway uses static rules (URL, headers, query). A provider that adds calibrated intent and value decisions there would offer something model labs cannot.

### Gaps
- No independent (non-Cloudflare) benchmark of Clef's accuracy or latency was found. The model is two days old.
- No adoption data for Clef on Workers AI, and no data on what share of CDN requests are "ambiguous" enough to need a DM.
- No source quantifies how much revenue CDNs currently earn from bot management, WAAP or moderation, so "enormous" cannot be sized here. Market-size reports for bot management and content moderation were not gathered in this pass.
