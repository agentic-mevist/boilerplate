# Agent-layer / AI-editor video tools: what they actually provide vs. plain Claude Code

Method note: video-use, OpenMontage, OpenChatCut and the ChatCut agent-plugin repos were shallow-cloned on 2026-11-07 and the source read directly (line counts via `wc -l`). Repo stats (stars, license, dates) come from the GitHub search API that day. Everything else comes from web pages, cited inline. Anything labelled "inferred" is my own judgement, not a sourced fact.

Plain-language frame used throughout:
- **Rendering/composition frameworks** (Remotion, HyperFrames, Manim, Motion Canvas) are the **paint and brushes**. They turn code into pixels.
- **Agent-layer kits** (video-use, OpenMontage, ButterCut) are a **recipe book and a toolbox handed to a general AI agent** (Claude Code, Codex). They are mostly prompts (SKILL.md files) plus small scripts that wrap ffmpeg, transcription and generation APIs. They have no UI and no engine of their own.
- **AI editor products** (ChatCut, Kino, Diffusion Studio, OpenChatCut, Descript Underlord, Captions) are the **whole kitchen**: a real timeline editor app, storage, rendering, billing, model access, and an agent wired into all of it. Increasingly they also expose themselves to outside agents over MCP.

---

## 1. browser-use/video-use: what it actually contributes

### Takeaway
video-use is a Claude Code / Codex **skill**: about 340 lines of prompt rules (SKILL.md) plus about 2,100 lines of Python helpers wrapping ffmpeg, PIL, librosa and one ElevenLabs Scribe API call. Its value is a well-tuned *recipe*. It has no proprietary algorithm or model. The useful ideas are (a) a compact phrase-level transcript format as the LLM's main "view" of the footage, (b) an on-demand filmstrip + waveform PNG for visual checks, (c) a set of hard-won ffmpeg correctness rules (30 ms fades, subtitles last, per-segment extract then lossless concat), and (d) a confirm, then render, then self-check loop. Plain Claude Code could rebuild a rough version in an afternoon, but the tuned rules are what save you days of debugging.

