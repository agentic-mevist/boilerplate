# Community reaction to Jev (TypeSafe AI) and Clef (Cloudflare) outside X/Twitter

_Snapshot and method: I pulled all data on 2026-10-03 (UTC) using the HN Algolia and Firebase APIs, ScrapeCreators (Reddit, YouTube incl. transcripts, TikTok, Instagram, Threads, LinkedIn company feed), Apify `harvestapi/linkedin-post-search`, the public Bluesky AppView search API (`api.bsky.app`) and web search/fetch. Scores, views and reaction counts are point-in-time. The Clef launch was less than 48 hours old, so its numbers are still climbing. HN comment "rank" means a comment's position in HN's own ordering (the Firebase `kids` order); HN does not expose comment scores. Raw API responses are in `/tmp/claude-0/-home-user-boilerplate/de044734-8f8a-51fd-9bea-2c273aaa1f9d/scratchpad/social_other/`._

_Disambiguation:_
- _"Jeff" is also the name of a real, separate project: [firelex/jeff](https://github.com/firelex/jeff), a set of 0.8B Jev-compatible models. Some YouTube auto-captions also render "Jev" as "Jeff". Every "Jeff" below is either that project or a caption error, and I note which._
- _There are two different "Kev"s. One is Jared Palmer's Qwen3.5-based [Kev family](https://github.com/jaredpalmer/kev/tree/main) (which includes kev-9b, the model in Cloudflare's benchmark table). The other is an earlier Cloudflare demo, also called "Kev", built on DiffusionGemma ([HN](https://news.ycombinator.com/item?id=49762547))._
- _I filtered out unrelated "Clef" results: SCP's Dr. Clef, music notation, the CLEF conference, and a linguistics catalogue also named CLEF._

## 1. Hacker News: every relevant story, the scores, and the top and most insightful comments

### Takeaway
HN made the Jev launch one of its biggest threads of the month (1,989 points, 520 comments), then spent the next three weeks deflating it ("a classifier/logprobs with great marketing") while upvoting open clones. The Clef thread drew 621 points and 215 comments. Its top-ranked replies, however, argue that Jev was "low-hanging fruit", that Clef is "open weights, not open source", and that Clef costs about 6x as much per input token. Several practitioners also posted their own evals showing Clef slower and less accurate than Jev.

### Cited Findings
**Volume**
- About 536 HN stories since 2026-08-15 carry Jev, TypeSafe, Clef, decision-model, Kev, Laya or "System One" terms in the title or URL. Of these, 124 are Show HNs, 17 scored at least 100 points and 52 scored at least 10. By week: 153 in launch week (Sept 14–20), 255 in Sept 21–27 and 128 in Sept 28–Oct 3. The long tail is mostly 1–3-point Show HNs. — [HN Algolia API (my tally)](https://hn.algolia.com/api/v1/search_by_date?query=Jev&tags=story)

**Key stories (points / comments as of Oct 3; dates UTC)**

| Story | Date | Pts | Comments | Link |
|---|---|---|---|---|
| Introducing System One Models and Jev (typesafe.ai) | 2026-09-15 | 1,989 | 520 | [HN](https://news.ycombinator.com/item?id=49717558) |
| "I built non-autoregressive decision models with RL a year ago" (Laya) | 09-19 | 1,363 | 319 | [HN](https://news.ycombinator.com/item?id=49765348) |
| Jev in 25 Lines of Python (nobodywho.ai; self-described parody/ad) | 09-23 | 691 | 212 | [HN](https://news.ycombinator.com/item?id=49812769) |
| **Clef: Open-weight decision models, and new RL fine-tuning platform** (blog.cloudflare.com) | **10-01** | **621** | **215** | [HN](https://news.ycombinator.com/item?id=49923692) |
| Ollaya – Ollama for open-source, Jev-style decision models | 09-25 | 617 | 145 | [HN](https://news.ycombinator.com/item?id=49848269) |
| Jeff – Jev-compatible 0.8B decision models, trained at home, ~30 ms | 09-28 | 574 | 225 | [HN](https://news.ycombinator.com/item?id=49883844) |
| Kev: Tiny Jev-like family of decision models built on top of Qwen3.5 | 09-21 | 462 | 211 | [HN](https://news.ycombinator.com/item?id=49783999) |
| OpenAI is well positioned to fast-follow Jev (Arcturus Labs) | 09-22 | 328 | 233 | [HN](https://news.ycombinator.com/item?id=49802161) |
| Show HN: Jev Plays Pokémon Red | 09-25 | 282 | 124 | [HN](https://news.ycombinator.com/item?id=49845172) |
| Jeeves: Reasoning improves Jev-like decision models (PostHog) | 09-29 | 242 | 95 | [HN](https://news.ycombinator.com/item?id=49891290) |
| Jev-Leftpad | 09-21 | 234 | 87 | [HN](https://news.ycombinator.com/item?id=49784706) |
| Language models for text classification: From bag-of-words to Jev (Raschka) | 09-29 | 213 | 10 | [HN](https://news.ycombinator.com/item?id=49891203) |
| I turned Jev into a (lousy) chatbot | 09-20 | 177 | 50 | [HN](https://news.ycombinator.com/item?id=49778162) |
| Reverse-engineered Jev-like model | 09-16 | 169 | 24 | [HN](https://news.ycombinator.com/item?id=49731282) |
| DiffusionGemma Technical Report (pre-Jev; later used for "DJev") | 08-20 | 165 | 40 | [HN](https://news.ycombinator.com/item?id=49374287) |
| A single function Jev-like wrapper for LLMs, incl. vision models | 09-26 | 157 | 45 | [HN](https://news.ycombinator.com/item?id=49853175) |
| Show HN: JevBench, a reproducible benchmark for typed decision models | 09-22 | 153 | 39 | [HN](https://news.ycombinator.com/item?id=49800574) |
| Turning GLM-5.3-Flash into a Jev-like decision model | 09-26 | 138 | 59 | [HN](https://news.ycombinator.com/item?id=49857656) |
| Jev Can't Be Calibrated (alexmolas.com) | 09-23 | 65 | 61 | [HN](https://news.ycombinator.com/item?id=49816899) |
| Jev introduces a new shape of LLM (Simon Willison) | 09-22 | 53 | 20 | [HN](https://news.ycombinator.com/item?id=49796843) |
| How accurately calibrated is Jev? (maximumeffort substack) | 10-02 | 50 | 19 | [HN](https://news.ycombinator.com/item?id=49934399) |
| Decision models like Jev don't beat LLM-as-a-judge or traditional classifiers (Red Hat) | 10-02 | 24 | 8 | [HN](https://news.ycombinator.com/item?id=49933476) |
| Ask HN: I was impressed by Jev, please explain why I shouldn't be | 09-27 | 13 | 20 | [HN](https://news.ycombinator.com/item?id=49868483) |
| Jev vs. Kev: open-source Jev alternative tested side by side (Opper) | 09-25 | 12 | 2 | [HN](https://news.ycombinator.com/item?id=49847306) |
| Kev – A Jev-Compatible API on top of DiffusionGemma running on Workers AI (posted by Cloudflare's kflansburg) | 09-19 | 5 | 1 | [HN](https://news.ycombinator.com/item?id=49762547) |
| kev: Jev-like model built on Qwen2.5-0.5B (Jared Palmer, first version) | 09-19 | 3 | 0 | [HN](https://news.ycombinator.com/item?id=49766295) |
| Jev Decision Index Leaderboard (HF space) | 09-23 | 3 | 0 | [HN](https://news.ycombinator.com/item?id=49819739) |
| Decision Index 0.2.1 – 70 open reproductions of TypeSafe Jev's "Decision Model" | 10-02 | 4 | 0 | [HN](https://news.ycombinator.com/item?id=49934879) |
| Rene-1: Open-weight classifier sets SOTA on Decision Index (+9 over Jev) | 09-27 | 6 | 2 | [HN](https://news.ycombinator.com/item?id=49871553) |
| Jev: System One Models for Prod, Not God (Latent Space podcast) | 09-21 | 4 | 4 | [HN](https://news.ycombinator.com/item?id=49794590) |
| Inventor of ChatGPT and RLHF Launches Typesafe.ai (TechCrunch) | 09-19 | 5 | 0 | [HN](https://news.ycombinator.com/item?id=49763045) |
| OpenAI Answers TypeSafe's Jev with a Decision API Built on Luna (The New Stack) | 09-29 | 7 | 1 | [HN](https://news.ycombinator.com/item?id=49896979) |

- No HN story specifically about "Kev-9B" exists. The Algolia search found a single "kev 9b" match, and Kev-9B is discussed inside the Kev and Clef threads. — [HN Algolia](https://hn.algolia.com/api/v1/search?query=kev%209b)
- The Clef submission's title was edited twice ("our open-source decision models" → "Open-source decision models…" → "Open-weight…"). Moderator dang wrote: "Ok, we've put weights instead of source in the title, at least until someone comes along and says that's not right either!" — [HN](https://news.ycombinator.com/item?id=49928246)

**Jev launch thread (49717558): top-ranked and most insightful comments**
- #1 (big_toast, 20 replies): the docs explain it better than the announcement. The TypeSafe CEO (HN user CompleteSkeptic) confirmed: "text or structured state (like a JSON with multiple pieces of text in) -> decisions out (e.g. choice maps to 'match' statement, 'score' maps to sorting, 'noul' short for bernoulli maps to if-statements)". — [HN](https://news.ycombinator.com/item?id=49718407)
- #2 (jacobgold, 91 replies): "Seems like a more accurate title would be 'Jev: Trading general purpose generation for fast typed inference'… Also 'can't hallucinate' seems wrong? Sure, it can't emit an invalid type, but it can still emit a completely wrong valid value." — [HN](https://news.ycombinator.com/item?id=49718492)
- CEO's reply on hallucination: "that is likely true of all ML! perhaps we could debate semantics, but I don't think it's fair to say a random forest 'hallucinates' in the way LLMs do". — [HN](https://news.ycombinator.com/item?id=49718767)
- thduabmd's rebuttal: "Your launch post puts '0%' on a hallucination chart, then explains that the number comes from guaranteed schema matching… An approve for an unauthorized action still meets the schema guarantee." — [HN](https://news.ycombinator.com/item?id=49720703)
- CEO on why not to use constrained decoding: "constrained decoding (OpenAI-style structured outputs) make models dumber unfortunately… if ever a model was assigning probability to an invalid token, the model is by definition confused." — [HN](https://news.ycombinator.com/item?id=49718849)
- CEO on openness: "architecture is close to the chest for now, but we have talked about writing a paper". — [HN](https://news.ycombinator.com/item?id=49718824)
- ramon156 (#10): "so far all claims just sound like marketing terms… 'RLCD' and 'parallel sampling' have nothing to back it up… '70-500ms vs 3-329 seconds' are apples-to-oranges unless the LLM baseline is doing comparable work". — [HN](https://news.ycombinator.com/item?id=49718120)
- jceg on TypeSafe's choice not to publish public benchmarks: "lol, I bet they would publish them if their score on those benchmarks were good." — [HN](https://news.ycombinator.com/item?id=49718242)
- zmmmmm on TypeSafe's eval method, which compares models to the average of Astra/Fable predictions: "They assume there is a correct graph, but they don't compare to that". — [HN](https://news.ycombinator.com/item?id=49719329)
- lubujackson (#8), a practitioner who agreed: "this is exactly how I am using LLMs in production, to narrowly make choices and return structured data… If this does at all what it claims, I think this is going to quickly become the new standard approach for agentic systems." — [HN](https://news.ycombinator.com/item?id=49718626)
- On pricing, wxw (#11) quoted "Input tokens: $0.042 / MTok… Output tokens: FREE (too cheap to meter)" and wrote "Insane." — [HN](https://news.ycombinator.com/item?id=49718719)
- mushufasa (#12) on distribution and compliance: "I would love for things like this to be accessible via hubs like open router or AWS bedrock." — [HN](https://news.ycombinator.com/item?id=49718111)
- edot asked why a general model would beat "a basic XGBoost model trained on my dataset" for fraud. — [HN](https://news.ycombinator.com/item?id=49720719)
- ttul (spam/phishing at scale): "We have about a billion reasons a day to call a model like this to rid the world of spam and phishing." — [HN](https://news.ycombinator.com/item?id=49727065)
- Hands-on (silbercue): Jev as a browser-agent action picker over 10–40 accessibility-tree refs made "21–23 decisions for six benchmark cards, all correct (!), ~$0.001 total". — [HN](https://news.ycombinator.com/item?id=49758669)

**Clef thread (49923692): top-ranked and most insightful comments**
- #1 (manlymuppet, 54 replies): "Am I hearing this right, that they made a decision model based on Typesafe's new paradigm, and actually made a model better than Jev based on Typesafe's own ranking? And it's only been a few weeks." — [HN](https://news.ycombinator.com/item?id=49924445)
  - TeMPOraL's reply (36 replies): "It's not a 'new paradigm', it's a low-hanging fruit that's been lying around for years; Typesafe were the first to bother to stop and pick it up, and market the shit out of it." — [HN](https://news.ycombinator.com/item?id=49924635)
  - slopnt: "They have to have decision models already in production. Part of their business is detecting bots, DDoSers and spammers." — [HN](https://news.ycombinator.com/item?id=49924647). alightsoul replied that those are decision trees or random forests that "have existed for a long time" — [HN](https://news.ycombinator.com/item?id=49926152). Cloudflare CEO Matthew Prince (eastdakota) answered: "I think you just called me old." — [HN](https://news.ycombinator.com/item?id=49928918)
  - segmondy: "A lot of people claim to have made better than jev… most of the ones that are supposedly on jev level end up playing a terrible game… Cloudflare doesn't compare to the top open bench alternatives". — [HN](https://news.ycombinator.com/item?id=49927360)
- #2 (buildbuildbuild): "Open weights, not open source. The weights have permissive licensing, but the data and training pipeline are not published to reproduce them from their proprietary Qwen starting points." — [HN](https://news.ycombinator.com/item?id=49924502)
- #3 (djray) praised the writing: "just how well-written the majority of Cloudflare's posts are." — [HN](https://news.ycombinator.com/item?id=49933835). Wazzymandias: "It's amusing that this blog post explained Jev's underlying design far more clearly than their onslaught of bull posts and marketing". — [HN](https://news.ycombinator.com/item?id=49928987)
- #4 (vulture916, pricing): "Jev = $0.042/m input, output free / Clef = $0.24/m input… One million decisions on Jev cost about $12.60. One million decisions on Clef cost about $72. Would probably make sense to self-host Clef". — [HN](https://news.ycombinator.com/item?id=49926385)
  - jampekka's reply: "Jev hyping 'free output' is almost lying by omission." — [HN](https://news.ycombinator.com/item?id=49926617)
- #5 (agrippanux, hands-on): Jev in front of an Ollama model on Cloudflare for chat/username moderation. "Clef was 2-3x slower and worse (it caught less hate speech) than Jev. Overall disappointing." — [HN](https://news.ycombinator.com/item?id=49929048)
  - wongarsu: "It's likely no coindicence [sic] that they only show 'median latency', not how latency scales with input size. For small inputs Jev is slow, but its latency curve is very flat… even with moderate contexts [a fine-tuned 27B] quickly becomes much slower than Jev." — [HN](https://news.ycombinator.com/item?id=49931473)
  - teleforce: Cloudflare switched from DiffusionGemma ("DJev") to Qwen "but never mentioned any reason and justification for the change". — [HN](https://news.ycombinator.com/item?id=49929481)
- #6 (dgacmu, hands-on vision): ran an 8-bit quant of Clef on coin photos. "It did .. horribly. About 41% accuracy. My local gemma4:27b gets 53% and runs 4x faster." — [HN](https://news.ycombinator.com/item?id=49933256)
- #7 (ssiddharth): "Pricing is $0.24/million input tokens which is ~6x compared to Jev. Clef-flash is at $0.09 which is way more competitive." CBLT replied: "strange their pareto frontier didn't include cost." — [HN](https://news.ycombinator.com/item?id=49924252), [HN](https://news.ycombinator.com/item?id=49925249)
- #14 (amluto): "I don't think a Jev-like model is particularly useful unless you can fine tune it. The Jev API has zero ability to pass in a prior… You can feed Jev a prior as text. I've tried it. It works poorly." — [HN](https://news.ycombinator.com/item?id=49925842)
- pdlug (hands-on, data and script published): on "should an agent's knowledge-base write go to human review?", "Quality: close (recall 0.98 vs 1.00) / Hosted p50: Clef ~850ms, Jev ~110ms / Clef-flash: over-escalates". — [HN](https://news.ycombinator.com/item?id=49928781)
- zwaps asked "No mention of calibration. Is it just another llm finetune?" Clef co-author Kevin Flansburg (kflansburg) replied by quoting the blog: "label-smoothed cross-entropy… paired with a Brier loss to refine probability calibration." — [HN](https://news.ycombinator.com/item?id=49924339)
- 6thbit (edge use case): "I wonder if a good usecase for this would be cloudflare's WAF rules. Give broader request context to the decider and let it pick type of challenge/block traffic directly. Perhaps that may be too costly atm". — [HN](https://news.ycombinator.com/item?id=49924396)
- johnbatch (Cloudflare Zero Trust user): "I use the cloudflare ZTNA agent… and often run into uncategorized websites… If Clef can decide this in 2 seconds I shouldn't have to enter a support request and wait hours for it to get categorized." — [HN](https://news.ycombinator.com/item?id=49929567)
- Critiques of the blog's claims:
  - cakoose on "human does not necessarily need to be in the loop": "Isn't that just a function of how much you trust it and not some completely new paradigm?" — [HN](https://news.ycombinator.com/item?id=49926220)
  - meander_water: "Decision models do not produce deterministic output." — [HN](https://news.ycombinator.com/item?id=49927461)
  - ranyume: "if you already have all that data why didn't you train your models already using that?" — [HN](https://news.ycombinator.com/item?id=49925578)
  - sauercrowd: "why is clef-flash outperforming clef in quite a few of the benchmarks?" — [HN](https://news.ycombinator.com/item?id=49933900)
  - reexpressionist: removing the human "is only true in a practical sense if you can actually rely on the probabilities estimated by the model." — [HN](https://news.ycombinator.com/item?id=49929308)
- "Isn't this just logprobs/classifiers?" in the Clef thread:
  - outofpaper: "one output token, and read the logprobs… Plenty of systems already do this; Typesafe's fundraising and marketing just made it visible." — [HN](https://news.ycombinator.com/item?id=49930588)
  - porridgeraisin: "calibration really doesn't matter much when you're replacing usecases where people were using damn LM head softmax probabilities before, which are nowhere near calibrated." — [HN](https://news.ycombinator.com/item?id=49924321)
  - rahimnathwani: "What Jev did is combine the advantages of both A and B [LLM structured outputs; fine-tuned BERT/GLiNER classifiers] into one model/product, and create a really good API." — [HN](https://news.ycombinator.com/item?id=49935505)
  - mikeocool: "If I have to gather and tag data to fine-tune Jev, I can probably just train an 'old school' classifier model and make it even cheaper, faster, and just as accurate." — [HN](https://news.ycombinator.com/item?id=49926212)
- Comparisons and alternatives:
  - ricardobeat: "decider-4B performs better than Kev with significantly lower latency… Laya on the other hand shouldn't even be featured". — [HN](https://news.ycombinator.com/item?id=49931441)
  - networked: OpenRouter lists "nine" decision models. Their shell-command-approval benchmark found "of five models on OpenRouter only Liquid D1 performs similar[ly]" to Jev, and Ollaya runs Clef Flash locally. — [HN](https://news.ycombinator.com/item?id=49932279)
  - leopoldj: people are already fine-tuning Clef (e.g., huggingface.co/solanaclawd/clef-solana-research). — [HN](https://news.ycombinator.com/item?id=49933702)
- Users looking for use cases:
  - ksymph: "has anyone actually started building anything with them yet?" — [HN](https://news.ycombinator.com/item?id=49924597)
  - reassess_blind: "I'm trialling using it to scan user signups for signs of gambling spam, phishing etc." — [HN](https://news.ycombinator.com/item?id=49929153)
  - fooker: "look at a 1M context window and produce N decisions… in 50-100ms." — [HN](https://news.ycombinator.com/item?id=49925130)

**Other threads: critiques and insights**
- Laya thread, #1 (johnfn): "marketing and branding are just as important, if not more so, than the product. Jev is exceptionally-well branded." — [HN](https://news.ycombinator.com/item?id=49769116)
- Laya thread, prometheus1992 (50 replies), listing the launch language that read as "parody/con/shady": "'Breakthrough'… 'Two years in stealth'… 'Jev can't hallucinate', 'RLCD'… I had used versions of bert to achieve the same functionality years ago." — [HN](https://news.ycombinator.com/item?id=49767192)
- Laya thread, Oras (56 replies): "as someone who trained NLP models prior to LLMs, it's just BERT with more data." — [HN](https://news.ycombinator.com/item?id=49765997)
- Laya thread, wren6991: "get ready for 'this VC-backed firm could have been a single arXiv preprint.'" — [HN](https://news.ycombinator.com/item?id=49766844)
- Laya thread, kamranjon: Jev may repackage GLiNER-style work. — [HN](https://news.ycombinator.com/item?id=49766495)
- Kev thread, #1 (nico, 27 replies): an embeddings plus logistic-regression classifier reaches "95% accuracy… with only 50-100 examples… model is <1MB, and inference is sub 100ms". — [HN](https://news.ycombinator.com/item?id=49789123)
- Kev thread, #2 (prodigycorp): "Man, I'm already burnt out on all this jev talk." They also called TypeSafe's data policy "completely draconian". — [HN](https://news.ycombinator.com/item?id=49788533)
- Kev thread, hbarka: how can a Qwen fine-tune trained with RLHF be "Jev-like" if Jev is trained with RLCD? — [HN](https://news.ycombinator.com/item?id=49784983)
- "Jev in 25 lines", #1 (sigmoid10): "Going directly for the logprobs is always icky when you use a chat model as base, because they are trained to write prose as output." — [HN](https://news.ycombinator.com/item?id=49813052)
- "Jev in 25 lines", #2 (antirez): put the options before the body so the masked-attention model "already knows what it needs to look for". — [HN](https://news.ycombinator.com/item?id=49813417)
- Ollaya thread, #2 (fooker): "For everyone dismissing Jev's innovation as being trivial, no it's not. It is definitely not the MNIST classifier you had trained in 2019." — [HN](https://news.ycombinator.com/item?id=49851886)
- Ollaya thread, #1 (pradn): "I'm not sure what this means for AI startups if their innovations can be copied by OSS so quickly (what, like 2 weeks?)." — [HN](https://news.ycombinator.com/item?id=49850052)
- Ollaya thread, george_max: Laya "performs significantly worse"; the Ollaya developer agreed. — [HN](https://news.ycombinator.com/item?id=49848537), [HN](https://news.ycombinator.com/item?id=49848595)
- Jeff 0.8B thread, AgentMasterRace: "70% vs 94%. for classification, it's unacceptable." — [HN](https://news.ycombinator.com/item?id=49884862)
- Jeff 0.8B thread, trebligdivad: "What proportion of commercial LLM use is classification?… what happens to business AI spending/data centre usage when they realise they don't need full LLMs." — [HN](https://news.ycombinator.com/item?id=49885443)
- OpenAI fast-follow thread, #1 (orbital-decay, 60 replies): "Every major AI shop has a ton of in-house classifiers already… people that are new to all this are discovering that classifiers exist… many tasks commonly done with generative models are classification in disguise." — [HN](https://news.ycombinator.com/item?id=49803945)
- Calibration, kantahayashi (hands-on): "I tested Jev with a fair die 400 times… Jev always chose face 1 and the probability it returned was about 83%." — [HN](https://news.ycombinator.com/item?id=49817305)
- Calibration, croemer quoting the "Jev Can't Be Calibrated" post itself: "A few hundred labeled examples from your actual data can be enough to fit a Platt scaling on top of Jev's scores." — [HN](https://news.ycombinator.com/item?id=49820330)
- Calibration, cannedbread (counterpoint): "On actual NLP problems… it does appear to be well calibrated". — [HN](https://news.ycombinator.com/item?id=49937555)
- Red Hat benchmark thread, segmondy: "(general, fast and cheap) before decision models, you could pick only 2." — [HN](https://news.ycombinator.com/item?id=49937542)
- Red Hat benchmark thread, AnthusAI: "Jev did a LOT better at multi-step reasoning tasks than any open decision model we have tested so far". — [HN](https://news.ycombinator.com/item?id=49937608)
- Ask HN, Jemaclus: Jev "allows you to define a new semantic decision at runtime in natural language, without training a model for that task". — [HN](https://news.ycombinator.com/item?id=49872751)
- Ask HN, softwaredoug: the hate echoes the infamous Dropbox/FTP comment. — [HN](https://news.ycombinator.com/item?id=49869690)
- Ask HN, the original poster later wrote: "I downloaded FLAN for comparison and you are quite right, gives similar results". — [HN](https://news.ycombinator.com/item?id=49868858)
- Raschka thread, Topfi: "The game demos were especially harmful… few to none of the flashy Doom, Minecraft, etc. showcases explained this was using game state." — [HN](https://news.ycombinator.com/item?id=49907126)
- Raschka thread, nzoschke quoting Raschka's line that Jev is "the ChatGPT moment for classification". — [HN](https://news.ycombinator.com/item?id=49903846)
- Cloudflare's own pre-Clef "Kev" demo: kflansburg wrote, "Similar to Jev, diffusion models generate output fully in parallel. We achieve similar estimation of relative confidence by looking at token log probabilities." — [HN](https://news.ycombinator.com/item?id=49762548)

### Inferences
- On HN the dominant frame for both Jev and Clef is "old idea, great packaging". Jev wins on interface and branding; Clef wins on openness and clearer technical writing but loses on price and on practitioners' measured latency.
- Several independent HN practitioners measured hosted Clef as slower than hosted Jev (about 850 ms vs about 110 ms p50; "2-3x slower"). This directly contradicts Cloudflare's median-latency table (Clef 209 ms, Clef-flash 38.8 ms, Jev 524 ms). The likeliest explanation is that Cloudflare measured model-side latency while users measured end-to-end time under launch-day load. That is my inference; nobody has disentangled it.

### Gaps
- HN does not expose comment scores, so "top" means HN's display rank at fetch time, not upvotes.
- Jev-related item counts depend on my keyword filter, which may include a few false positives and miss stories that don't name the terms.
- I found no HN post from Cloudflare's Workers AI PM (Michelle Chen) or a long-form Q&A from Cloudflare staff. Only short replies from kflansburg and eastdakota.

## 2. Reddit: threads, upvotes, key comments, local-running reports and benchmark reproductions

### Takeaway
r/LocalLLaMA was the epicentre. The Laya author's "I built the Jev architecture a year ago" post hit 3,500 upvotes, and the backlash ran from "Mods: …advertising posts for Jev" (1,292) to "Jev isn't new tech" (864). Clef got a warm welcome there (392 upvotes, 97% upvoted; "Ok, this one is legit"). In r/CloudFlare, however, users' own tests (truncation at 2,194 tokens, 315–950 ms latency, worse accuracy than Jev) produced "Are Clef and Clef-Flash just bad?". Local-running work moved fast: bartowski GGUFs, Ollama library entries, a pending llama.cpp PR, and reports that Clef-flash Q4_K_M fits an 8 GB laptop GPU.

### Cited Findings
**Main threads (score / comments as of Oct 3)**
- r/LocalLLaMA "I literally built the Jev architecture one year back and completely open-sourced it" (Laya), 3,500 / 330, Sept 17, 98% upvoted. — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wijo3e/i_literally_built_the_jev_architecture_one_year/)
  - Top comment (850): "But did you post it saying it's the next big thing? Rookie mistake" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wijo3e/comment/pab7pv1/)
  - Second (614): your work means "they will not be able to obtain a valid patent on the general idea". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wijo3e/comment/pabcxhz/)
- r/LocalLLaMA "Mods: can we do something about half the forum getting filled with these advertising posts for Jev?", 1,292 / 244, Sept 23. The post body says: "Jev is a paid product that dumped a lot of venture capitol money into shill their product". Top reply (436): "my name is Jev". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wo6o0f/mods_can_we_do_something_about_half_the_forum/)
- r/LocalLLaMA "Jev isn't new tech. Its marketing targets people who think AI started with LLMs.", 864 / 334, Sept 23. — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1woe70t/jev_isnt_new_tech_its_marketing_targets_people/)
  - Top reply (230, caldazar24): "my experience with zero-shot classifiers is that they were just a lot dumber than LLMs… It's possible there's nothing to Jev but 'hey, let's put a lot more resources into a big zero-shot classifier'… That's still great!" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1woe70t/comment/pbmn3wz/)
  - radarsat1 (76): "People on both sides… saying 'this is just a classifier' and… 'this is just a single-token LLM' are both missing the point… it apparently works really well." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1woe70t/comment/pbn1lbk/)
  - A comment with 26 votes: "a finetuned ModernBERT or GLiClass classifer… can still beat Jev on accuracy per $. But… lots of folks value interfaces, and Jev has a snazzy one." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1woe70t/jev_isnt_new_tech_its_marketing_targets_people/pbmewkl/)
- r/LocalLLaMA "What is JEV and what is it used for?", 473 / 369, Sept 20. Top answer (494): "Like a decision tree model but generalized into a foundation model". Reply (351): "It's also neither local nor LLM." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wleg4w/comment/paxvkqe/), [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wleg4w/comment/pay05zy/)
- r/LocalLLaMA "I really don't understand Jev hype", 505 / 316, Sept 21. The comment tree failed to fetch. One captured comment (80): Jev "drops open-ended text generation entirely and operates as a non autoregressive decision model". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wm65le/i_really_dont_understand_jev_hype/pb4jg1y/)
- r/LocalLLaMA "JEV almost dead: CLM vs JEV", 458 / 190, Sept 24. Top reply (353, QuantumFTL): "the entire point of Jev is the Zero-Shot Broad Knowledge. If you don't have that, you're not a Jev competitor… I've completely had it with these posts that are 'I made Jev in a single day in a cave like Tony Stark'". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wouby6/comment/pbq30c8/)
- r/LocalLLaMA "New in llama.cpp: Decision Models", 414 / 109, Oct 2. — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvv6im/new_in_llamacpp_decision_models/)
  - Top comment (347, -p-e-w-): "Jev is a fascinating example of what happens when a super popular idea has no moat whatsoever… now 'Jev-like' models are everywhere, while Jev is nowhere. This all happened in less than a month." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvv6im/comment/pdf99al/)
- **r/LocalLLaMA "Clef: Open Weights decision model by Cloudflare", 392 / 114, Oct 1, 97% upvoted.** — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/clef_open_weights_decision_model_by_cloudflare/)
  - 185, milkipedia: "This is exactly what we needed in the local space." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd8rsj9/)
  - 76, fallingdowndizzyvr: "Do I have to verify I'm human to use it?" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd951h3/)
  - 57, Hobofan94: "For a decision model that's pretty heavy. Most of the other leading ones are 4B or less." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd9amx4/)
  - 33, oxygen_addiction: "Ok, this one is legit. And we have benchmark numbers for Laya / Kev 9B / DiffusionGemma Jev now. Now the question becomes: how shit does this get when we quantize it to anything under Q8?" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd8uuio/)
  - 30, MotokoAGI: "They are comparing with weak open jev models, they should compare with the leading ones in jevbench." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd8wbr1/)
  - 21, No_Contract_8296: "Cloudflare is actually beautifully positioned to host low-latency models thanks to their global infrastructure." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pdafcn2/)
  - 15, james_pic: TypeSafe "astroturfed the shit out of their model Jev, and prompted others to revisit those old techniques." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pdaj7yf/)
  - 13, crusaderky: "I see no reason to expect a different degradation curve from quantizing vanilla qwen". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd8wein/)
  - 3, a pricing comment: "Clef-flash is 9¢ per million tokens and Clef is 24¢ per million, compared to Jev at 4.2¢/M." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/clef_open_weights_decision_model_by_cloudflare/pday6t1/)
- r/CloudFlare, official u/Cloudflare post "Introducing Clef…", 50 / 3, Oct 1. The top replies were just "Expensive" (4) and "VERY" (6). — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1wv3u17/introducing_clef_our_opensource_decision_models/)
- **r/CloudFlare "Are Clef and Clef-Flash just bad?", 11 / 7, Oct 2.** The original poster sent batches of 150+ varied calls to each model and reported:
  - "both truncate at exactly 2,194 input tokens… I get 160-185ms on Jev… Clef-flash it was 315-570ms, on Clef it was 550-950ms. This is on the free Workers AI tier". — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/are_clef_and_clefflash_just_bad/)
  - devondragon1 (paid tier, email categorization): "much slower, more expensive, and less accurate than Jev". — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdhcn70/)
  - tadejkirincic (paid tier): "Jev overperforms both clef and clef-flash in all aspects. Better response time, better price and better output." — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdk66ut/)
  - choyiny: "latency is very bad", with a link to the [DecideBench dataset](https://huggingface.co/datasets/choyiny/decidebench). — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdhcaxu/)
  - Aliceable: rivals "just wrapped their LLMs in harnesses". — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdhcc0b/)
  - Another reply attributed the slowness to "launch day traffic, they're sorting it out", citing an X post by the Workers AI PM (I did not verify that post, since X is out of scope). — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdk8egv/)
- r/CloudFlare "TypeSafe's Jev… is on Workers AI as typesafe/jev", 31 / 10, Sept 21. Jev was already a third-party model on Cloudflare's own platform before Clef. Top comment (15, daskalou): "CloudFlare should work with the JEV team to host JEV directly from CloudFlare's edge locations. So what takes 300-400ms now could potentially take 150-200ms roundtrip from a user's browser". — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1wmjsj2/typesafes_jev_the_decisiononly_model_is_on/), [Cloudflare docs: Jev on Workers AI](https://developers.cloudflare.com/ai/models/typesafe/jev/)
  - etoptech: "I have it working on triaging issues in a worker." — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1wmjsj2/comment/pb7vtet/)
- Smaller Clef threads:
  - r/machinelearningnews "Cloudflare open-sources Clef (27B) and Clef-flash (9B)…", 58 / 4. One reply: "so much more expensive than Jev offer and probably more expensive of what OpenAI will charge." — [Reddit](https://www.reddit.com/r/machinelearningnews/comments/1wvh2if/cloudflare_opensources_clef_27b_and_clefflash_9b/)
  - r/accelerate "Clef model means humans no longer need to be in the loop for AI agents", 19 / 8. Reply: "There is no moat." — [Reddit](https://www.reddit.com/r/accelerate/comments/1ww4lyw/clef_model_means_humans_no_longer_need_to_be_in/)
  - r/codex "Clef: Open-source decision model by Cloudflare", 16 / 5. Reply: "This literally is Jev spam." — [Reddit](https://www.reddit.com/r/codex/comments/1wv7lt7/clef_opensource_decision_model_by_cloudflare/)
  - r/LocalLLaMA "Perplexity Decider 27B…", 58 / 11, Oct 2. Top reply (10): "First Cloudflare, now Perplexity. Nice. Shocking how much better the Cloudflare one is on benchmarks (Clef)." — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvfz9n/perplexity_decider_27b_open_weights_decision/pdcs82l/)
- Other notable Jev threads:
  - r/LLMDevs "Jev takes 70 to 500 ms to decide what to do in Doom. My model takes 10 ms, on a single CPU core", 393 / 53. — [Reddit](https://www.reddit.com/r/LLMDevs/comments/1wtajne/jev_takes_70_to_500_ms_to_decide_what_to_do_in/)
  - r/LocalLLaMA "I gave Jev, Laya, finetuned ModernCE and Qwen3.5 the controls to Doom", 232 / 99. — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wl1yzq/i_gave_jev_laya_finetuned_modernce_and_qwen35_the/)
  - r/hermesagent "Terms 'JEV' and 'Laya' are banned", 182 / 104. — [Reddit](https://www.reddit.com/r/hermesagent/comments/1wufwfv/terms_jev_and_laya_are_banned/)
  - r/singularity "Is Jev worth the hype?", 47 / 77. — [Reddit](https://www.reddit.com/r/singularity/comments/1wqs5d9/is_jev_worth_the_hype/)
  - r/MachineLearning "How is RLCD (jev) RL? [D]", 21 / 20. Reply (36, abnormal_human): "it is in reality an open source LLM with a few extra nn.Modules to nail their output shape and some post-training… trained it 100% with synthetic data generated by bigger LLMs." — [Reddit](https://www.reddit.com/r/MachineLearning/comments/1wk6iei/comment/paohorn/)

**Local-running reports: VRAM, quantization and speed**
- GGUF quants of Clef appeared on day one. "There are a couple of GGUF quants already. For example: https://huggingface.co/bartowski/Cloudflare_clef-GGUF". Unsloth added: "We should already support it in our decisions API". — [Reddit (r/unsloth)](https://www.reddit.com/r/unsloth/comments/1wvagj1/request_support_for_cloudflares_clef_decision/)
- llama.cpp's new `/v1/systemone` API (PR #29818) supports laya, julia-1, lev, openjev and kev but not Clef. "There is a separate PR open for Clef: https://github.com/ggml-org/llama.cpp/pull/29831. Seems to be a bit more challenging to fit this in." Another user wrote: "I had claude tweak llama.cpp last night to test cloudflare clef!" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvqbrz/llama_server_add_v1systemone_api_models_laya/), [HF blog: decision models in llama.cpp](https://huggingface.co/blog/ggml-org/decision-models-in-llamacpp)
- Ollama library entries exist for `clef` and `clef-flash` as of Oct 3. — [Bluesky (Ollama mirror bot)](https://bsky.app/profile/ollama.xmirror.bot/post/3mwwp2elym32q)
- r/LocalLLM "bobcat now runs Cloudflare's Clef-Flash on Apple silicon" (1 upvote). — [Reddit](https://www.reddit.com/r/LocalLLM/comments/1wvfk16/bobcat_now_runs_cloudflares_clefflash_on_apple/)
- VRAM figures from YouTube testers and The Register (detailed in §4 and §6):
  - Clef-flash Q4_K_M runs in Ollama on an 8 GB RTX 4060 laptop (~6.8 GB package).
  - Clef 27B used about 54 GB of VRAM including KV cache in one local test.
  - The Register cites 41 GB for Clef-flash and 85 GB for Clef. — [YouTube](https://www.youtube.com/watch?v=Fd11p4y_r6U), [YouTube](https://www.youtube.com/watch?v=LJIm1EL4X6Y), [The Register](https://www.theregister.com/ai-and-ml/2026/10/01/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models/5300649)
- Jev-alternative local reports (context for "heavy" Clef):
  - Unsloth: "Run Laya Decision Models Locally on just 4GB RAM!" (282 upvotes). — [Reddit](https://www.reddit.com/r/unsloth/comments/1wshm9a/run_laya_decision_models_locally_on_just_4gb_ram/)
  - "Mica v0.1 4B… runs on an 8 GB GPU — trained for under $30 of GPU time" (29). — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wqag1i/mica_v01_4b_open_jevstyle_decision_model_yesno/)
  - "Von: Open-source 395M 'System One' model" (202). — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wkpxn6/von_opensource_395m_system_one_model/)
  - A comment in r/LocalLLaMA's "Jev in 25 lines" thread: tiny (<4B) models on "only 4GB VRAM" were "sub 1s for most of my tests". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wo07r8/jev_in_25_lines_of_python/pbq1z87/)

**Benchmark reproductions on Reddit**
- "Jev vs. Kev" (Opper, 126 / 53). On 362 items published after both models shipped:
  - "Accuracy lands within 2 points on every task"
  - "Jev is better calibrated and pulls ahead on paraphrase detection (PAWS 87.0% vs 74.5%)"
  - "Jev counts a fixed ~257 extra input tokens per request… so short requests cost up to 12x more". — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wq2hfc/jev_vs_kev_opensource_jev_alternative_tested_side/)
- RAG reranking (r/Rag, 4 votes): "I have 99.7% recall in the top top 20 results after RRF etc and Jev brought it to 60 - 75%." — [Reddit](https://www.reddit.com/r/Rag/comments/1wrz5r2/pouring_a_year_of_rag_experience_into_my_ai/pchcx7i/)

### Inferences
- Reddit's mood toward Clef split by community. r/LocalLLaMA welcomed open weights and Apache 2.0, while asking about quantization and pointing to weak comparators. r/CloudFlare, where users actually call the hosted API, produced the most negative hands-on reports.
- The free-tier "truncate at exactly 2,194 input tokens" report sits far below the advertised 64k. If it reproduces, it is a concrete, testable discrepancy (my inference; it is not confirmed by Cloudflare).
- Jev was already available on Workers AI as `typesafe/jev`. That makes a same-platform Jev vs Clef A/B test possible inside Workers, and nobody has published one (my inference from the r/CloudFlare thread plus the docs page).

### Gaps
- I could not fetch the comment tree for "I really don't understand Jev hype" (API error).
- No Reddit thread reports measured tokens/sec, VRAM or quality-at-quant for Clef 27B Q4/Q5. The "how bad under Q8?" question is open.
- No one on Reddit has reproduced Cloudflare's 43-benchmark latency table or its Jev Decision Index scores.
- No Cloudflare employee replied in the r/CloudFlare "just bad?" thread at fetch time.

## 3. LinkedIn: Cloudflare and TypeSafe staff and execs, and industry commentators (business framing)

### Takeaway
LinkedIn framed decision models as cost and automation infrastructure ("yes/no questions wearing a very expensive suit") rather than as a research curiosity. TypeSafe's founders and investor drove huge engagement: the CEO's launch post drew 3,453 reactions and 583 shares. Cloudflare's own Clef posts were modest: 111 reactions on the corporate post and 10–48 on staff posts. The most-engaged Clef post came from an outsider (StackOne's CTO, 441 reactions): "Jev's head start lasted about two weeks". I found almost no CDN, edge or security-practitioner commentary on Clef.

### Cited Findings
**TypeSafe staff and investors (Jev)**
- Diogo Almeida (CEO), launch post, Sept 15: 3,453 reactions, 295 comments, 583 shares. "I left OpenAI to answer a question: if these models are so intelligent, why have they automated so little of the world's work?" The post also announced a "$40 million seed round led by DCVC". — [LinkedIn](https://www.linkedin.com/posts/diogomda_after-co-inventing-chatgpt-i-spent-2-years-activity-7505691479286308864-sem_)
- Almeida's follow-ups: Doom demo (668 reactions; "it only ended up costing ~$7/hour!") and WikiRace demo (321). — [LinkedIn](https://www.linkedin.com/posts/diogomda_our-system-one-model-jev-isnt-just-smart-activity-7506036729943072771-fmC5), [LinkedIn](https://www.linkedin.com/posts/diogomda_we-made-our-system-one-model-jev-play-wikirace-activity-7506370247705153536-d0ad)
- TypeSafe's head of recruiting, 48-hour recap: "40K TypeSafe AI Discord Members… 250,000+ people on the #Jev waitlist… 30M views on #X of our #LaunchVideo… #1 on #HackerNews and an exclusive in #Forbes". — [LinkedIn](https://www.linkedin.com/posts/miasmithson_jev-x-launchvideo-activity-7506438109526421504-Qf9T)
- Sasha Sheng (co-founder), 616 reactions: "We know we blew up - our entire team has been working extremely hard to serve Jev." — [LinkedIn](https://www.linkedin.com/posts/sashasheng_home-typesafe-ai-activity-7508359345210802177-nTsV)
- Dae Kim (TypeSafe), 134 reactions: "I received and responded to 1,000+ emails this weekend… Jev is production ready". — [LinkedIn](https://www.linkedin.com/posts/kimdae_i-received-and-responded-to-1000-emails-activity-7507823120049741825-ATnO)
- Erik Spock Gafni (co-founder/CTO): "LLM orchestration is a super exciting usecase for Jev!" — [LinkedIn](https://www.linkedin.com/posts/erik-spock-gafni-906b0125_aiagents-llmsecurity-multiagentsystems-activity-7506371967957204992-iDq4)
- James Hardiman (DCVC general partner, the lead investor): "~18 months ago, Diogo Almeida, Erik Spock Gafni, and Sasha Sheng came to us… What I didn't appreciate was just how BADLY the ENTIRE industry wanted it." — [LinkedIn](https://www.linkedin.com/posts/hardimanjames_its-been-an-absolutely-insane-72-hours-since-activity-7506884117892927488-hLXD)

**Cloudflare staff and the corporate account (Clef)**
- Cloudflare corporate post, Oct 1: 111 reactions, 5 comments, 10 shares. It framed Clef as models "for high-speed classification and agentic workflows" plus "a new reinforcement learning platform". — [LinkedIn](https://www.linkedin.com/posts/cloudflare_introducing-clef-our-open-source-decision-activity-7511513232591704066-PZhZ)
- Alex Reneau (AI @ Cloudflare, blog co-author), 39 reactions: "Decision models are nothing new, but they matter more than ever now that agents need to make fast, reliable decisions. Instead of using an unnecessarily large LLM, you can give Clef context (text, JSON, images or video)… We're also #1 on hacker news!!!" — [LinkedIn](https://www.linkedin.com/posts/alex-reneau-4b3086160_excited-to-announce-cloudflares-decision-activity-7511478379846463489-XA1U)
- Jasmeet Singh (Cloudflare), 48 reactions: at a 100+ creator vibe-coding event, "A bulk of the stack was build using Clef, workers, durable objects". — [LinkedIn](https://www.linkedin.com/posts/jasmeeet_agents-vibecode-cloudflare-activity-7511809635784527872-ZBDd)
- Mark Phelps (Cloudflare), 10 reactions: "My team Cloudflare just released Clef… So naturally.. I had to play with it. Introducing https://glizzy.cam 🌭" (a hot-dog detector, also posted on HN). — [LinkedIn](https://www.linkedin.com/posts/markphelps1_my-team-cloudflare-just-released-clef-and-activity-7511768992576086016-qggB)
- Richard Black (Cloudflare) listed Clef first in a Birthday Week "Shipping Report" (12 reactions). — [LinkedIn](https://www.linkedin.com/posts/richard-black-uk_birthday-week-2026-cloudflare-activity-7511722887427379200-h00u)

**Industry commentators on Clef**
- Guillaume Lebedel (co-founder/CTO, StackOne), 441 reactions, 33 comments: "Jev's head start lasted about two weeks 🙃 Cloudflare just open-sourced Clef, a drop-in alternative to TypeSafe AI's Jev. Its small model answers in under 40ms, vs ~520ms for Jev." — [LinkedIn](https://www.linkedin.com/posts/guillaumelebedel_jevs-head-start-lasted-about-two-weeks-activity-7511590026103771136-gta9)
- Cho Yin Yong (DecideBench; CS lecturer at UofT), 60 reactions, an independent benchmark on 400 contrastive decisions:
  - Clef (27B): 94.8% accuracy, $131 per million decisions, 811 ms median
  - Clef-Flash (9B): 85.8%, $49, 695 ms
  - JEV: 98.0%, $32, 639 ms
  - Quote: "JEV is still the cheapest model above 95%. Clef lands just behind imajev-4b… as the most accurate open decision model, but costs four times as much". — [LinkedIn](https://www.linkedin.com/posts/choyiny_ai-llm-machinelearning-activity-7511789673074073600-N7cr)
- Daniele Stroppa (AWS Field CTO, retail and e-commerce): "Most of the AI calls your retail stack makes today shouldn't go to an LLM. They're yes/no questions wearing a very expensive suit." He lists Jev, Kev, Clef, AWS Strands Decider and Laya. — [LinkedIn](https://www.linkedin.com/posts/danielestroppa_agenticai-retail-consumergoods-activity-7511862767931244544-I6aR)
- Georgi Gospodinov (Tengrium; ex-Walmart), a deployment-risk framing: Clef targets "structured classification at decision boundaries where an LLM's token-generation path introduces latency, parsing fragility, and calibration drift… The question is where those gains translate into reduced deployment risk and where they mask gaps." — [LinkedIn](https://www.linkedin.com/posts/ggospodinov_cloudflare-releases-clef-and-clef-flash-activity-7511788644282621952-2l0v)
- It's FOSS: "Cloudflare just entered the decision model space to ride the Jev hype wave… The technical edge is real." — [LinkedIn](https://www.linkedin.com/posts/itsfoss_cloudflare-just-entered-the-decision-model-activity-7511667197983870976-q1PU)
- prokube got Clef running on its platform the next day via "a new KServe runtime and a lightweight decision adapter". — [LinkedIn](https://www.linkedin.com/posts/prokube_decision-models-are-currently-all-the-rage-activity-7511809388085637120-p6SJ)
- Manish Jain claims Clef "supports up to a 256k token context". This contradicts Cloudflare's stated 64k context. One aggregator says the models were "trained for 256k context (64k hosted)", which I could not verify. — [LinkedIn](https://www.linkedin.com/posts/jainmanishk_decisionmodel-jev-clef-activity-7511903781727457281-wX_D); contradicted by [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

**Business framings for Jev (enterprise adopters and commentators)**
- Ollama (4,319 reactions, the most-engaged decision-model post I found): "Ollama now supports Jev-like decision models all locally in 0.35… for tasks like ticket triaging, model routing, and content moderation." — [LinkedIn](https://www.linkedin.com/posts/ollama_ollama-now-supports-jev-like-decision-models-activity-7510921078119202817-S19q)
- Cost savings, Ashu Dubey (CEO, Alhena.ai), 246 reactions and 102 comments: "We're on track to save ~15-20% of our LLM expenses thanks to Jev!… our spend is in seven figures… accuracy is actually on par with or slightly better". — [LinkedIn](https://www.linkedin.com/posts/ashudubey_fascinated-by-jev-from-typesafe-ai-were-activity-7509647547834134528-raPD)
- Product UX, Ketan Karkhanis (CEO, ThoughtSpot): "Intent detection while you type… So Spotter can begin building the answer while the question is still being written." — [LinkedIn](https://www.linkedin.com/posts/ketankarkhanis_super-excited-about-what-the-team-is-shipping-activity-7511871715610648576-0aI-)
- Skill and tool selection, Shafqat Islam (President, Optimizely): "Jev was faster at every catalog size, by 15% to 36%. Cost: 7x to 20x cheaper." — [LinkedIn](https://www.linkedin.com/posts/shafqat_when-i-read-the-jev-announcement-i-thought-activity-7508622773976449024-yl02)
- Ad tech, Siva Jagadeesan (VP, Yahoo): "Ad tech has a layer that still runs on rules and people… Is this creative compliant? Does this package fit this brief? Does this page suit this brand?" — [LinkedIn](https://www.linkedin.com/posts/sivajag_ad-tech-has-a-layer-that-still-runs-on-rules-activity-7509751092692480000-cTAC)
- Legal and eDiscovery, Benjamin Sexton (JND): decision models are "a new category that sits between" traditional TAR classifiers and GenAI review. — [LinkedIn](https://www.linkedin.com/posts/benjamindsexton_ediscovery-tar-decisionmodels-activity-7510316030544596992-nYLi)
- Security and DLP, DT Mirizzi: in a 515-document benchmark against Presidio, GLiNER and regex, "Jev won 4 out of 5 categories… But at 1,570ms/doc over an API, it can't scan a corpus alone." — [LinkedIn](https://www.linkedin.com/posts/dtmirizzidamian_dt-mirizzi-jev-is-a-general-purpose-model-activity-7508575920220446720-qmMS)
- Fraud, Niraj Kumar: a proposal to put Jev in front of frontier reasoning models in a fraud pipeline. — [LinkedIn](https://www.linkedin.com/posts/nirajkunwar_frauddetection-systemarchitecture-fintech-activity-7510637494493749248-0l65)
- Fraud, Vitor Monteiro (Prior Labs) compared Jev to TabPFN on fraud. — [LinkedIn](https://www.linkedin.com/posts/vitorrmmonteiro_jev-vs-tabpfn-activity-7511077773805768705-ERj8)
- Throughput, Naheed Vora (PM, Android & Play): "dropping overall compute time from 18 min to 30 sec… 14M input tokens cost me half a dollar." — [LinkedIn](https://www.linkedin.com/posts/aheed_jevons-activity-7510167834682048512-UNo7)
- Theo B.: "We just classified 500,000+ Slack messages and meeting notes in 10 minutes… People call it a glorified BERT model. I don't care." — [LinkedIn](https://www.linkedin.com/posts/theo-bui_we-just-classified-500000-slack-messages-activity-7510357223655653376-C8oM)
- Subhadip Chatterjee (WTW), the practical gap: "TypeSafe tells you to tune Jev's thresholds on your own data. It does not tell you how to do this. That is the major part of the work." — [LinkedIn](https://www.linkedin.com/posts/subhadipc_artificialintelligence-softwareengineering-activity-7510843698440454144-TtgD)

### Inferences
- The LinkedIn business frame is "route the cheap decisions away from expensive LLMs". Most adopters cite cost (15–20% of LLM spend, 7–20x cheaper) and throughput rather than accuracy.
- Cloudflare's LinkedIn messaging leaned on "agents need fast, reliable decisions" and the RL fine-tuning platform. It did not use edge, latency-at-the-PoP or security-product framing, even though those are Cloudflare's core enterprise stories (my inference from the staff and corporate posts found).
- The only independent quantitative Clef comparison on LinkedIn (DecideBench) puts Clef below Jev on accuracy, cost and latency. That matches the Reddit and HN hands-on reports.

### Gaps
- My Apify search (keyword "Clef", author company "Cloudflare", past week) returned only 9 posts. I found no LinkedIn posts about Clef from Matthew Prince, Michelle Chen or other Cloudflare executives. They may post mainly on X, or my search may have missed them.
- I found no CDN, edge-networking or security-vendor practitioners (e.g., Akamai, Fastly, or WAF/bot-management people) commenting on Clef on LinkedIn. My edge/WAF/bot-specific searches returned only fraud and generic posts.
- LinkedIn reaction counts are totals across reaction types. Comment text beyond the post body was not collected.

## 4. YouTube (plus TikTok and Instagram): videos, channels, views, dates and main claims

### Takeaway
Jev got blanket YouTube coverage within days: at least 14 videos above 100k views, led by Caleb Writes Code (762k), Greg Isenberg (743k) and Krish Naik (526k), with IBM Technology adding 379k on Oct 1. Clef had almost none as of Oct 3. Its biggest video is Fahd Mirza's local test at about 4.3k views, and no large creator has covered it. The small Clef videos that exist contain useful hands-on data (8 GB laptop Q4 run, DGX Spark BF16 test, a 240-case Spanish/English test). TikTok and Instagram show the same gap.

### Cited Findings
**Largest Jev videos (views as of Oct 3)**

| Video | Channel | Views | Date | Main claim / angle | Link |
|---|---|---|---|---|---|
| Jev explained in 7min.. | Caleb Writes Code | 761,841 | Sep 18 | Jev questions RLHF/RLVR-era thinking via "RLCD"; sponsored (#ad) | [YT](https://www.youtube.com/watch?v=vj7hysh0mOI) |
| Jev is HERE. How to use it | Greg Isenberg (with Ryan Vogel) | 742,634 | Sep 18 | ~200 ms per decision; sorted 1,700 emails for 18 cents; startup ideas | [YT](https://www.youtube.com/watch?v=4mTLpuQpB80) |
| Will Jev Replace LLM's? | Krish Naik | 525,669 | Sep 21 | Explainer (bootcamp promo) | [YT](https://www.youtube.com/watch?v=2vYV4K1RQ1w) |
| Jev is incredible | Theo – t3.gg | 487,562 | Sep 20 | "a fast classifier with tons of perks and safety, but it doesn't replace reasoning models" | [YT](https://www.youtube.com/watch?v=F3YXg7AaKWE) |
| Jev CEO: I made ChatGPT, now I'm building what's next | AI Engineer | 485,072 | ~2 months old (pre-launch talk) | Diogo Almeida's "What's next after RLHF" talk | [YT](https://www.youtube.com/watch?v=cJ0EOzey--o) |
| Jev – The Ultimate Classification Model? | Sam Witteveen | 445,705 | Sep 18 | System 1 framing, demos | [YT](https://www.youtube.com/watch?v=X117w2Rark8) |
| JEV Breakdown: The First AI Model Built For Code | Rob Shocks | 401,422 | ~2 weeks before Oct 3 | Explainer | [YT](https://www.youtube.com/watch?v=2Bs0Ink_-Uo) |
| What Is Jev? The AI Model That Doesn't Generate Text | IBM Technology (Martin Keen) | 378,699 | Oct 1 | Calibration explainer; Jev for routing, classification, guardrails | [YT](https://www.youtube.com/watch?v=YGgNBcIgI4s) |
| What is Jev and How to Use it? | Codevolution | 339,046 | ~Sep 20 | Tutorial | [YT](https://www.youtube.com/watch?v=ZgXej_9isxY) |
| Why I couldn't build Jev at OpenAI — Diogo Almeida | Latent Space | 336,925 | Sep 21 | 2h22m CEO interview | [YT](https://www.youtube.com/watch?v=cFx9Z3ZXca0) |
| Yes, Jev Is Insane, But There's A Catch | Two Minute Papers | 280,054 | Sep 22 | "~200x faster"; the catch is calibration ("if it says 80%… correct about 80 times out of 100"); credits prior work (Laya, SetFit papers) | [YT](https://www.youtube.com/watch?v=qBBRRsH0rQc) |
| Jev Explained: Demos and Use Cases | Syntax | 268,228 | ~2 weeks before Oct 3 | Demos | [YT](https://www.youtube.com/watch?v=QbYBRjOaGOo) |
| Open Jev Models Are Here!! | Sam Witteveen | 203,266 | Sep 20 | Tests 7 open Jev-style models (SemIf, Nimble, Decider, OpenJev, DiffusionGemma, NanoJev, Laya) | [YT](https://www.youtube.com/watch?v=53wDOI_7x8I) |
| Open Source, Faster Jev is HERE | CoderOne | 168,730 | Sep 21 | Laya as an open alternative "so it mathematically cannot hallucinate" | [YT](https://www.youtube.com/watch?v=kWToHpdxScE) |
| How Jev Turns AI Into Software That Gets Things Done | a16z (Ben Horowitz, Martin Casado) | 51,432 | Sep 28 | "where is all the automation?" | [YT](https://www.youtube.com/watch?v=Ut3LOjKNJaE) |
| I Tested Jev vs 12 Local Decision Models | The AI Automators | 27,434 | Sep 28 | See hands-on below | [YT](https://www.youtube.com/watch?v=zBw5BMrlZLo) |
| Jev Explained: The Fast AI Model We Tried to Break on Purpose | Boundary (AI That Works) | 13,969 | Sep 25 | Adversarial testing | [YT](https://www.youtube.com/watch?v=35PSMmDDKP8) |
| TypeSafe Jev Fact-Check: The 200x AI Hype vs What's Proven | Prism Labs | 2,264 | Sep 19 | "What survives: a real 70ms typed-decision model. What doesn't: the 200x marketing math, and 'can't hallucinate.'" | [YT](https://www.youtube.com/watch?v=no9G3N8PSIk) |

**Every Clef video I found (as of Oct 3; all posted Oct 1–3)**

| Video | Channel | Views | Main claims / findings | Link |
|---|---|---|---|---|
| Clef 27B Locally: Multimodal Decision-Maker From Text, Images and Video | Fahd Mirza | 4,313 (79 likes) | Local install. Shows "under 54 gig of VRAM" with KV cache. Qualitative multimodal demos (security social-engineering 76%, chemistry diagram 99.1%, video clip read as a ritual at 72.2%) | [YT](https://www.youtube.com/watch?v=LJIm1EL4X6Y) |
| Cloudflare Clef: Testing a Decision AI on DGX Spark (Japanese, with EN subs) | 海外テックの「これマジ?」 | 1,118 | Official BF16 weights on DGX Spark. Threshold tests correct (999/1,000 USD → <1%, 1,001 USD → ~99%; receipt images 980 vs 1,280 USD → <1% vs ~99.6%). On a hard 4-choice rule-following set, 22.5% (rules) and ~28% (location), near chance (25%). Easy rules 87.5%. Task assignment ~78% easy / ~54% hard. A wrong answer got ~98.7% confidence | [YT](https://www.youtube.com/watch?v=T4irkjyJt8c) |
| Cloudflare Clef vs Jev: I Tested Q4_K_M Locally in Ollama | Prompt Engineer 48 | 1,058 | bartowski Clef-flash Q4_K_M: backbone ~5.84 GB, package ~6.8 GB with vision projector, on an RTX 4060 8 GB laptop (~87% on GPU). Caveat: "The tested Ollama path generates constrained JSON; it does not reproduce the official joint schema decision head." Jev was not queried live | [YT](https://www.youtube.com/watch?v=Fd11p4y_r6U) |
| Cloudflare Clef: Free Open Source AI Decisions in 38ms | Prism Labs | 936 | "Cloudflare wins accuracy, latency, context length, vision, and openness. TypeSafe still wins sticker price"; "the pricing catch" is 24¢ vs 4.2¢ per M tokens | [YT](https://www.youtube.com/watch?v=MNclmc7hFuo) |
| CLEF – NEW DECISION MODEL! A JEV KILLER? (Russian) | Блокчейн Разработчик | 319 | Overview | [YT](https://www.youtube.com/watch?v=1fBRHDJVbkg) |
| Clef: Open-source decision models, and new RL fine-tuning platform | Signal Coders | 276 | Chapters include "Read The P95, Not Median" and "The Benchmarks Cloudflare Does Not Lead" | [YT](https://www.youtube.com/watch?v=xzuzf9TH1OA) |
| How to Access and Install Cloudflare AI Clef / Clef flash | Reality PC | 153 | Install how-to | [YT](https://www.youtube.com/watch?v=BYdajcmKBAk) |
| ¿Cloudflare (CLEF) alcanzó a Jev? Lo medí con 240 casos (Spanish) | Jungla Digital | 128 | See hands-on below | [YT](https://www.youtube.com/watch?v=3rGrd8btwQY) |
| Cloudflare's Clef Takes On Jev | Tech Brew Ride Home | 90 | News: "costs nearly six times as much per token on Workers AI, unless you download the Apache-2.0 weights" | [YT](https://www.youtube.com/watch?v=Uyka72mdGn0) |
| Jev to Clef: Can Decision Models Know When to Ask a Human? | Agent Workflow Lab | 27 | See hands-on below | [YT](https://www.youtube.com/watch?v=jWQWp09voDU) |
| Clef vs Jev: Cloudflare's NEW AI Decision Model Takes on Jev | AI WITH Rithesh | 8 (38 minutes old at fetch) | News | [YT](https://www.youtube.com/watch?v=UzKAMH0ICbU) |
| Triage support tickets by urgency and team with Cloudflare Clef | Marcelo Paniza Tech | 15 | 1:40 demo | [YT](https://www.youtube.com/watch?v=Wb6cfR41GBo) |

**Hands-on findings from videos**
- Jungla Digital (Spanish), 240 new cases in Spanish and English:
  - "On the usual exam, Jev got 96 out of 96, and Clef got 93 in Spanish and 91 in English. On the new exam… 87 to 86 in Spanish and 88 to 89 in English… a tie."
  - "Clef is better at hesitating when it's missing information, and Jev is faster."
  - On a barber's schedule, both models scored 11/16.
  - Clef has "a free daily quota of about 1,900 decisions; past that, each decision costs about three times what it costs on Jev."
  - "Clef flash runs on a computer with a 16 GB graphics card: out of 240 decisions, 239 came out the same as on Cloudflare's servers." — [YT](https://www.youtube.com/watch?v=3rGrd8btwQY)
- Agent Workflow Lab:
  - On 24 text cases: "Jev 24/24; Clef 27B 24/24; Clef-Flash 23/24; llamacpp-jev / Qwen3.5-4B-Q8_0 14/24; Laya English 421M 16/24."
  - On 12 synthetic order screens, from screenshot or text: "Clef scored 12/12 in each image/text condition, and Clef-Flash 10/12… Valid execution is not correct judgment." — [YT](https://www.youtube.com/watch?v=jWQWp09voDU)
- The AI Automators (Jev vs 12 local models on an RTX 5090):
  - Jev topped overall accuracy at 95.23%. The auto-caption reads "Jeff", which means Jev.
  - On short inputs, local models were faster: "Winnow… around 56 milliseconds, Decider 47 milliseconds, whereas [hosted Jev] was much slower at 245 milliseconds".
  - The local models are "only faster when the input is short". — [YT](https://www.youtube.com/watch?v=zBw5BMrlZLo)

**TikTok and Instagram**
- Jev TikToks reached tens of thousands of plays:
  - kodekloud "Meet Jev, the AI Model That Doesn't Chat!": 98,069 — [TikTok](https://www.tiktok.com/@kodekloud/video/7688342090048130322)
  - stevemorinnyc: 77,571 — [TikTok](https://www.tiktok.com/@stevemorinnyc/video/7687043236430417182)
  - zauey: 61,954 — [TikTok](https://www.tiktok.com/@zauey/video/7688217076422495501)
  - stevencodes.swe: 50,262 — [TikTok](https://www.tiktok.com/@stevencodes.swe/video/7687344512200412430)
  - vibewithkevin "7 wild things people built with Jev in 48 hours": 45,133 — [TikTok](https://www.tiktok.com/@vibewithkevin/video/7686867856151104798)
- Clef TikToks barely registered:
  - mattmasur.ai: 1,266 plays — [TikTok](https://www.tiktok.com/@mattmasur.ai/video/7692155977830845727)
  - jordan.dalton announcement: 1,026 — [TikTok](https://www.tiktok.com/@jordan.dalton/video/7691751181667880222)
  - jordan.dalton image-modality demo: 177 — [TikTok](https://www.tiktok.com/@jordan.dalton/video/7691843215363755294)
  - nick.aiatwork: 945 — [TikTok](https://www.tiktok.com/@nick.aiatwork/video/7692084994189053217)
- Instagram Jev reels:
  - vamsi_bhavani: 27,371 plays — [Instagram](https://www.instagram.com/reel/DdoEiEqRZuT/)
  - aibutsimple: 12,643 — [Instagram](https://www.instagram.com/reel/Dd_kOLtjpmO/)
  - Bloomberg TV: 1,848 — [Instagram](https://www.instagram.com/reel/DdyPuFrjZ4B/)

### Inferences
- There is a large creator gap. Jev's top 10 YouTube videos total about 5M views, while Clef's entire YouTube corpus is under 10k. No major tech or AI channel (Theo, Sam Witteveen, Two Minute Papers, IBM Technology, Fireship-style channels) had covered Clef by Oct 3.
- The existing Clef videos are hands-on but small. Their findings (Q4 on 8 GB, a 16 GB GPU reproducing hosted outputs 239/240, near-chance on hard rule-following, overconfident errors) are uncited by bigger outlets, so they are ripe for a definitive test video.
- No Clef video tests edge or CDN scenarios: Workers in-request decisions, WAF/bot gating, per-PoP latency, or domain categorization like Cloudflare's own threat-intel example.

### Gaps
- Exact publish dates for some Jev videos come only from relative "N days ago" search metadata (marked "~").
- I did not collect YouTube comment sections, so audience sentiment on the Clef videos is unknown.
- The DGX Spark video's accuracy numbers come from its Japanese transcript, which I translated myself. The English subtitle track was not fetched.
- I did not fetch TikTok and Instagram exact dates or comments.
- My Instagram reels search for "Cloudflare Clef AI" returned no Clef-relevant reels, so Instagram coverage of Clef appears to be nil as of Oct 3.

## 5. Bluesky and Threads

### Takeaway
Bluesky had a lively developer conversation. Jev launch posts drew up to 302 likes; posts on Clef stayed small apart from one engineer's hands-on verdict that Clef-flash showed "no real benefit compared to jev". Threads activity on Clef was minimal: Cloudflare's own Clef post got 21 likes.

### Cited Findings
- Tim Kellogg, launch day (302 likes, 35 reposts): "Jev: Fable-level model that doesn't charge for output tokens because they're too cheap to meter… it only makes decisions, doesn't generate text". — [Bluesky](https://bsky.app/profile/timkellogg.me/post/3mvlgrngb3c2l)
- Tim Kellogg, critique: "why did jev call it a 'decision model' instead of 'classification'? BECAUSE THATS JUST HOW HYPE IS DONE. respect game." — [Bluesky](https://bsky.app/profile/timkellogg.me/post/3mw2ttcgk4223)
- Tim Kellogg flagged ToS limits on professional use ("don't use Jev at work btw"), then said the MCA "walks back those clauses". — [Bluesky](https://bsky.app/profile/timkellogg.me/post/3mvv5aiv7kk2q), [Bluesky](https://bsky.app/profile/timkellogg.me/post/3mvv6rv42a22q)
- Nate Moore, bias test (166 likes): "made a benchmark to send 1824 independent requests (76 names x 8 resumes x 3 reps), and jev deterministically picked the same 2/8 resumes to proceed regardless of name attached." — [Bluesky](https://bsky.app/profile/natemoo.re/post/3mvwedvkhv223)
- Simon Willison (131 likes) linked his notes on Jev and "the new category of system one aka decision models". — [Bluesky](https://bsky.app/profile/simonwillison.net/post/3mw2tsop42c2u)
- David Mimno (NLP researcher), thread: "It's possible for Jev/Laya/Decision Models to be not that big a deal as tech and massive as a new paradigm." — [Bluesky](https://bsky.app/profile/dmimno.bsky.social/post/3mw4z67evic2j)
- Hailey (hailey.at) welcomed Clef ("fuck yea", 133 likes), then tested it:
  - "at least with the flash version of this, no real benefit compared to jev. in fact, in situations where jev and clef disagree in my task, jev is right the majority of the time" (51 likes)
  - "clef also does a lottttt more hedging. less sure of itself and wrong on the hard ones… for text only jev seems to be a good step above" (20 likes) — [Bluesky](https://bsky.app/profile/hailey.at/post/3mwteiwcsek2l), [Bluesky](https://bsky.app/profile/hailey.at/post/3mwuxmnxyjk23), [Bluesky](https://bsky.app/profile/hailey.at/post/3mwuxmq67ls23)
- Paul Frazee (147 likes): "You can make all the decision models you want, you can never match Jev on the thing that matters most. A silly name." — [Bluesky](https://bsky.app/profile/pfrazee.com/post/3mwtrxukkes2g)
- Jacob Gold (79 likes): "they spent 2 years in stealth to build something others cloned in 2 weeks... This is why we launch quickly, folks." — [Bluesky](https://bsky.app/profile/jacob.gold/post/3mwtg322vjs2k)
- David Crespo (50 likes): "kind of unbelievable that it only took like a week for 'decision model' to catch on". — [Bluesky](https://bsky.app/profile/davidcrespo.bsky.social/post/3mwtcrruejc22)
- Jeremy Morrell, who writes "we" and so appears to be a Cloudflare employee: "in retrospect decision models are kind of absurdly well-tailored to Cloudflare's edge architecture. So we made our own! And it's multimodal from the beginning!" (2 likes) — [Bluesky](https://bsky.app/profile/jeremymorrell.dev/post/3mwtsqsxkqc2x)
- AI Founders Czech: "Self-reported benchmarks only — independent evals not out yet. The platform is the interesting part, not the models." — [Bluesky](https://bsky.app/profile/aifoundersczech.bsky.social/post/3mwuqqezocs2k)
- stdlib: "Claude printed me a Jev-compatible server for Clef in 100% cuTile-python last night." — [Bluesky](https://bsky.app/profile/stdlib.bsky.social/post/3mwvurspacs27)
- Cloudflare's official Bluesky Clef post: 15 likes, 3 reposts. — [Bluesky](https://bsky.app/profile/cloudflare.social/post/3mwtmznu7ln22)
- Ecosystem integrations announced on Bluesky:
  - Unsloth: "run Laya Decision models locally on just 4GB RAM" — [Bluesky](https://bsky.app/profile/unsloth.ai/post/3mwlms2vebk2p)
  - DuckDB: "Jev & DuckDB: Plain-English Conditions in SQL" — [Bluesky](https://bsky.app/profile/duckdb.org/post/3mwoex2mobk26)
  - LangChain4j 1.21 "Decision Models" — [Bluesky](https://bsky.app/profile/langchain4j.dev/post/3mwvfnhia4k2e)
  - AWS's "Strands Decider 2B" (via a TechCrunch repost) — [Bluesky](https://bsky.app/profile/denyally.bsky.social/post/3mwtlarbwef2g)
- Threads: Cloudflare's official Clef post had 21 likes and 2 replies (Oct 1). — [Threads](https://www.threads.com/@cloudflare/post/Dd9s-yiHenR)

### Inferences
- The only substantive Bluesky test of Clef (hailey.at) matches the HN, Reddit and LinkedIn tests: on text-only tasks Clef-flash hedges more and loses to Jev where they disagree. Multimodality is its only clear differentiator.
- The engineering community's "decision models fit edge architecture" intuition shows up only in a Cloudflare insider's 2-like post and a few HN and Reddit comments. It has not been developed into public content.

### Gaps
- Bluesky search is keyword-based. Posts that link Clef without naming it were caught only through embed titles.
- ScrapeCreators has no Threads keyword search, so I checked only Cloudflare's own Threads feed. Broader Threads discussion of Jev or Clef is unmeasured.

## 6. Newsletters, blogs and press: what they said

### Takeaway
The big AI newsletters covered Jev (The Batch, Ben's Bites, Latent Space, Simon Willison, Raschka's Ahead of AI) but had not covered Clef by Oct 3. Clef's press came from The Register (headline "Cloudflare tries to outplay Jev…", which flagged self-reported benchmarks and a 6x price gap), Slashdot, Techmeme, MarkTechPost, TLDR and developer blogs. One developer blog (flaviocopes) published the most useful hosted-latency measurements.

### Cited Findings
- **The Batch (DeepLearning.AI), Sept 25, issue 372**, "Jev, A Classification Model, Takes the Developer World By Storm, Spawns Imitators":
  - Jev scored 67% accuracy on TypeSafe's four internal datasets, about the same as GPT-5.6 Terra and Claude Sonnet 5, at about $0.0007 per example vs $0.06 (Terra) and $0.12 (Sonnet).
  - It names the imitators Laya, Bespoke Nimble and Kev.
  - Editorial: "TypeSafe takes a middle road: let's build one model that can perform any classification task well" and "Jev won't replace modern LLMs… Instead, it can detect jailbreaks, flag missing details, judge user satisfaction". — [The Batch](https://www.deeplearning.ai/the-batch/models-built-to-do-one-thing-well), [Issue 372](https://www.deeplearning.ai/the-batch/issue-372)
  - The Batch lists Jev's input limit as 64,000 tokens. That conflicts with Cloudflare's "Jev's 32k" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/). The Register reconciles the two as "64k context windows, though Jev limits individual questions to 32k tokens" — [The Register](https://www.theregister.com/ai-and-ml/2026/10/01/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models/5300649).
- **Simon Willison, Sept 21**, "Jev introduces a new shape of LLM":
  - "the decision model framing is useful for understanding where to use Jev. It's great for anything that can be expressed as a classification task."
  - He warns about opacity ("the only thing you're going to get back is a floating point number") and bias. His city-scoring experiment rated Cupertino high and East Palo Alto low.
  - He suggests BM25-then-Jev reranking and mentions Kev and JevBench.
  - His October archive had no Clef post as of Oct 3. — [Simon Willison](https://simonwillison.net/2026/Sep/21/jev/), [Oct archive](https://simonwillison.net/2026/Oct/)
- **Latent Space**: a podcast with the TypeSafe CEO ("Jev: System One Models for Prod, Not God"); its YouTube version has 336,925 views. I found no Latent Space or AINews item on Clef. — [Latent Space](https://www.latent.space/p/jev), [YouTube](https://www.youtube.com/watch?v=cFx9Z3ZXca0)
- **Ben's Bites**: "What can you build with Jev", plus Ben Tossell's "Jev, week one · 100 things people built". A search snippet attributes this line to Tossell: "A new kind of AI came out last week. It does not talk. It decides." I did not verify it verbatim. — [Ben's Bites](https://www.bensbites.com/p/what-can-you-build-with-jev), [bentossell.com](https://bentossell.com/jev/)
- **Sebastian Raschka (Ahead of AI)**, "Language models for text classification: From bag-of-words to Jev" (213 HN points). He frames Jev as "the ChatGPT moment for classification", as quoted by an HN commenter. — [Raschka](https://magazine.sebastianraschka.com/p/classifier-history-and-jev), [HN](https://news.ycombinator.com/item?id=49903846)
- **TLDR**: covered Clef on Oct 1: "Cloudflare open-sourced Clef, its first decision models, built to let AI agents classify and route tasks in milliseconds without a human." The source is TLDR's own X post (X is out of scope here; cited for attribution only). — [TLDR on X](https://x.com/tldrnewsletter/status/2105692835857006669)
- **The Register**:
  - Sept 16: "TypeSafe AI debuts model for machines that plays Doom" — [The Register](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711)
  - Sept 23: "Shut up and calculate: Jev's new AI primitives for coders" — [The Register](https://www.theregister.com/devops/2026/09/23/shut-up-and-calculate-jevs-new-ai-primitives-for-coders/5298431)
  - Oct 1, Brandon Vigliarolo: "Cloudflare tries to outplay Jev with open-weight Clef models". It notes:
    - "Cloudflare self-reported its own scores against the benchmark, and they have yet to be reproduced for ranking on the official Decision Index"
    - Cloudflare's Michelle Chen confirmed the training datasets are not public (weights only)
    - Clef costs $0.24/M vs Jev's $0.042/M
    - Clef-flash needs 41 GB of VRAM and Clef 85 GB. — [The Register](https://www.theregister.com/ai-and-ml/2026/10/01/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models/5300649)
  - The VRAM figures conflict with community runs: Clef-flash Q4_K_M at about 6.8 GB, and a 16 GB GPU — [YouTube](https://www.youtube.com/watch?v=Fd11p4y_r6U), [YouTube](https://www.youtube.com/watch?v=3rGrd8btwQY). The Register's figures probably assume BF16 plus full context, which is my inference.
  - The story was syndicated by Slashdot and Techmeme. — [Slashdot](https://tech.slashdot.org/story/26/10/01/2110250/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models), [Techmeme via Bluesky](https://bsky.app/profile/techmeme.com/post/3mwudluqd622q)
- **Mainstream business press on Jev**:
  - TechCrunch (Sept 18): "A new kind of AI model from a ChatGPT inventor is thrilling developers" — [TechCrunch](https://techcrunch.com/2026/09/18/a-new-kind-of-ai-model-from-a-chatgpt-inventor-is-thrilling-developers/)
  - FT (Sept 25): "TypeSafe AI, a start-up recently valued at $200mn" — [FT via Bluesky](https://bsky.app/profile/financialtimes.com/post/3mwd4q3zqdo2f)
  - WSJ (about Oct 2), as quoted on Bluesky: "Already, the model is in use by some 25% of Fortune 500 companies". This is a company claim reported by WSJ that I did not verify. — [Bluesky quote](https://bsky.app/profile/jessefelder.com/post/3mww274da222n)
  - Forbes, via Techmeme: "Vercel, Cloudflare, and others quickly add Jev" — [Techmeme via Bluesky](https://bsky.app/profile/techmeme.com/post/3mvxkhc2fw424)
  - The New Stack (Sept 29): "OpenAI Answers TypeSafe's Jev with a Decision API Built on Luna" — [The New Stack](https://thenewstack.io/openai-decision-api-luna/)
- **Trade and tech outlets on Clef**:
  - MarkTechPost (Oct 1) — [MarkTechPost](https://www.marktechpost.com/2026/10/01/cloudflare-releases-clef-and-clef-flash/)
  - Dealroom: "Cloudflare launches Clef as TypeSafe's 'decision model' idea spreads across big tech" — [Dealroom](https://dealroom.co/news/158476-cloudflare-launches-clef-as-typesafes-decision-model-idea-spreads-across/)
  - InfoQ, on Jev — [InfoQ](https://www.infoq.com/news/2026/10/typesafe-ai-jev-released/)
  - Japanese and French outlets (gihyo.jp, goodtech.info) — [Bluesky gihyo](https://bsky.app/profile/gihyo.jp/post/3mwucfvcspj2h)
- **flaviocopes.com Clef deep dive (Oct 1, hands-on from Italy via REST)**:
  - Clef-flash "median between 191 and 205 ms, and its slowest call took 676 ms". Clef "median between 524 and 726 ms, with single calls up to 3 seconds".
  - "every image request I sent on October 1 took between 13 and 30 seconds, with both models". Original PNGs failed with "exceeded this model context window limit" until resized to 1,024 px JPEGs.
  - Cost: "For 100,000 tickets… $1.68 with Jev, $3.60 with Clef-flash and $9.60 with Clef." — [flaviocopes](https://flaviocopes.com/clef/)
- **Red Hat Developer (Oct 2)**, guardrail benchmark (prompt injection and content safety):
  - Jev 86.35% / 86.20% at about 350 ms median
  - Qwen3.6-35B as judge 89.31% / 85.47%
  - DeBERTa 89.01% at 54 ms; Granite Guardian 80.27% at 33 ms
  - Laya 85.44% / 57.87%
  - Conclusion: decision models "do not reliably outperform LLM-as-a-judge, pre-trained predictive" options "in speed or accuracy". — [Red Hat](https://developers.redhat.com/articles/2026/10/02/benchmarking-ai-decision-models-against-traditional-guardrails)

### Inferences
- Newsletter coverage lags Clef by at least a news cycle. The analysis pieces that exist (The Register, flaviocopes, Red Hat) all stress self-reported benchmarks, price and real-world latency rather than the edge story.
- Cloudflare's "38.8 ms" headline number is widely repeated in aggregator and TikTok coverage, while independent measurements are around 190–850 ms end-to-end. Explaining that gap is a clear content opportunity (my inference).

### Gaps
- Not found: my web searches surfaced no coverage of Jev or Clef by VentureBeat, SiliconANGLE, The Information or Interconnects (Nathan Lambert), and no Latent Space/AINews item on Clef. Paywalled pieces (The Information, WSJ, FT) could exist and be unindexed.
- I relied on WebFetch summaries for The Batch and The Register quotes. Wording is close to verbatim but should be spot-checked before publication.
- TLDR's coverage is evidenced only via its X post.

## 7. Synthesis: recurring themes, strongest critiques, hands-on findings, proposed use cases, and gaps (video opportunities)

### Takeaway
Outside X, the consensus is:
- Jev proved there is product-market fit for "zero-shot classifier as an API", but the technique has no moat.
- Clef is the most credible big-company entrant (open weights, vision, 64k context), yet it underwhelmed most people who tested it: slower than claimed, more expensive per token than Jev, and less accurate on text.
- Nobody has tested the thing Cloudflare is uniquely positioned to do: decisions in the request path at the edge.

### Cited Findings
**Recurring themes**
1. **"Old idea, great packaging."**
   - "low-hanging fruit… market the shit out of it" — [HN](https://news.ycombinator.com/item?id=49924635)
   - "it's just BERT with more data" — [HN](https://news.ycombinator.com/item?id=49765997)
   - "Jev isn't new tech" (864 upvotes) — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1woe70t/jev_isnt_new_tech_its_marketing_targets_people/)
   - The counterweight is zero-shot breadth plus the API: "define a new semantic decision at runtime in natural language" — [HN](https://news.ycombinator.com/item?id=49872751); "the entire point of Jev is the Zero-Shot Broad Knowledge" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wouby6/comment/pbq30c8/)
2. **No moat, and a clone explosion.**
   - "now 'Jev-like' models are everywhere, while Jev is nowhere" (347) — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvv6im/comment/pdf99al/)
   - The Decision Index lists about 70 open reproductions — [HN](https://news.ycombinator.com/item?id=49934879)
   - Big-company entrants within three weeks: OpenAI Decisions API on Luna — [The New Stack](https://thenewstack.io/openai-decision-api-luna/); Liquid D1 — [HN](https://news.ycombinator.com/item?id=49904832); AWS Strands Decider 2B — [Bluesky](https://bsky.app/profile/denyally.bsky.social/post/3mwtlarbwef2g); Perplexity Decider 27B — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvfz9n/perplexity_decider_27b_open_weights_decision/); Databricks `ai_decide()` — [LinkedIn](https://www.linkedin.com/posts/nick-karpov_the-jev-craze-is-awesome-i-love-how-fast-activity-7511881784188432384-_N3x); Ollama 0.35 — [LinkedIn](https://www.linkedin.com/posts/ollama_ollama-now-supports-jev-like-decision-models-activity-7510921078119202817-S19q); llama.cpp `/v1/systemone` — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvqbrz/llama_server_add_v1systemone_api_models_laya/)
3. **Marketing and astroturf backlash.**
   - r/LocalLLaMA mods thread (1,292) — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wo6o0f/mods_can_we_do_something_about_half_the_forum/)
   - A subreddit banned the terms — [Reddit](https://www.reddit.com/r/hermesagent/comments/1wufwfv/terms_jev_and_laya_are_banned/)
   - The "can't hallucinate" claim was disputed — [HN](https://news.ycombinator.com/item?id=49718492)
   - Game demos misled people about input modality — [HN](https://news.ycombinator.com/item?id=49907126)
   - Clef inherits some of this: "This literally is Jev spam." — [Reddit](https://www.reddit.com/r/codex/comments/1wv7lt7/clef_opensource_decision_model_by_cloudflare/)
4. **Calibration is the real claim, and it is contested.**
   - Die and coin tests showed overconfidence — [HN](https://news.ycombinator.com/item?id=49817305)
   - Platt scaling on your own data is still needed — [HN](https://news.ycombinator.com/item?id=49820330)
   - "Half a million API calls say not always" — [HN](https://news.ycombinator.com/item?id=49933643)
   - Counter: well calibrated on real NLP tasks — [HN](https://news.ycombinator.com/item?id=49937555)
   - For Clef, the only evidence is anecdotal: it "hedges more" — [Bluesky](https://bsky.app/profile/hailey.at/post/3mwuxmq67ls23); "better at hesitating when it's missing information" — [YouTube](https://www.youtube.com/watch?v=3rGrd8btwQY); a wrong answer at ~98.7% confidence — [YouTube](https://www.youtube.com/watch?v=T4irkjyJt8c)
5. **Open weights vs open source, and price.**
   - "Open weights, not open source" — [HN](https://news.ycombinator.com/item?id=49924502)
   - Datasets are not public — [The Register](https://www.theregister.com/ai-and-ml/2026/10/01/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models/5300649)
   - Clef is about 6x Jev's per-token price — [HN](https://news.ycombinator.com/item?id=49924252)
   - Nuance: Jev bills a fixed ~257 extra tokens per request — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wq2hfc/jev_vs_kev_opensource_jev_alternative_tested_side/); "free output" is "almost lying by omission" — [HN](https://news.ycombinator.com/item?id=49926617)

**Strongest critiques of Clef specifically**
- Self-reported, cherry-picked comparisons:
  - Scores "yet to be reproduced" on the official Decision Index — [The Register](https://www.theregister.com/ai-and-ml/2026/10/01/cloudflare-tries-to-outplay-jev-with-open-weight-clef-models/5300649)
  - "comparing with weak open jev models" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd8wbr1/)
  - Omits stronger 4B models such as decider-4B — [HN](https://news.ycombinator.com/item?id=49931441)
  - Median-only latency, with no input-length curve — [HN](https://news.ycombinator.com/item?id=49931473)
  - Clef-flash beats Clef on several benchmarks — [HN](https://news.ycombinator.com/item?id=49933900)
- Hosted latency far above the headline numbers:
  - about 850 ms p50 vs Jev about 110 ms — [HN](https://news.ycombinator.com/item?id=49928781)
  - 315–950 ms on the free tier — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/are_clef_and_clefflash_just_bad/)
  - 695–811 ms medians — [LinkedIn DecideBench](https://www.linkedin.com/posts/choyiny_ai-llm-machinelearning-activity-7511789673074073600-N7cr)
  - 191–726 ms medians, and 13–30 s for images — [flaviocopes](https://flaviocopes.com/clef/)
- Accuracy below Jev on text:
  - Hate speech — [HN](https://news.ycombinator.com/item?id=49929048)
  - Email categorization — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1ww3qw5/comment/pdhcn70/)
  - DecideBench: 94.8% vs 98.0% — [LinkedIn](https://www.linkedin.com/posts/choyiny_ai-llm-machinelearning-activity-7511789673074073600-N7cr)
  - hailey.at — [Bluesky](https://bsky.app/profile/hailey.at/post/3mwuxmnxyjk23)
  - Exceptions are ties: 87–86 / 88–89 on new cases — [YouTube](https://www.youtube.com/watch?v=3rGrd8btwQY); 24/24 for both — [YouTube](https://www.youtube.com/watch?v=jWQWp09voDU)
- Vision results are mixed:
  - Coin classification: 41% vs Gemma 53% — [HN](https://news.ycombinator.com/item?id=49933256)
  - Gestures, receipts and screenshots worked in demos — [YouTube](https://www.youtube.com/watch?v=Fd11p4y_r6U), [YouTube](https://www.youtube.com/watch?v=T4irkjyJt8c), [YouTube](https://www.youtube.com/watch?v=jWQWp09voDU)
- Blog overclaims: "no human in the loop" — [HN](https://news.ycombinator.com/item?id=49926220); "deterministic" — [HN](https://news.ycombinator.com/item?id=49927461)
- Size: 27B is "pretty heavy" for a decision model — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wv4zzi/comment/pd9amx4/)

**Notable positive hands-on findings for Clef**
- Runs locally:
  - Q4_K_M Clef-flash on an 8 GB laptop GPU — [YouTube](https://www.youtube.com/watch?v=Fd11p4y_r6U)
  - Clef-flash on a 16 GB GPU matched hosted outputs 239/240 — [YouTube](https://www.youtube.com/watch?v=3rGrd8btwQY)
  - BF16 on DGX Spark — [YouTube](https://www.youtube.com/watch?v=T4irkjyJt8c)
- "the most accurate open decision model" (just behind imajev-4b) on DecideBench — [LinkedIn](https://www.linkedin.com/posts/choyiny_ai-llm-machinelearning-activity-7511789673074073600-N7cr)
- 12/12 screenshot-to-action decisions on order screens — [YouTube](https://www.youtube.com/watch?v=jWQWp09voDU)
- Numeric threshold boundaries are handled correctly in text and in receipt images — [YouTube](https://www.youtube.com/watch?v=T4irkjyJt8c)

**Use cases people proposed or built (outside X)**
- Moderation and abuse:
  - Chat/username toxicity — [HN](https://news.ycombinator.com/item?id=49929048)
  - Signup spam and phishing — [HN](https://news.ycombinator.com/item?id=49929153)
  - "a billion reasons a day… spam and phishing" — [HN](https://news.ycombinator.com/item?id=49727065)
  - AI-slop filters for X/LinkedIn — [HN](https://news.ycombinator.com/item?id=49776507)
- Routing and triage:
  - Support tickets — [YouTube](https://www.youtube.com/watch?v=Wb6cfR41GBo)
  - LLM/model routers: "prompt -> decision model -> choose model/config" — [Reddit](https://www.reddit.com/r/LocalLLaMA/comments/1wvv6im/comment/pdf68ac/)
  - Skill selection — [LinkedIn](https://www.linkedin.com/posts/shafqat_when-i-read-the-jev-announcement-i-thought-activity-7508622773976449024-yl02)
- Agent guardrails:
  - Approving shell commands — [HN](https://news.ycombinator.com/item?id=49932279), [HN](https://news.ycombinator.com/item?id=49745284)
  - "hold vs ask a human" — [YouTube](https://www.youtube.com/watch?v=jWQWp09voDU)
  - Human review of agent writes — [HN](https://news.ycombinator.com/item?id=49928781)
- Browser and computer-use agents picking actions — [HN](https://news.ycombinator.com/item?id=49758669), [HN](https://news.ycombinator.com/item?id=49735979)
- Search and data:
  - Reranking — [Simon Willison](https://simonwillison.net/2026/Sep/21/jev/)
  - SQL row filtering (DuckDB, MotherDuck) — [Bluesky](https://bsky.app/profile/duckdb.org/post/3mwoex2mobk26), [HN](https://news.ycombinator.com/item?id=49800830)
  - Entity resolution (genealogy) — [HN](https://news.ycombinator.com/item?id=49723461)
- Enterprise domains:
  - eDiscovery — [LinkedIn](https://www.linkedin.com/posts/benjamindsexton_ediscovery-tar-decisionmodels-activity-7510316030544596992-nYLi)
  - Ad-tech compliance — [LinkedIn](https://www.linkedin.com/posts/sivajag_ad-tech-has-a-layer-that-still-runs-on-rules-activity-7509751092692480000-cTAC)
  - DLP — [LinkedIn](https://www.linkedin.com/posts/dtmirizzidamian_dt-mirizzi-jev-is-a-general-purpose-model-activity-7508575920220446720-qmMS)
  - Fraud — [LinkedIn](https://www.linkedin.com/posts/nirajkunwar_frauddetection-systemarchitecture-fintech-activity-7510637494493749248-0l65)
  - Intent-while-typing — [LinkedIn](https://www.linkedin.com/posts/ketankarkhanis_super-excited-about-what-the-team-is-shipping-activity-7511871715610648576-0aI-)
  - Radiology ordering (educational) — [LinkedIn](https://www.linkedin.com/posts/abdullahnorain_ive-been-experimenting-with-jev-from-typesafe-activity-7510495164499513344-tMI4)
- Cloudflare- and edge-specific ideas:
  - WAF rules choosing challenge or block — [HN](https://news.ycombinator.com/item?id=49924396)
  - Fast categorization of uncategorized sites in Zero Trust — [HN](https://news.ycombinator.com/item?id=49929567)
  - Host decision models at edge PoPs for browser-side latency — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1wmjsj2/typesafes_jev_the_decisiononly_model_is_on/)
  - Triaging issues inside a Worker — [Reddit](https://www.reddit.com/r/CloudFlare/comments/1wmjsj2/comment/pb7vtet/)
  - Cloudflare's own blog lists domain classification (Threat Intel, with Browser Run), Trust & Safety, support triage, and good-bot/bad-bot decisions — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
  - A decision-model cache project (cachev.dev) — [HN](https://news.ycombinator.com/item?id=49921925)

### Inferences
Gaps nobody has covered yet, i.e. video opportunities, with emphasis on CDN and edge. These are my own inferences from what I did not find.
1. **"Where does the 38.8 ms go?"** Measure Clef-flash from inside a Worker (`env.AI.run`) against REST from several regions, against hosted Jev (also on Workers AI as `typesafe/jev`), and against a local 16 GB GPU. Separate model time from network and queueing, and show p95 and the input-length curve that critics say Cloudflare omitted. Nobody has published an in-Worker or per-PoP measurement.
2. **Clef in the request path.** Build a Worker that classifies each incoming request (bot vs human intent, abusive form submissions, scraper vs agent) and chooses allow, challenge or block. This tests the WAF idea from HN and Cloudflare's own "good bot vs bad bot" example. Nobody has demoed decision models as an edge security primitive.
3. **Replicate Cloudflare's domain-categorization example** (Browser Run + Clef, "95% fashion / 85% ecommerce / <1% phishing", 2.2 s) on real uncategorized and phishing domains. This ties to the Zero Trust "uncategorized website" pain point. Not replicated anywhere.
4. **Cost at CDN scale.** Per-request decisioning on millions of requests a day: Clef $0.24/M or flash $0.09/M vs Jev $0.042/M plus its ~257-token overhead vs self-hosting, plus caching repeated decisions. Only back-of-envelope comments exist.
5. **Launch-day issues as a follow-up.** Re-test the free-tier "2,194-token truncation" and the 13–30 s image latency now that launch traffic has passed.
6. **Calibration face-off with reliability diagrams** for Clef, Clef-flash and Jev. Clef's Brier-loss and RLCD claims are publicly untested, and the Jev calibration debate shows the audience cares.
7. **Quantization curve** for Clef 27B and flash (Q8 → Q4) using the official joint schema head rather than constrained JSON. llama.cpp Clef support (PR #29831) is still pending, and the "how bad under Q8?" question is open.
8. **RL fine-tuning platform.** It is FDE-led at launch and nobody has shown it. A "fine-tune Clef on your own labelled decisions" walkthrough would be first.
9. **Multimodal edge moderation** (image or screenshot checks at upload time). The demos so far are toy-scale, and image latency on launch day made this impractical. Nobody has benchmarked it.
10. **Creator whitespace.** Clef's YouTube total is under 10k views against millions for Jev. A credible "Clef vs Jev, tested properly, at the edge" video would face little competition.

### Gaps
- Several hands-on results come from single users or small samples (n = 24 to 400), and launch-day load may have skewed hosted latency. They indicate rather than prove.
- I could not verify Cloudflare's Jev Decision Index scores against the live leaderboard, and no third party has posted an official reproduction.
- Commentary from CDN, edge and security professionals is essentially absent on every platform I checked. That absence is itself the clearest content gap.