### Cited Findings
**Identity and traction**
- Repo `browser-use/video-use`, "Edit videos with coding agents". **30,674 stars, 3,557 forks**, created 2026-04-12, last push 2026-10-08, **MIT license** ("Copyright (c) 2026 Browser Use"). — [GitHub](https://github.com/browser-use/video-use)
- The README pitch: "Drop raw footage in a folder, chat with Claude Code, get `final.mp4` back." Business model hint: "Cloud-hosted video-use is coming. Join the waitlist at video-use.com". It also points to "Browser Use Box" for always-on editing from a VPS or Telegram. — [README](https://github.com/browser-use/video-use)
- It is also distributed through `browser-use/plugins` ("Browser Use plugins for coding agents (browser-harness, video-use)"), 29 stars. — [GitHub](https://github.com/browser-use/plugins)

**What's in the repo (verified from the clone)**
- Python helpers: `render.py` (801 lines), `timeline_view.py` (392), `grade.py` (375), `transcribe.py` (241), `pack_transcripts.py` (206), `transcribe_batch.py` (126). That is about **2,141 lines of Python**, plus about 310 lines of tests. Prompt files: `SKILL.md` (342 lines, ~25 KB) and `install.md` (162). It also vendors a third-party-style `skills/manim-video/` with roughly 2,900 lines of Manim reference markdown. Python dependencies: `requests, librosa, matplotlib, pillow, numpy` (optional `manim`). — [pyproject.toml / repo](https://github.com/browser-use/video-use)
- **External API:** `transcribe.py` POSTs to `https://api.elevenlabs.io/v1/speech-to-text` with `model_id: "scribe_v1"` and `diarize: "true"`, and asks for word-level timestamps and audio events. `ELEVENLABS_API_KEY` is required. The SKILL.md anti-patterns explicitly reject local Whisper: "Running Whisper locally on CPU. Slow and it normalizes fillers. Use hosted Scribe." Also: "Whisper SRT / phrase-level output. Loses sub-second gap data." — [transcribe.py / SKILL.md](https://github.com/browser-use/video-use)

**The concrete ideas (code vs. prompt)**
- **Transcript compression, done in code** (`pack_transcripts.py`): it groups Scribe word entries into phrases, starting a new phrase on any silence ≥ 0.5 s (configurable) or on a speaker change. Each line looks like `[002.52-005.36] S0 text`, grouped per take under `## C0103 (duration: 43.0s, 8 phrases)`. The docstring claims it "fits one hour of takes in a tenth the tokens of raw Scribe JSON". The README claims all takes pack into "a single ~12KB `takes_packed.md`". — [pack_transcripts.py / README](https://github.com/browser-use/video-use)
- **Visual composite, done in code** (`timeline_view.py`): it pulls N evenly spaced frames with ffmpeg into a horizontal filmstrip, then draws a waveform ribbon (audio envelope via ffmpeg/numpy) with transcript word labels on top and shades silence gaps (≥ 0.4 s threshold in `find_silences`). The docstring says to use it "at decision points… Do NOT call it in a scan loop". README framing: "Naive approach: 30,000 frames × 1,500 tokens = 45M tokens of noise. Video Use: 12KB text + a handful of PNGs… Same idea as browser-use giving an LLM a structured DOM instead of a screenshot." — [timeline_view.py / README](https://github.com/browser-use/video-use)
- **Rendering, done in code** (`render.py`): per-segment extract, then lossless `-c copy` concat, then overlays shifted with `setpts=PTS-STARTPTS+T/TB`, then subtitles applied last. Also two-pass loudnorm, HDR/portrait/fps detection, and a 2-word UPPERCASE subtitle chunker (`chunk_words`, `SUB_FORCE_STYLE` = Helvetica 18 Bold, Outline=2, MarginV=35). — [render.py / SKILL.md](https://github.com/browser-use/video-use)
- **Color grading, done in code** (`grade.py`): presets (`subtle`, `neutral_punch`, `warm_cinematic`, with `warm_cinematic` = eq contrast 1.12 / sat 0.88 + colorbalance teal/orange). There is also an "auto" mode that samples frame luma and saturation stats and emits a correction "bounded to ±8% on any axis" with "NO color shift" (gamma lift if dark, small contrast boost if flat). SKILL.md tells the LLM to reason with an ASC CDL mental model (`out = (in*slope+offset)**power`). — [grade.py / SKILL.md](https://github.com/browser-use/video-use)
- **"12 Hard Rules", prompt only** (SKILL.md), for example: subtitles LAST; per-segment extract then lossless concat; **30 ms audio fades at every segment boundary** (`afade=t=in:st=0:d=0.03,afade=t=out:st={dur-0.03}:d=0.03`); overlay PTS shift; SRT output-timeline offset formula `output_time = word.start - segment_start + segment_offset`; never cut inside a word; pad cut edges 30–200 ms because "Scribe timestamps drift 50–100ms"; word-level verbatim ASR only; cache transcripts; **parallel sub-agents for multiple animations**; strategy confirmation before execution; all outputs in `<videos_dir>/edit/`. — [SKILL.md](https://github.com/browser-use/video-use)
- **Editing heuristics, prompt only**: silences ≥ 400 ms are the cleanest cuts, 150–400 ms "usable with a visual check", < 150 ms "unsafe". Speaker handoffs 400–600 ms. Example padding of 50 ms before and 80 ms after. Extend past laughs and punchlines. An "editor sub-agent brief" template with structural archetypes (launch: HOOK→PROBLEM→SOLUTION→BENEFIT→EXAMPLE→CTA; tutorial; interview; documentary…). It outputs an EDL as a JSON array `{source,start,end,beat,quote,reason}`. — [SKILL.md](https://github.com/browser-use/video-use)
- **Self-verification, mostly prompt, using code tools**: run `timeline_view` on the *rendered output* at every cut boundary (±1.5 s). Check for visual jumps, waveform spikes (pops), subtitles hidden by overlays, and misaligned overlays. Measure loudness with `ebur128` ("You cannot listen: say so, and report the numbers"). For publishable work, spawn a **critic sub-agent** briefed "to roast, not to praise". Cap at 3 self-eval passes. — [SKILL.md](https://github.com/browser-use/video-use)
- **Memory**: append one section per session to `<edit>/project.md` (Strategy/Decisions/Reasoning log/Outstanding). This is prompt only. — [SKILL.md](https://github.com/browser-use/video-use)
- **Explicit design philosophy against heuristics**: the anti-patterns list includes "Hand-tuned moment-scoring functions. The LLM picks better than any heuristic you'll write" and "Hierarchical pre-computed codec formats… Over-engineering." — [SKILL.md](https://github.com/browser-use/video-use)
- **Animations**: these are delegated to HyperFrames, Remotion, Manim, or PIL+ffmpeg, one parallel sub-agent per "slot". A 10-point sub-agent brief template ends with "Do not ask questions… pick the most obvious interpretation and proceed." — [SKILL.md](https://github.com/browser-use/video-use)
- Third-party write-up describing it as combining "specialized transcription APIs, deterministic FFmpeg pipelines, and AI coding agents". — [CoderLegion, Sep 2026](https://coderlegion.com/28224/video-use-how-browser-use-created-an-ai-agent-video-editor)

### Inferences
- About 80% of the "intelligence" is in the prompt (SKILL.md). The code is thin, deterministic plumbing. The two pieces of code that matter conceptually are `pack_transcripts.py` (an LLM-friendly representation of the footage) and `timeline_view.py` (cheap visual grounding). Both are under 400 lines and easy to replicate.
- The real moat is *empirical tuning* (30 ms fades, 30–200 ms padding, the 50–100 ms Scribe-drift warning, the subtitles-last rule). These look like lessons from shipping actual launch videos. A fresh Claude Code session would probably hit several of these bugs (pops, hidden captions, double re-encodes) before finding the fixes.
- Business model (inferred): open-source top of funnel for Browser Use's hosted products (video-use cloud waitlist, Browser Use Box).
- Hard dependency on a paid ASR (ElevenLabs Scribe), with no local fallback in the code.

### Gaps
- No public evals or benchmarks of edit quality exist. The quality claims are anecdotal (launch videos).
- I did not find a Hacker News launch thread for video-use, so community reception beyond the star count is unverified.

---

## 2. OpenMontage (calesthio): who makes it, what's in it

### Takeaway
OpenMontage is a very large **AGPL-3.0 "agent-first" production kit**. Its own README says "There is no code orchestrator. Your AI coding assistant IS the orchestrator." It is a library of YAML pipeline manifests, hundreds of markdown "director" skills, and about 100+ Python tool wrappers around 60+ generation and stock providers. Rendering goes through a bundled Remotion project or HyperFrames. It does contain some genuine code-level heuristics: a weighted 7-dimension provider scorer, a "slideshow risk" scorer, a CLIP-indexed stock-footage corpus, a cost tracker, and a local live "Backlot" storyboard web UI. It is much broader than video-use (generation-first: explainers, trailers, avatars, docs) and much less focused on cutting your own footage.

### Cited Findings
**Identity and traction**
- `calesthio/OpenMontage`: "World's first open-source, agentic video production system. 12 production pipelines, 100+ tools, 700+ agent skill and production-knowledge files. Turn your AI coding assistant into a full video production studio." **77,936 stars, 10,379 forks**, created 2026-03-29, pushed 2026-11-03, **AGPL-3.0**, primary language Python. — [GitHub](https://github.com/calesthio/OpenMontage)
- Maker: GitHub user "calesthio" / "Calesthio AI Labs" (X: @calesthioailabs, site openmontage.video). The README says it is "built nights and weekends" and asks for GitHub Sponsors. It also teases "We're building something new for creatives… join the early users" (Discussion #892). — [README](https://github.com/calesthio/OpenMontage); [YouTube tutorial naming "Calesthio AI Labs"](https://www.youtube.com/watch?v=wotXcT60oQI)
- Scope has grown quickly. June 2026 third-party guides described "12 pipelines, 52 tools, 500+ skills". The current README says "100+ tools… 700+ agent skill and production-knowledge files" and "60+ provider integrations". The README also says "10+ production pipelines" in one place and "12" in another. The repo has 13 YAML pipeline files, including a `framework-smoke` test pipeline. — [tosea.ai Jun 2026](https://tosea.ai/blog/openmontage-agentic-video-production-guide); [pinggy Jun 2026](https://pinggy.io/blog/openmontage_agentic_video_production/); [README](https://github.com/calesthio/OpenMontage)

**Architecture (README + source)**
- Flow: "Agent reads pipeline manifest (YAML) → reads stage director skill (Markdown) → calls Python tools → scored provider selection". All pipelines follow `research → proposal → script → scene_plan → assets → edit → compose`, with human checkpoints. — [README](https://github.com/calesthio/OpenMontage)
- Pipelines (`pipeline_defs/*.yaml`): animated-explainer, animation, avatar-spokesperson, character-animation, cinematic, clip-factory, documentary-montage, hybrid, localization-dub, podcast-repurpose, screen-demo, talking-head. Example `talking-head.yaml`: 8 required director skills (executive-producer, idea, script, scene, asset, edit, compose, publish) + reviewer + checkpoint-protocol; `budget_default_usd: 0.50`, `max_revisions_per_stage: 3`. Each stage declares `produces`, `review_focus`, and `success_criteria`. — [repo](https://github.com/calesthio/OpenMontage)
- Size (verified from the clone): about **152K lines of Python** (tools + tests + lib), about **219K lines of Markdown/YAML** (skills, docs, manifests), and about 14.5K lines of TS/JS (`remotion-composer`, `ink-theater`, `backlot` UI). Largest tool files: `tools/video/video_compose.py` (2,954 lines), `seedance_ark.py` (1,473), `hyperframes_compose.py` (1,436). — [repo](https://github.com/calesthio/OpenMontage)
- A large share of the skill corpus is **vendored third-party skill packs**, duplicated under `.claude/skills/` and `.agents/skills/`: remotion-best-practices, hyperframes-*, heygen, manimgl/manimce best practices, vercel-react-best-practices, flux-best-practices. — [repo tree](https://github.com/calesthio/OpenMontage)
- Tools cover analysis (scene_detect, transcriber, face_tracker, frame_sampler, visual_qa, video_understand, several cloud STT providers), audio (about 30 TTS/music providers: ElevenLabs, Google, OpenAI, Suno, Piper local…), video generation (fal/Veo/Kling/Seedance/Runway/HeyGen/local WAN/Hunyuan/LTX via ComfyUI), stock (Pexels, Pixabay, Archive.org, NASA, Wikimedia), subtitles, and publishers. API keys are optional; "more keys = more tools". — [README / tools/](https://github.com/calesthio/OpenMontage)

**Concrete algorithms/heuristics found in code**
- **Provider scoring** (`lib/scoring.py`): `weighted_score = task_fit*0.30 + output_quality*0.20 + control*0.15 + reliability*0.15 + cost_efficiency*0.10 + latency*0.05 + continuity*0.05`, with hand-coded penalties (for example `task_fit *= 0.2` "Heavy penalty", `*= 0.55`, `+0.18` boosts). — [lib/scoring.py](https://github.com/calesthio/OpenMontage)
- **Slideshow risk scorer** (`lib/slideshow_risk.py`): rates a scene plan 0–5 on repetition, decorative_visuals, weak_motion, weak_shot_intent, typography_overreliance, and unsupported_cinematic_claims. Verdict: <2 strong, <3 acceptable, <4 revise, ≥4 "fail — should not proceed to compose". — [lib/slideshow_risk.py](https://github.com/calesthio/OpenMontage)
- **CLIP corpus** (`lib/clip_embedder.py`, `lib/corpus.py`): a lazily loaded CLIP ViT-B/32 (~350 MB, CPU by default) embeds free stock/archival footage so the documentary-montage pipeline can retrieve real motion clips semantically. — [repo](https://github.com/calesthio/OpenMontage); [README "CLIP-searchable corpus"](https://github.com/calesthio/OpenMontage)
- Other lib modules: `delivery_promise.py`, `variation_checker.py`, `verify_scene_pacing.py`, `source_media_review.py`, `cost_tracker.py`/`provider_pricing.py` (budget caps and per-action approval thresholds). — [repo](https://github.com/calesthio/OpenMontage)
- **Backlot**: a local web "living storyboard" (`python -m backlot open`) built from project files. It shows stages, the script, scene cards, per-asset cost and quality scores, and approval gates, and it can replay a run. — [README](https://github.com/calesthio/OpenMontage)
- Rendering: OpenMontage "picks between Remotion and HyperFrames at proposal time (locked as `render_runtime`)". FFmpeg handles post. — [README](https://github.com/calesthio/OpenMontage)
- Showcase cost claims: "THE LAST BANANA" 60 s animated short, "Total cost: $1.33" (Kling v3 via fal.ai, Google Chirp3-HD narration, Remotion). Another piece "about $4". — [README](https://github.com/calesthio/OpenMontage)

### Inferences
- In plain terms, OpenMontage is a **giant playbook plus API adapters** for Claude Code. Its "agents" are just Claude Code reading markdown, and its "pipelines" are YAML checklists. It is not a renderer or an editor. Its renderer is Remotion or HyperFrames, and its value is breadth (provider adapters, budget tracking, stock retrieval) and process scaffolding.
- Unlike video-use (which says "don't write heuristics, let the LLM decide"), OpenMontage encodes a lot of hand-tuned scoring. Whether those weights help is not evaluated anywhere I could find. They look hand-picked, not learned.
- The 78K stars probably reflect viral "first open-source agentic video studio" positioning more than production usage (inferred). Third-party coverage is mostly SEO tutorials. The AGPL license plus a teased new product suggests possible future commercialization.
- AGPL matters for anyone building a hosted product on top of it (network-use clause), as does Remotion's separate commercial license (see §4).

### Gaps
- Could not get the maker's real identity or company registration. The GitHub `/users` endpoint was blocked in this session, and no press coverage was found.
- No independent quality evaluation of OpenMontage outputs was found.

---

## 3. ChatCut (and OpenChatCut), plus other "Cursor for video" products

### Takeaway
ChatCut is **not "just an interface"**, but its moat is product rather than models. It is a closed-source, real multi-track timeline editor (web + Mac/Windows desktop) with a built-in agent, cloud and local rendering, NLE exports (Premiere/Resolve XML, CapCut/Jianying drafts), and a credits system. Credits resell third-party generation models (Seedance, Kling, MiniMax, GPT Image, Nano Banana, ElevenLabs voices). Its GitHub repo is only an **agent plugin**: markdown skills plus a pointer to a hosted MCP server (`api.chatcut.io`). OpenChatCut is an unrelated open-source clone (AGPL, about 294K lines of TS, Electron + React + Remotion) that shows how much engineering a "real timeline + agent" product takes.

### Cited Findings
**ChatCut (company/product)**
- Founded by filmmakers/producers **Kaiwen Li and Alima Strickland**. Raised a **US$1.35M seed led by ZhenFund, with Antler**, announced Oct 22, 2025. — [e27](https://e27.co/chatcut-raises-us1-35m-to-make-video-editing-as-easy-as-texting-20251022/); [Antler blog Jun 2025](https://www.antler.co/blog/why-we-invested-in-chatcut-professional-filmmakers-reimagining-the-future-of-video-editing); [LinkedIn (Antler partner)](https://www.linkedin.com/posts/jsalovaara_proud-to-see-chatcut-close-their-135m-seed-activity-7386966172241616896-flEa)
- Tracxn lists ChatCut as a seed-stage company in Austin, founded 2024, total funding $1.35M from ZhenFund. — [Tracxn](https://tracxn.com/d/companies/chatcut/__ylhwJJAd-NAvpVHnoLxN6PiEWrwpPV6oYyfNr2ZoLgQ)
- Self-description: "ChatCut is an AI video editor made by ChatCut Inc. You describe an edit in plain language, an AI agent changes a real multi-track timeline, and you can keep editing that timeline by hand." Company is registered in Texas. Available as the web app (app.chatcut.io), Desktop (macOS 13+/Windows 10+, no Linux, not fully offline), and the Agent Plugin. — [ChatCut Product Facts, verified Nov 1 2026](https://chatcut.io/docs/product-facts)
- Homepage claims use "by 400,000+ creators" (self-reported, unverified). — [chatcut.io](https://chatcut.io/)
- **Pricing**: Free plan (core editor, uploads, transcription, captions, standard exports, up to 60 min cumulative cloud/web export). Paid: $25/mo for 100 credits; $48/200; $92/400; $180/800; $270/1,200; $450/2,000 (annual $252–$4,212). **1 credit = $0.25 face value.** "Generation charges are based on the provider's cost for the selected model." Agent messages "are charged by model usage". Upload, manual editing, transcription and export are free. When Claude Code or Codex drives ChatCut, "the agent's own reasoning uses that agent's subscription"; ChatCut credits pay only for hosted generation. — [Product Facts](https://chatcut.io/docs/product-facts)
- **Models offered** (all third-party): video: Seedance 2.5/2.0/Fast/mini, Gemini Omni, MiniMax H3/H3 Max, Kling 3.0/4.0. Images: GPT Image 2.5 Flare/Sunburst, GPT Image 2, Nano Banana. Voice includes ElevenLabs voices. Example rates: Seedance 2.5 0.49 credits/s at 480p; motion graphics 0.2 credits each; AI music 0.22/track. — [Product Facts](https://chatcut.io/docs/product-facts)
- Rendering: Desktop renders locally (4K). The web app renders in-browser (4K if the browser can encode it) or in the cloud (max 1080p). Exports: Premiere/DaVinci XML (no FCPXML) and editable CapCut/Jianying drafts (Desktop). — [Product Facts](https://chatcut.io/docs/product-facts)
- **Agent plugin repo** `ChatCut-Inc/agent-plugin`: 1,015 stars, Apache-2.0, created 2026-06-25. It ships per-host packages (claude, codex, cursor, gemini, grok, kimi, qwen, doubao, workbuddy, antigravity). Verified contents: about **41K lines of markdown skills** (talking-head-guide, create-motion-graphics, video-gen with a Seedance 2 reference, voice/fix-spoken-mistakes, verification, known-errors, export, digital-human…) and about 11K lines of JS (for example `upload-media.mjs`). The MCP config is just `{"type":"http","url":"https://api.chatcut.io/api/external-mcp/mcp"}`. The editor and timeline engine are not in the repo. — [GitHub](https://github.com/ChatCut-Inc/agent-plugin)
- README feature list includes multicam sync, beat-synced cuts and scene-cut detection (Desktop), "Short crossfades that smooth the audio at every cut", "checks that each edit is visible in the editor", viral-video remake, and batches of up to 50 generation jobs. — [agent-plugin README](https://github.com/ChatCut-Inc/agent-plugin)
- A community ecosystem builds on ChatCut, for example `Endless1936/cut-motion` (286 stars, "ChatCut, HyperFrames captions, GSAP motion graphics") and `Fangx-AI/cut-director` (183 stars). — [GitHub search](https://github.com/Endless1936/cut-motion); [GitHub](https://github.com/Fangx-AI/cut-director)

**OpenChatCut (separate, unaffiliated project)**
- `0xsline/OpenChatCut`: "Open-source, local-first conversational AI video editor with a professional multi-track timeline, Agent Skills, MCP integration, and Remotion rendering". 2,968 stars, AGPL-3.0, created 2026-07-15. It has a Product Hunt listing. It is sponsored by OfoxAI, with Ko-fi/Afdian donations and a paid "OpenChatCut Pro" desktop edition. — [GitHub](https://github.com/0xsline/OpenChatCut); [Product Hunt](https://www.producthunt.com/products/openchatcut)
- Verified stack (package.json/src): Electron 43 + React 19 + TypeScript. `@remotion/player`, `@remotion/renderer`, `@remotion/web-renderer`, `@remotion/media`. `ffmpeg-static`. Local `whisper-cli` and MediaPipe sync scripts. Vercel AI SDK providers (anthropic, openai, google, deepseek, groq, mistral, moonshot, xai, alibaba, elevenlabs, deepgram, cartesia). `src/` modules: agent, captions, color, editor, export, multicam, reframe, scene-detection, tracking, transcript, gl… About **294K lines of TS/TSX**. — [repo](https://github.com/0xsline/OpenChatCut)
- Another open clone: `pireel/pireel`, "The open-source alternative to Capcut、ChatCut. Drivable by any AI agent over MCP". 1,357 stars, AGPL-3.0. — [GitHub](https://github.com/pireel/pireel)

**Other "Cursor for video" / agent-editor products (brief)**
- **Kino AI (YC S23)**: Launch HN in early Nov 2026 (111 points). It is a "web-native video editor" where "your colleagues and Codex / Claude Code can work on the same timeline". The founder writes: "Kino is code-first. All editing, all motion graphics, all dragging of timeline items… are expressed as code, built on Remotion… we found ourselves building a WYSIWYG editor for React". Real-time multiplayer with cursors; "5+ agents editing the timeline concurrently". All footage is "transcribed, embedded, described, and face-detected". Low-res proxies are uploaded. **Custom decoders for ProRes, BRAW, R3D**; "None of the performance… would have been possible before WebCodecs and libraries like Mediabunny". Every project, clip, comment, and frame has a URL. It previously ran on-prem deployments for *Survivor* and A24's *Beef*. The full editor is free; Pro is $25/editor/month (unlimited MCP tool calls, share links, YouTube search). The founder also notes "Opus 5.5 can edit videos and make great motion graphics now. But with a raw agent harness, you need to describe tiny edits either in words or in quick one-off UIs… feedback from teammates comes as screenshots on Slack." — [Launch HN](https://news.ycombinator.com/item?id=50368804); [kino.ai](https://kino.ai/)
- **Diffusion Studio**: `diffusionstudio/editor`, "The VS Code of video editing, built for agents". 3,483 stars, **MPL-2.0**, TypeScript, created 2026-07-07. Desktop for macOS/Windows. "Edit videos with Claude Code, Codex, or Cursor… turn your edits into reusable skills". Every edit is JSX/TS code that agents can read, diff, and re-run. — [diffusion.studio](https://diffusion.studio/); [GitHub search API](https://github.com/diffusionstudio/editor); [explainx Aug 2026](https://explainx.ai/blog/diffusion-studio-open-source-video-editor-as-code-august-2026)
- **ButterCut** (barefootford): "Make Claude your assistant video editor". It teaches Claude to build selects, scenes, and rough cuts and exports to **Final Cut, Premiere, or Resolve**. `barefootford/buttercut` is Ruby, 617 stars, created 2025-11-10. Don't confuse it with buttercut.ai, an unrelated Indian-language subtitle app. — [buttercut.io](https://buttercut.io/); [GitHub](https://github.com/barefootford/buttercut); [buttercut.ai](https://www.buttercut.ai/)
- **Descript Underlord**: Descript's "agentic co-editor" that executes plain-English instructions (filler removal, rough cuts, clips, audio fixes) inside Descript's existing transcript-based editor. One review dates its agent beta to around late 2025. — [descript.com/underlord](https://www.descript.com/underlord); [TabsWire review](https://tabswire.com/descript-review/)
- **Captions / Mirage**: raised **$75M growth financing from General Catalyst's Customer Value Fund** (Mar 24, 2026) "to continue building models for its AI video-editing app" and advance "agentic video editing". They own proprietary models. — [TechCrunch](https://techcrunch.com/2026/03/24/mirage-raises-75m-to-continue-building-models-for-its-ai-video-editing-app-captions/); [Captions blog](https://captions.ai/blog/announcing-mirages-usd75m-growth-financing-with-general-catalyst)
- **Opus Clip ClipAnything**: "first-ever multimodal AI video clipping" that finds moments "using visual, audio, and sentiment cues" from a prompt. It is a proprietary clipping model and pipeline. — [opus.pro](https://www.opus.pro/clipanything)
- **Eddie AI**: "AI video editor trusted by 60000+ video professionals" (self-reported). Chat with interviews; credit-based (runs "between about 80 and 380 credits"). Tracxn lists it as unfunded. A Reddit thread complains about about $200/month pricing. — [heyeddie.ai](https://www.heyeddie.ai/); [credits help](https://www.heyeddie.ai/help/how-credits-work); [Tracxn](https://tracxn.com/d/companies/eddie-ai/__Z2zXQYJgtIg5Z0FySsfoMUtBIxDsiA3GXACif2B-7-g); [Reddit](https://www.reddit.com/r/Filmmakers/comments/1pimdwg/yikes_ai_editing_software_wants_200month/)
- **Gling**: browser-based editor for YouTubers that auto-removes bad takes, silences, and filler words. It is the pre-agent "point solution" baseline. — [gling.ai](https://www.gling.ai/)
- **Selects (by Cutback)**: an AI rough-cut and assistant editor that auto-syncs multicam, removes dead air, and preps rough cuts for Premiere/DaVinci/Final Cut. A separate site, tryselects.com, brands Selects as "the AI video editor you talk to". — [Cutback](https://cutback.video/blog/cutback-selects-ai-rough-cut-tool-for-video-editors-using-davinci-premiere-pro-final-cut); [tryselects.com](https://tryselects.com/)
- **Vyra (YC F2026)**: "Personal video editing agent for shortform content", 2 employees, San Francisco. — [YC](https://www.ycombinator.com/companies/vyra)
- Show HN "FableCut – A browser video editor AI agents can drive (zero deps)". A commenter notes that "being able to directly edit JSON project files is a solid optimization" over computer-use driving a conventional editor. — [HN](https://news.ycombinator.com/item?id=48845422)

### Inferences
- **What each owns:**
  - ChatCut owns the timeline editor UI and engine, rendering infra, NLE export, a skill library, and model reselling with margin. No proprietary models are disclosed.
  - Kino owns a collaborative code-first editor, pro-codec WebCodecs decoders, media asset management, and indexing (embeddings, face detection).
  - Diffusion Studio owns an open code-as-timeline editor.
  - Descript owns an existing editor plus a huge user base.
  - Captions/Mirage and Opus Clip own proprietary models and data.
  - Gling and Selects own narrow, polished workflows.
- **Is ChatCut "just an interface"?** On the AI side, mostly yes: its intelligence is an LLM agent plus skill prompts plus third-party generation APIs. But the interface itself (a real multi-track timeline that both humans and agents edit, frame-accurate preview, in-browser/desktop/cloud render, XML/CapCut export, multi-host plugins) is the hard, defensible engineering. OpenChatCut's ~294K lines are a rough proxy for that effort.
- **Strategic convergence**: by late 2026 the editors (ChatCut, Kino, Diffusion Studio, OpenChatCut, pireel) all expose MCP so outside agents (Claude Code/Codex) can drive them, and they charge for storage, collaboration, generation credits, or MCP calls. The LLM is becoming a commodity that the user often brings and pays for themselves (ChatCut says this explicitly).

### Gaps
- **Which LLM powers ChatCut's built-in agent is not disclosed** in the docs I found. They only say "charged by model usage".
- ChatCut's revenue and user numbers are self-reported ("400,000+ creators"). No independent figures.
- The e27 article was paywalled or blocked by Cloudflare. Funding details rely on the headline, snippet, Antler, and LinkedIn posts.
- Descript Underlord internals and models are not documented publicly. The Captions/Mirage model architecture is not covered here.
- Kino's funding beyond YC S23 was not found.

---

## 4. Rendering/composition frameworks: the "how pixels get made" layer (brief)

### Takeaway
Remotion, HyperFrames, Manim, and Motion Canvas are **libraries that render code into video frames**. They are not editors or agents. The agent-layer kits (video-use, OpenMontage) and editors (Kino, OpenChatCut) sit on top of them. So the user's intuition is correct: these are a different category, one layer down.

### Cited Findings
- **Remotion**: "Make videos programmatically with React". 71,388 stars, repo since 2020. GitHub license field reads "NOASSERTION": it is not an OSI license, and Remotion's license page covers "Free license eligibility, company and enterprise pricing". Products include Player, Lambda (cloud render), Editor Starter, Timeline, and Mediabunny/WebCodecs tooling. — [GitHub](https://github.com/remotion-dev/remotion); [Remotion license page](https://www.remotion.dev/docs/license)
- **HyperFrames** (HeyGen): "Write HTML. Render video. Built for agents." 80,272 stars, Apache-2.0, created 2026-03-10. It has HTML/CSS/GSAP compositions with lint/validate/render CLI. video-use describes it as "deterministic frame capture plus HyperFrames lint/validate/render checks". — [GitHub](https://github.com/heygen-com/hyperframes); [video-use SKILL.md](https://github.com/browser-use/video-use)
- **Manim**: 3b1b/manim, 96,224 stars, MIT, "Animation engine for explanatory math videos". ManimCommunity/manim, 42,318 stars, MIT. — [GitHub](https://github.com/3b1b/manim); [GitHub](https://github.com/ManimCommunity/manim)
- **Motion Canvas**: 19,714 stars, MIT, "Visualize Your Ideas With Code". — [GitHub](https://github.com/motion-canvas/motion-canvas)
- Both agent kits delegate to these engines. video-use: "Pick the engine per animation slot… HyperFrames / Remotion / Manim / PIL". OpenMontage locks `render_runtime` to Remotion or HyperFrames per project. Kino and OpenChatCut are built on Remotion. — [video-use SKILL.md](https://github.com/browser-use/video-use); [OpenMontage README](https://github.com/calesthio/OpenMontage); [Kino Launch HN](https://news.ycombinator.com/item?id=50368804); [OpenChatCut package.json](https://github.com/0xsline/OpenChatCut)

### Inferences
- **Category map (plain language):**
  1. **Pixel engines / composition frameworks** (Remotion, HyperFrames, Manim, Motion Canvas, plus ffmpeg as the universal workhorse). They answer "how do I turn a description into frames?"
  2. **Perception/AI services** (ElevenLabs Scribe/Whisper ASR, CLIP embeddings, Seedance/Kling/Veo generation, TTS). They answer "what's in the footage, and how do I make new media?"
  3. **Agent-layer kits / skills** (video-use, OpenMontage, ButterCut, ChatCut's skill packs). They are prompts plus thin scripts that teach a general agent to chain 1 and 2. No UI.
  4. **Agent-native editor products** (ChatCut, Kino, Diffusion Studio, OpenChatCut, pireel; and incumbents adding agents: Descript Underlord, Captions). They have a persistent, human-editable timeline, preview, storage, collaboration, rendering infra, and billing, with an agent built in and/or exposed via MCP.
  5. **Vertical AI point products with proprietary models/data** (Opus Clip ClipAnything, Captions/Mirage, Gling, Eddie, Selects). They are narrow workflows, sometimes with owned models.
- OpenMontage and video-use are both category 3. They differ in scope: video-use = cut your own footage; OpenMontage = generate and assemble new videos.
- Revideo (a Motion Canvas fork) is often listed in this category, but I did not verify its repo status in this session.

### Gaps
- Exact Remotion company-license pricing and thresholds were not extracted (the page loaded without the pricing table). Another researcher covers rendering in depth.

---

## 5. Bottom line: what plain Claude Code can reproduce vs. what's genuinely hard

### Takeaway
Out of the box, Claude Code plus ffmpeg plus a word-level ASR can already do what video-use does, and most of what OpenMontage does. These kits mainly save time by front-loading tuned prompts, correctness rules, and API adapters. What plain Claude Code cannot cheaply reproduce is the *product layer*:
- a real-time, frame-accurate browser/desktop timeline that humans and agents co-edit
- pro-codec decoding and WebCodecs rendering
- media storage, indexing and collaboration
- NLE round-trip export
- model reselling and billing
- proprietary models and evals

### Cited Findings
- video-use's entire code surface is about 2.1K lines of Python wrapping ffmpeg/PIL/librosa plus one Scribe call. Its key behaviors (30 ms fades, cut padding, self-eval loop, parallel animation sub-agents) are written as prompt rules in SKILL.md. — [video-use repo](https://github.com/browser-use/video-use)
- OpenMontage's "orchestrator" is the coding agent itself ("There is no code orchestrator"). Its distinctive code is provider adapters, scoring, a CLIP corpus, cost tracking, and a local storyboard UI. — [OpenMontage README / lib](https://github.com/calesthio/OpenMontage)
- Kino's founder on the gap left by raw agent harnesses: tiny edits must be described "either in words or in quick one-off UIs, you can't refer to footage shared across your devices, and feedback from teammates comes as screenshots on Slack". He also says building a WYSIWYG editor for React "was hard to get right", and that the performance needed custom ProRes/BRAW/R3D decoders, WebCodecs and Mediabunny. — [Launch HN](https://news.ycombinator.com/item?id=50368804)
- ChatCut explicitly separates agent reasoning (paid by the user's Claude/Codex subscription) from its own value (hosted generation, timeline, rendering, export). — [Product Facts](https://chatcut.io/docs/product-facts)
- An open-source equivalent of a ChatCut-style product (OpenChatCut) is about 294K lines of TypeScript. — [repo](https://github.com/0xsline/OpenChatCut)

### Inferences
**Afternoon-reproducible with plain Claude Code (high confidence):**
- word-level transcription to a packed transcript
- silence/filler cutting to an EDL
- ffmpeg segment extract, concat, fades, and burned subtitles
- a filmstrip + waveform PNG
- simple LUT/eq grading
- loudnorm
- a self-check loop
- spawning sub-agents for Remotion/HyperFrames/Manim overlays
- OpenMontage-style YAML pipelines and provider wrappers, one API at a time

**Days to weeks (medium):**
- learning the correctness gotchas (pops, caption/overlay order, PTS shifts, timestamp drift, double encodes, HDR/portrait/fps edge cases). This is exactly what video-use's SKILL.md packages.
- breadth of 60+ provider adapters with cost accounting (OpenMontage)
- a CLIP-indexed stock corpus
- a local live storyboard UI

**Genuinely hard / defensible (product-builder territory):**
1. A real-time, frame-accurate, multi-track timeline editor in the browser or desktop, with scrubbing, a persistent editable project state that both humans and agents mutate, and undo/versions.
2. Decoding and rendering at scale: WebCodecs/Mediabunny pipelines, pro codecs (ProRes/BRAW/R3D), proxies, and local/browser/cloud render parity up to 4K.
3. Collaboration and media management: multiplayer, review links, addressable URLs for every clip and frame, footage indexing (embeddings, faces, descriptions).
4. Ecosystem integration: NLE XML/CapCut export, MCP servers for many agent hosts, OAuth, credits and billing.
5. Proprietary models, training data, and evals (Captions/Mirage, Opus ClipAnything). Also curated, tested prompt/skill libraries with regression evals, which none of the open kits publish.

**For a creator building a product**: the agent-layer kits are good reference designs and can be prototyped quickly. The differentiation is in categories 4 and 5. The licenses matter: AGPL (OpenMontage, OpenChatCut, pireel) has network-use obligations, MIT (video-use) and MPL-2.0 (Diffusion Studio) are permissive or weak-copyleft, and Remotion requires a paid company license above its free-tier eligibility.

### Gaps
- No public benchmark compares edit quality across video-use, OpenMontage, ChatCut, or plain Claude Code. All "can Claude Code do it" judgements here are engineering estimates, not measured.
- The time estimates (afternoon vs. weeks) are inferred from code size and complexity, not tested.
