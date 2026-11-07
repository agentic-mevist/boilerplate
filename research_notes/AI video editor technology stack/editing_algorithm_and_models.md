# The "Algorithm" of AI Video Editing: Pipeline Stages, Model Selection, and Literature (as of 2026-11-07)

Plain-language summary: when "Claude Code / ChatGPT edits a video", the LLM almost never touches pixels. It writes and runs scripts that call ffmpeg, a speech-to-text model, and other specialized tools, then reads text (a transcript with word times) and still images (frame grabs), decides what to keep, writes a cut list, and renders it with ffmpeg or a code-based animation framework (Remotion, HyperFrames). Most of the stages are ordinary signal processing or small specialist models. Only a few stages actually need a big model's judgment: picking the story and pacing, and writing motion-graphics code. The rest can run in seconds for fractions of a cent.

## 1. Pipeline stages and the best-known method for each

### Takeaway
A practical editor is about 15 stages. Roughly 10 of them are deterministic or specialist-model work (ffmpeg, VAD, ASR plus forced alignment, diarization, shot detection, face tracking, loudness, denoise, render). LLMs are needed only for planning: choosing takes, structure, and highlights. Code-gen LLMs are needed for motion graphics, and VLMs only where the edit depends on what is on screen (B-roll matching, visual QA).

### Cited Findings

**Reference workflow used by practitioners (what "Claude Code edits my video" really is)**
- A widely shared Claude Code workflow (Brooke Lacey, via ChatPRD) uses FFmpeg + Whisper + Python. Claude analyzes the clip with word timing and silence detection, tracks the face for shot size, and outputs a **TSV cut list (start, end, shot size, label)** that "is the entire edit plan". The human reviews and edits the TSV, then ffmpeg renders. Their tip: "Adjusting a number here is much faster than re-editing a video project." — [ChatPRD workflow](https://www.chatprd.ai/how-i-ai/workflows/claude-code-short-form-video-editing)
- An XDA write-up of a terminal-based Claude Code editor gives an eight-step roadmap: "transcribe, detect repeated takes, rough cut, tighten, captions, B-roll, sound effects, export." (search snippet; full page could not be fetched) — [XDA](https://www.xda-developers.com/turned-my-terminal-into-a-video-editor-using-claude-code/)
- OpenMontage (open-source, trending June 2026) describes itself as an "agentic video production system with 12 pipelines, 52 tools, and 500+ agent skills". It works with Claude Code/Cursor/Codex and needs Python, FFmpeg and Node.js. The framing is that video work becomes "repo-shaped": scripts, scene lists, asset folders, caption files, render templates, review notes. — [Developers Digest](https://www.developersdigest.tech/blog/openmontage-agentic-video-production)
- Remotion publishes official "Agent Skills" for Claude Code, Codex, Kimi Code and Cursor, covering compositions, animations, layout and typography. This is the standard route for LLM-generated motion graphics (React code rendered to video). — [Remotion docs](https://www.remotion.dev/docs/ai/skills)
- Timeline-Bench's agent sandbox (Sept 2026) gives a concrete "editor in code" toolset: FFmpeg, Python, Node, **Remotion and HyperFrames** with a headless browser, and a transcription command (AssemblyAI Universal-3.5 Pro). — [Timeline-Bench HTML](https://arxiv.org/html/2609.35143v1)

**Stage-by-stage (method → tools → speed/cost evidence)**

1. **Ingest / proxy / probe.** Deterministic: ffprobe for metadata, ffmpeg for low-res proxies and audio extraction. No ML. (Standard practice; see the toolsets above.)
2. **ASR with word timestamps.** Specialist speech models, not LLMs.
   - Open ASR Leaderboard numbers (short-form English, mean WER / RTFx): **Parakeet-TDT-0.6B-v3 6.32% / 3,333×**; Canary-1B-v2 7.15% / 749×; **Qwen3-ASR-1.7B 5.76% / 148×** (most accurate here; streaming mode drops timestamps, and offline alignment needs Qwen3-ForcedAligner-0.6B); Whisper-large-v3 7.44% / 146×; Whisper-large-v3-turbo 7.83% / 200×. Parakeet/Canary have native word timestamps. — [Amira Labs (Aug 2026)](https://amiralabs.com/blog/whisper-parakeet-canary-qwen3-asr-broadcast-model-selection); leaderboard: [HF Open ASR Leaderboard](https://huggingface.co/spaces/hf-audio/open_asr_leaderboard), [paper](https://arxiv.org/html/2510.06961v2)
   - Cost: Modal transcribed about a week of audio in about 1 minute for about $1 with Parakeet. That is 25–112× faster and 60–200× cheaper than a proprietary API "while matching its error rate". Proprietary APIs charge "about 0.4¢ per minute". — [Modal blog](https://modal.com/blog/fast-cheap-batch-transcription)
   - Hosted: ElevenLabs Scribe v2, Deepgram Nova-3 and others "cluster at 2-5% WER on standard benchmarks" ([Coval](https://www.coval.ai/blog/best-speech-to-text-providers-in-2026-independent-benchmarks-and-how-to-choose/)). Deepgram reports Nova-3 at 5.26% batch WER on real-world data ([Future AGI](https://futureagi.substack.com/p/speech-to-text-apis-in-2026-benchmarks)). Deepgram itself notes there are "no independent academic benchmarks directly comparing Scribe v2 and Nova-3 as of 2026" ([Deepgram](https://deepgram.com/learn/elevenlabs-transcription-vs-deepgram)). These are vendor or aggregator sources, so treat them with caution.
   - Gemini's pricing page lists an "effective blended rate of ~$0.005 per min for Transcribe" (25 audio tokens/s in, ~175 text tokens/min out). The text sits in the Gemini 3.8 Flash section. — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
3. **Forced alignment (exact word boundaries for cuts).** WhisperX = VAD + Whisper + wav2vec2 phoneme forced alignment + pyannote diarization. Word-timestamp precision is 93.2% vs Whisper's 85.4% at 200 ms tolerance. It runs batched up to 70× real time; latest is 3.8.6 (May 2026) with pyannote community-1. — [WhisperX paper](https://arxiv.org/html/2303.00747v2); [Fora Soft explainer, Oct 2026](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/whisperx-diarization-word-level-timestamps). Caveat: GitHub issues report misaligned word timestamps in some versions (≥3.3.3) — [issue #1220](https://github.com/m-bain/whisperX/issues/1220), [#1247](https://github.com/m-bain/whisperX/issues/1247). An AI-editor builder on Reddit complains WhisperX is "only accurate on the first 10 words" — [r/speechtech](https://www.reddit.com/r/speechtech/comments/1q09mhw/whisperx_is_only_accurate_on_the_first_10_words/).
4. **VAD / silence removal.** Classical or tiny-model work. Silero VAD processes a 30 ms chunk in under 1 ms on one CPU thread ([GitHub](https://github.com/snakers4/silero-vad)). One user reports 600 s of audio in 2–3 s ([discussion](https://github.com/snakers4/silero-vad/discussions/408)). Alternatives are ffmpeg `silencedetect` (energy threshold) and the auto-editor CLI. Commercial "silence remover" features (Gling, AutoCut, Clipchamp) do the same thing: detect quiet spans and cut them with short padding — [Gling](https://www.gling.ai/silence-remover), [AutoCut](https://www.autocut.com/en/autocutsilences/).
5. **Filler-word detection ("um/uh", stutters).** Standard Whisper tends to drop fillers. CrisperWhisper (verbatim ASR with accurate word timestamps) keeps them, and was tuned partly on PodcastFillers (~35,000 filler instances) — [CrisperWhisper paper](https://arxiv.org/html/2408.16589v1), [HF model](https://huggingface.co/unsloth/CrisperWhisper). CrisperWhisper 2.0 adds multilingual verbatim output — [nyra labs](https://nyra-labs.com/crisperwhisper). Once fillers are tokens with timestamps, removing them is a list filter with no LLM.
6. **Speaker diarization.** pyannote speaker-diarization-community-1 gets 17.0% DER on AMI-IHM and 19.9% on AMI-SDM ([pyannote](https://www.pyannote.ai/blog/pyannote-vs.-speechbrain-for-speaker-diarization)). It is "much better than 3.1" ([HF card](https://huggingface.co/pyannote/speaker-diarization-community-1)). In a benchmark suite, the pyannoteAI API had the lowest DER and SpeakerKit was fastest ([arXiv 2507.16136](https://arxiv.org/html/2507.16136v2)).
7. **Retake / duplicate-take detection.** No dedicated benchmark found (see Gaps). The practitioner roadmap lists "detect repeated takes" as step 2 ([XDA](https://www.xda-developers.com/turned-my-terminal-into-a-video-editor-using-claude-code/)). Timeline-Bench finds outtakes and repeats in 1–7% of top agents' rejected edits and in 18.5% for computer-use agents ([Timeline-Bench](https://arxiv.org/html/2609.35143v1)).
8. **Shot / scene boundary detection.** Classical options: PySceneDetect (content/adaptive/threshold detectors) and ffmpeg `scene`. Neural options: TransNetV2 and AutoShot. AutoShot reports beating TransNetV2 by 4.2%/3.5% F1 on its short-video dataset — [AutoShot CVPRW 2023](https://openaccess.thecvf.com/content/CVPR2023W/NAS/papers/Zhu_AutoShot_A_Short_Video_Dataset_and_State-of-the-Art_Shot_Boundary_Detection_CVPRW_2023_paper.pdf); [TransNetV2](https://github.com/soCzech/TransNetV2). One review cites about 87% shot-segmentation accuracy for neural methods vs about 65% for histogram methods (secondary source) — [canlab review](https://github.com/canlab/narrative_feature_annotations/blob/main/docs/scoping_review/06_situation.md). Timeline-Bench itself measures cuts/minute with a re-implementation of PySceneDetect's adaptive detector ([Timeline-Bench](https://arxiv.org/html/2609.35143v1)).
9. **Face/subject tracking for reframing (16:9 → 9:16).** This is detection plus tracking plus crop-path smoothing. Google's open-source AutoFlip (MediaPipe) does "intelligent video reframing" with ML object detection and tracking — [Google OSS blog](https://opensource.googleblog.com/2020/02/autoflip-open-source-framework-for.html). Open CLIs split by scene, track subjects, and rank them with face/pose/segmentation cues — [auto-vertical-reframe](https://github.com/KazKozDev/auto-vertical-reframe). Premiere also has Auto Reframe.
10. **Visual understanding / B-roll search.**
    - Gemini: 1 FPS frame sampling by default; about 100 tokens/s of video at low media resolution and about 300 tokens/s at high. A 1M context fits about 3 h (low) or 1 h (high). An opt-in **agentic video understanding** mode (Gemini 4 Argon, 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite) "dynamically navigates the video timeline" instead of ingesting every frame. Custom fps is supported (e.g. 0.5). — [Gemini video docs](https://aistudio.google.com/docs/video-understanding). The token docs list 263 tokens/s for static processing ([Gemini tokens](https://aistudio.google.com/docs/tokens)), which conflicts slightly with the ~100–300 range above. A secondary blog claims agentic mode cuts video tokens by up to 88% ([explainx](https://explainx.ai/blog/gemini-agentic-video-understanding-google-ai-studio-2026)).
    - Twelve Labs Marengo (embeddings/search) and Pegasus (video-to-text) offer plans at Free / $29 / $99 per month (per-minute indexing rates were not extractable from the page) — [Twelve Labs pricing](https://www.twelvelabs.io/pricing). They are also available on Bedrock — [AWS](https://aws.amazon.com/bedrock/twelvelabs/).
    - LAVE (2024) used a cheap-perception, LLM-reasoning split: LLaVA captions each frame at 1 fps, GPT-4 summarizes, and text embeddings handle retrieval — [LAVE](https://arxiv.org/html/2402.10294v1).
    - Open VLMs on OpenRouter: Qwen3-VL-30B-A3B at $0.15/$0.60 per M; Qwen3-VL-235B at $0.21/$1.90; GLM-4.6V at $0.30/$0.90 (live API pull, 2026-11-07) — [OpenRouter models API](https://openrouter.ai/api/v1/models).
11. **Highlight / clip selection.** OpusClip gives each clip a "Virality Score" from 0–99 (the method is proprietary) — [OpusClip help](https://help.opus.pro/docs/article/virality-score). Academic work: HIVE (EMNLP 2025 Industry) argues transcript-only selection "neglect[s] the rich visual context". It uses MLLM character, dialogue and narrative analysis plus scene segmentation, and splits editing into **highlight detection, opening/ending selection, and pruning**. It also releases the DramaAD dataset (800+ drama episodes, 500 professional ad clips) — [arXiv 2507.02790](https://arxiv.org/abs/2507.02790). Transcript-assisted highlight detection beats vision-only — [arXiv 2505.23268](https://arxiv.org/html/2505.23268v1). Zero-shot approach: an LLM writes highlight descriptors and CLIP matches them to frames — [arXiv 2609.14790](https://arxiv.org/html/2609.14790v1).
12. **Story/structure planning.** An LLM reads the transcript plus metadata and emits a cut list. This is the LLM's core job in every practitioner workflow above (TSV cut list) and in LAVE (storyboarding, clip trimming with rationale) — [LAVE](https://arxiv.org/html/2402.10294v1).
13. **Timeline representation.** OpenTimelineIO (.otio is JSON) is an interchange format that adapters can turn into FCPXML, EDL and others — [OTIO GitHub](https://github.com/AcademySoftwareFoundation/OpenTimelineIO), [conform.tools](https://conform.tools/blog/opentimelineio-otio-future). Agent tooling recommends OTIO as "a good neutral 'timeline JSON' to write before rendering or handing off to an NLE" — [varg.ai](https://varg.ai/how-to/skills/opentimelineio).
14. **Audio.** DeepFilterNet (v3) does real-time full-band (48 kHz) speech enhancement — [arXiv 2305.08227](https://arxiv.org/abs/2305.08227), [GitHub](https://github.com/rikorose/deepfilternet). Loudness normalization (ffmpeg `loudnorm`, EBU R128) and sidechain music ducking (ffmpeg `sidechaincompress`) are deterministic filters (standard ffmpeg; not separately sourced here).
15. **Render + verification.** Timeline-Bench agents check their own output in 86–100% of runs. But 5.5% of fixes concern pacing/story, and agents "check their renders for defects, not craft" and "claim success in 93% of runs" — [Timeline-Bench](https://arxiv.org/html/2609.35143v1).

### Inferences
- A sensible stage table (inference from the above):
  | Stage | Best method | Needs LLM? |
  |---|---|---|
  | Probe/proxy/extract audio | ffmpeg | No |
  | ASR | Parakeet-TDT / Canary (self-host, ~free) or hosted Scribe/Deepgram/AssemblyAI (~$0.004–0.01/min) | No |
  | Word timing | Native TDT timestamps, or WhisperX / Qwen3-ForcedAligner | No |
  | Silence/VAD | Silero VAD / silencedetect / auto-editor | No |
  | Fillers | Verbatim ASR (CrisperWhisper) + list filter | No |
  | Diarization | pyannote community-1 | No |
  | Retakes | Sentence embeddings + similarity threshold, then a small LLM to pick the best take | Small LLM (optional) |
  | Shot detection | PySceneDetect / TransNetV2 | No |
  | Reframe | MediaPipe face + tracking + smoothing | No |
  | Visual tagging/B-roll | SigLIP/CLIP embeddings; Gemini Flash / Qwen3-VL for descriptions | Small VLM |
  | Highlight / story / pacing | LLM over timestamped transcript (+ shot list, visual captions) | Mid/frontier LLM |
  | Titles/captions text | Small LLM | Small LLM |
  | Motion graphics | LLM writes Remotion/HyperFrames code | Frontier or strong coding model |
  | Audio polish | DeepFilterNet + loudnorm + ducking | No |
  | Render | ffmpeg / Remotion render | No |
  | QA | Re-transcribe output + diff vs plan; frame checks; optional VLM watch-through (Gemini Flash) | Small VLM |
- In simple words: the "editor brain" (frontier LLM) should see a compact text description of the footage and write a plan. Fast, cheap tools should do the listening, looking and cutting.

### Gaps
- There is no public benchmark specifically for retake/duplicate-take detection. The method suggested above (embeddings plus similarity) is inference.
- Exact Twelve Labs per-minute indexing prices did not render in the fetched page.
- Independent, head-to-head word-timestamp accuracy (ms error) for Parakeet vs WhisperX vs Scribe vs Deepgram was not found.

## 2. Which steps need a frontier LLM vs a small LLM vs no LLM — model selection, token math and cost

### Takeaway
Cutting and cleanup ("simple stuff") do not need Opus. They are deterministic. One planning call over a ~10-minute transcript costs about $0.10 on Opus 5.5, $0.05 on Sonnet 5.5, and well under $0.01 on Haiku 5.5 or open "flash" models. Real cost comes from agent loops and from feeding frames to the model, not from the transcript. Frontier models do earn their price on taste-heavy judgment and graphics code. Benchmarks show cheap models resolve markedly fewer end-to-end editing tasks.

### Cited Findings

**Current Anthropic pricing (official, fetched 2026-11-07)** — [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Claude Fable 5.1: $10 / $50 per MTok (input/output).
- **Claude Opus 5.5: $4 / $20**; cache hit $0.20; batch $2 / $10; fast mode $8 / $40.
- **Claude Sonnet 5.5: $2 / $10**; cache hit $0.10; batch $1 / $5.
- **Claude Haiku 5.5: $0.10 / $0.50 for prompts ≤100K tokens; $0.50 / $2.50 above 100K**; batch $0.05 / $0.25.
- Older: Opus 5 / 4.8 / 4.7 at $5 / $25; Haiku 4.5 batch $0.50 / $2.50.
- Batch API = 50% off. Tool use adds a 286-token system prompt on Opus/Sonnet/Haiku 5.5.
- Anthropic's own worked example: a 1-hour Opus 5.5 agent session with 50K input and 15K output tokens costs $0.50 in tokens (+$0.08 runtime on Managed Agents).

**Gemini (official, fetched 2026-11-07)** — [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Gemini 3.8 Flash: **$0.75 in / $3.75 out per M through Dec 31, 2026, rising to $1.50 / $7.50 from Jan 1, 2027**. Batch is half. Caching $0.075/M.
- `gemini-2.5-pro` auto-routes to Gemini 3.8 Flash from Dec 1, 2026.
- OpenRouter lists Gemini 4 Argon at $2 / $10 and Gemini 3.5 Flash-Lite at $0.30 / $2.50 — [OpenRouter API](https://openrouter.ai/api/v1/models).

**Open / other models (OpenRouter live `/api/v1/models`, pulled 2026-11-07, USD per M tokens in/out)** — [OpenRouter API](https://openrouter.ai/api/v1/models)
- DeepSeek V4.1 Flash $0.051 / $0.567; DeepSeek V4 Pro $0.769 / $1.537.
- GLM-5.3 Flash $0.15 / $0.50; GLM-5.3 $0.07 / $1.40; GLM-5.3 Prime $2.80 / $8.80.
- Qwen3.8 Flash $0.15 / $0.47; Qwen3.8-27B $0.15 / $1.875; Qwen3.8 Max $2 / $6; Qwen3.7 Flash $0.03 / $0.13.
- Kimi K2.6 $0.65 / $3.41; Kimi K3 $0.192 / $16 (anomalous split); Kimi K3.1 Pro $2 / $10.
- GPT-5.6 Sol $4 / $20; GPT-5.6 Terra $2 / $12; GPT-5.6 Luna $0.20 / $1.20; Grok 4.7 $2 / $6.
- Caveat: several OpenRouter entries look anomalous (e.g., GLM-5.2 $0.006 input, Kimi K3 $0.192/$16). They are likely provider-specific promos or routing quirks; verify before relying on them.

**Benchmark evidence on model choice for editing**
- **Timeline-Bench (Sept 2026; 56 raw-footage-to-final-cut tasks; quality test calibrated on 2,582 blind judgments by 43 editors).** Resolution rates: GPT-6 Astra + Codex + curated editorial guidance 26.8% (best); **Claude Opus 5 + Claude Code 23.2%**; GPT-6 Astra (Codex or OpenCode) 21.4%; Claude Fable 5.1 17.9% (both Claude Code and OpenCode); Claude Opus 5 in OpenCode 17.9%; GPT-5.6 Sol 17.9% (OpenCode) / 8.9% (Codex); Grok 4.6 12.5%; **Gemini 3.8 Flash 10.7%; GLM 5.3 Flash 10.7%; DeepSeek Flash 7.1%; Qwen 3.8 Max 3.6%**; Gemini 3.1 Pro Preview 1.8%; computer-use agent 3.6%. Average 14.0%. Each rate has about ±11-point 95% CI. Human editors prefer the reference edit in 83.5% of judgments. Cost per run ranged **$0.13–$41.27** and "more expensive agents tend to resolve more tasks (ρ = 0.79)"; the best agent cost about $9.76/run. Median runtime was 16–61 min per run. Weaker code agents (Gemini 3.1 Pro Preview, Qwen 3.8 Max, GLM 5.3 Flash) shipped content-test defects (audio glitches, repeated footage) in 19% of rejections vs 10% for the top six. — [Timeline-Bench](https://arxiv.org/html/2609.35143v1)
- **AgenticVBench (May 2026; 100 expert tasks; 4 families).** The best stack, GPT-5.6-sol + Codex, scored 38.4%. Claude Fable 5 + Claude Code scored 32.4%, GPT-5.5 + Codex 31.0%, Gemini 3.1 Pro + OpenCode 23.8%. Humans scored 88.5%. Per family (best agent vs human): Assembly 48 vs 81, Repair 39 vs 88, Sequencing 33 vs 90, Repurpose 34 vs 95. — [AgenticVBench site](https://agenticvbench.com/), [arXiv 2605.27705](https://arxiv.org/abs/2605.27705)

**Token facts**
- Gemini video: ~100 tokens/s (low res) to ~300 tokens/s (high res) at 1 fps. Audio is 25 tokens/s (32 per older token docs). — [Gemini video docs](https://aistudio.google.com/docs/video-understanding), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini tokens](https://aistudio.google.com/docs/tokens)
- Timeline-Bench's judges show how text-only LLMs "watch": GPT-6 Astra and Claude Opus 5.5 "accept only text and images, so they read contact sheets of one frame per second", while Gemini 3.8 Flash "watches the edit with sound". — [Timeline-Bench](https://arxiv.org/html/2609.35143v1)

### Inferences
- **Token math for a 10-minute talking-head video (inference; standard ~150 wpm and ~1.3 tokens/word assumptions):**
  - Plain transcript ≈ 1,500 words ≈ 2,000 tokens.
  - Word-level JSON with start/end per word ≈ 10 tokens/word ≈ 15K tokens. A compact sentence-level format (id, start, end, text) ≈ 3–4K tokens. Recommendation: send sentence/phrase segments with IDs to the LLM, and keep word timings in code that snaps cuts to word boundaries.
  - A planning call with ~15K in and ~2K out costs: **Opus 5.5 ≈ $0.10; Sonnet 5.5 ≈ $0.05; Gemini 3.8 Flash ≈ $0.019; Haiku 5.5 ≈ $0.0025; GLM-5.3 Flash ≈ $0.003; DeepSeek V4.1 Flash ≈ $0.002**. Extended thinking adds output tokens: 10K thinking tokens add about $0.20 on Opus 5.5 and about $0.005 on Haiku 5.5.
  - Video via Gemini 3.8 Flash: 600 s × 100–300 tokens/s = 60K–180K tokens ≈ $0.045–$0.135 per full watch at the 2026 promo rate (double from Jan 2027). This assumes video input bills at the text rate; verify.
  - Frames to Claude: at 1 fps, 600 frames. With Anthropic's commonly cited ~(width×height)/750 tokens per image (≈1,000–1,600 per frame), that is about 0.6–1M tokens ≈ $2.40–$4 per pass on Opus 5.5. Tiling 16–25 frames into one contact-sheet image, or sampling only at shot boundaries, cuts this 10–25×. (The image-token formula was not confirmed on the fetched vision page; it comes from prior Anthropic docs.)
  - Agent loop: 40 turns re-sending a 50K context is about 2M input tokens, roughly $8 on Opus 5.5 uncached or about $0.40 + writes with caching. This explains Timeline-Bench's spread of $0.13–$41 per run.
- **Model-selection guidance (inference from benchmarks and prices):**
  - **No LLM:** silence/VAD cuts, filler removal, loudness, denoise, reframing, shot detection, captions timing, rendering.
  - **Small/cheap LLM (Haiku 5.5, Gemini 3.8 Flash, GLM-5.3 Flash, DeepSeek V4.1 Flash, Qwen3.8 Flash):** retake picking among near-duplicates, chapter titles, caption text cleanup, tagging shots, classifying "keep/drop" per sentence, parsing user commands into EDL edits, and translating a plan into tool calls. These are classification/extraction tasks; Anthropic markets Haiku 5.5 for "classification, extraction, and routing".
  - **Mid-tier (Sonnet 5.5, ~half of Opus 5.5's price):** a good default for the single story/pacing planning call and for routine Remotion templates.
  - **Frontier (Opus 5.5 / GPT-5.6 Sol / GPT-6 Astra / Fable 5.1):** end-to-end autonomous editing, novel motion-graphics code, narrative restructuring of long or multi-source footage, and "creative brief" repurposing. Benchmarks show a large gap: frontier 18–27% vs flash/open 4–11% on Timeline-Bench. Even frontier models are far below human editors.
  - **Video perception:** Gemini (native audio+video, agentic mode, cheap Flash tier) is the natural choice for "watching". Claude/GPT see only frames, so pre-digest with shot detection and contact sheets.
- Opus 5.5 ($4/$20) is now cheaper than Opus 5/4.8 ($5/$25), and Sonnet 5.5 is cheaper than Sonnet 4.6 ($3/$15). So for a one-shot plan call the absolute dollar difference is cents. The bigger lever is latency and how many calls you make.

### Gaps
- No benchmark isolates "planning-only" quality, e.g., Sonnet vs Opus vs Haiku given the same pre-computed transcript and shot list. Existing benchmarks mix perception, tool use and taste. Sonnet 5.5 and Haiku 5.5 were not in Timeline-Bench or AgenticVBench leaderboards.
- Output speed (tokens/s) for Opus 5.5 vs Sonnet 5.5 vs Haiku 5.5 was not collected; only the existence of Opus 5.5 "fast mode" ($8/$40) is confirmed.
- No reliable source for how commercial products (Descript, OpusClip, CapCut) split work between models.

## 3. Agentic loop vs fixed pipeline

### Takeaway
For well-defined edits (rough cut, silence/filler removal, shorts extraction, captions), a fixed pipeline does the work: deterministic analysis, then one or a few LLM planning calls emitting a structured EDL, then deterministic render and automated checks. It is faster (seconds to minutes vs 16–61 min), cheaper (cents vs $0.13–$41), and more predictable than an open-ended agent loop. Agent loops help mainly for open-ended creative briefs and code-generated graphics, and even there current agents fail on craft. Harness design swings scores as much as model choice.

### Cited Findings
- Timeline-Bench agents spend most of their effort perceiving: "98% of their perception precedes the first render, which comes 72–90% of the way through a run". Agents cut at 0.72× the reference pace. Most failures (562/771) pass every technical test and fail only quality. Median runtime per run is 16–61 min and is *unrelated* to resolution (ρ = 0.15). "Curated editorial guidance" lifted the best agent from 21.4% to 26.8%. — [Timeline-Bench](https://arxiv.org/html/2609.35143v1)
- AgenticVBench: "The harness matters as much as the model." The same GPT-5.5 scores 38% (Codex), 37% (OpenCode) and 18% (OpenClaw) on Assembly, a 20-point swing. "Agent = model × harness." — [AgenticVBench](https://agenticvbench.com/)
- General agent-systems evidence: "If the task is short and well-defined, one model call or a deterministic script will outperform an agent on cost, latency, and predictability." — [Aerospike](https://aerospike.com/blog/ai-agents-in-production/). Unlike single-pass calls, agent iterative reasoning gives "highly variable, multi-step" latency — [arXiv 2506.04301](https://arxiv.org/html/2506.04301v1).
- EditDuet (SIGGRAPH 2025) shows where a loop helps. An Editor agent plus a Critic agent iterate over an NLE timeline; it "vastly outperforms existing approaches in terms of coverage, time constraint satisfaction, and human preference". — [arXiv 2509.10761](https://arxiv.org/abs/2509.10761)
- LAVE used a *plan-then-execute* design: the LLM drafts an action plan, the user approves each step, and a function-calling model maps steps to backend functions. — [LAVE](https://arxiv.org/html/2402.10294v1)
- Practitioner workflows converge on a human-reviewable intermediate artifact (the TSV cut list) as the control point. — [ChatPRD](https://www.chatprd.ai/how-i-ai/workflows/claude-code-short-form-video-editing)
- Shotstack describes an "agentic video editing pipeline" as layered: the agent plans and calls tools, and a rendering API executes JSON timelines. — [Shotstack](https://shotstack.io/learn/how-an-agentic-video-editing-pipeline-works/)

### Inferences
- Recommended architecture (inference): **"pipeline with a bounded LLM core"**.
  1. Run deterministic analyzers in parallel (ASR+alignment, VAD, diarization, shot detection, face track, optional Gemini Flash visual captions) → a compact "footage dossier" JSON.
  2. One planning call (Sonnet 5.5 default; Opus 5.5 for premium/long-form) → EDL in a strict JSON schema (or OTIO).
  3. Deterministic validators check that cuts snap to word boundaries, that no words are clipped, and that target duration is met. A small model fixes violations.
  4. Render with ffmpeg/Remotion.
  5. Verify by re-transcribing the render and diffing it against the plan, then a cheap VLM watch-through. Loop at most 1–2 times with a critic (EditDuet-style).
  6. Reserve open-ended agent mode (Claude Code-style) for motion graphics authoring and unusual requests.
- In simple words: people who "just set Opus to make it work" pay for Opus to re-discover, every time, a recipe that can be hard-coded. Hard-code the recipe and use the big model only where taste is needed.

### Gaps
- No controlled study was found comparing a fixed pipeline plus one LLM call against an agent loop on the *same* editing tasks with cost/latency/quality reported. The recommendation above is inference from benchmark failure analyses and general agent-cost literature.

## 4. Academic literature on automatic / AI-assisted editing — what methods work

### Takeaway
The lineage runs from transcript-based editing (Berthouzoz 2012 → QuickCut 2016 → B-Script/Write-A-Video 2019, the ideas behind Descript-style editing) to LLM-agent editors (LAVE, ExpressEdit 2024; EditDuet 2025; HIVE 2025; VideoAgent 2026). The newest wave is end-to-end agent benchmarks (AgenticVBench, Timeline-Bench, VEBench 2026). Consistent lessons: edit via text plus timestamps, decompose into subtasks, add multimodal (visual) context beyond the transcript, use critic/verification loops, and keep humans in the loop. Fully autonomous agents still reach only 25–40% of tasks vs about 90% for humans.

### Cited Findings
- **Berthouzoz, Li, Agrawala 2012 (SIGGRAPH/ACM TOG 31(4), Adobe + Berkeley):** "Tools for placing cuts and transitions in interview video". The interface "links a text transcript of the video to the corresponding locations in the raw footage" and helps create transitions. It is the foundation of text-based video editing. — [ACM](https://dl.acm.org/doi/10.1145/2185520.2185563), [PDF](https://www.floraine.org/papers/2012-video-transitions/paper.pdf), [Adobe Research](https://research.adobe.com/publication/tools-for-placing-cuts-and-transitions-in-interview-video/)
- **QuickCut (Truong, Berthouzoz, Li, Agrawala, UIST 2016):** narrated video editing. It takes the narration audio plus annotated footage and "applies dynamic programming optimization" to align footage to narration. — [Project](https://graphics.stanford.edu/projects/quickcut/), [ACM](https://dl.acm.org/doi/10.1145/2984511.2984569)
- **B-Script (2019):** transcript-based B-roll editing with recommendations, building on Rubin et al.'s audio story editing. — [arXiv 1902.11216](https://arxiv.org/html/1902.11216v1)
- **Write-A-Video (Wang et al., SIGGRAPH Asia 2019, ACM TOG):** montage "using mostly text-editing". The user writes themed text, the system retrieves and assembles matching shots, then the user refines. — [ACM](https://dl.acm.org/doi/10.1145/3355089.3356520), [PDF](https://cg.cs.tsinghua.edu.cn/papers/TOG-2019-Write-a-Video.pdf)
- **LAVE (Wang et al., IUI 2024; 144 citations):** GPT-4 agent with plan/approve/execute, LLaVA frame captions at 1 fps, text-embedding retrieval, storyboarding and LLM clip trimming. — [arXiv 2402.10294](https://arxiv.org/abs/2402.10294)
- **ExpressEdit (Tilekbay et al., IUI 2024; KAIST):** editing informational videos via natural language plus sketching on frames, interpreted by LLM + vision models. — [arXiv 2403.17693](https://arxiv.org/abs/2403.17693), [site](https://expressedit.kixlab.org/)
- **EditDuet (SIGGRAPH 2025):** editing framed as sequential decision-making. It uses Editor + Critic agents with learned communication and an LLM-as-judge metric compared with human preference. — [arXiv 2509.10761](https://arxiv.org/abs/2509.10761)
- **HIVE / DramaAD (EMNLP 2025 Industry):** multimodal narrative understanding; decomposition into highlight detection, opening/ending selection and pruning; outperforms transcript-only baselines. — [arXiv 2507.02790](https://arxiv.org/abs/2507.02790)
- **VideoAgent (HKUDS; listed as EMNLP 2026):** all-in-one understanding plus editing framework. Reports 87–95% success on its own VideoEdit benchmark (a self-constructed benchmark, so not comparable to Timeline-Bench). — [arXiv 2606.23327](https://arxiv.org/html/2606.23327v2), [GitHub](https://github.com/HKUDS/VideoAgent)
- **Aurora (2026):** tool-augmented VLM agent plus unified video diffusion transformer, for generative (pixel) editing rather than cutting. — [arXiv 2605.18748](https://arxiv.org/html/2605.18748v1)
- **FrameWorkers (2026):** multi-agent "Director"-led open-ended video production. — [arXiv 2608.29814](https://arxiv.org/html/2608.29814v1)
- **Benchmarks:** AgenticVBench (arXiv 2605.27705; best 38% vs human 89%) — [site](https://agenticvbench.com/). Timeline-Bench (arXiv 2609.35143; best 26.8%; humans prefer the reference 83.5%) — [arXiv](https://arxiv.org/abs/2609.35143). VEBench (CVPR 2026 Findings) covers editing knowledge and operational reasoning for LMMs — [CVF PDF](https://openaccess.thecvf.com/content/CVPR2026F/papers/Deng_VEBench_Benchmarking_Large_Multimodal_Models_for_Real-world_Video_Editing_CVPRF_2026_paper.pdf). Shot boundary datasets: AutoShot (CVPRW 2023) — [PDF](https://openaccess.thecvf.com/content/CVPR2023W/NAS/papers/Zhu_AutoShot_A_Short_Video_Dataset_and_State-of-the-Art_Shot_Boundary_Detection_CVPRW_2023_paper.pdf). Sports highlights: SVHighlights (2026) — [arXiv 2606.06926](https://arxiv.org/html/2606.06926).
- **Curated list:** awesome-video-editing (tracks LAVE, CineAgents and 2026 agentic editing papers) — [GitHub](https://github.com/wentianli/awesome-video-editing)
- **Industry:** Adobe launched AI "Quick Cut" in the Firefly video editor (2026), which turns uploaded/generated B-roll into a structured first cut — [Adobe help](https://helpx.adobe.com/firefly/web/firefly-video-editor/create-quick-cut/quick-cut-overview.html), [Post Magazine](https://www.postmagazine.com/press-center/video-film/2026/adobe-introduces-ai-powered-quick-cut-for-video-editing/).

### Inferences
- Methods that consistently work across the literature: (1) **text as the editing surface** (transcript with word timestamps), from 2012 onward; (2) **optimization or constraint solving for alignment and timing** (QuickCut's dynamic programming), which is better than asking an LLM for exact timestamps; (3) **decomposition** into narrow subtasks (HIVE); (4) **cheap perception → text → LLM reasoning** (LAVE); (5) **critic/verification loops** (EditDuet); (6) **human approval checkpoints** (LAVE, practitioner TSV review).
- The 2026 benchmarks say the open problem is *craft* (pacing, story, picture/sound quality), not tool operation. Models with native audio-visual perception plus editorial guidance (skills/rubrics) are the current frontier. A product can win by encoding editorial guidance and human review, not by buying a bigger model.

### Gaps
- Meta and ByteDance/CapCut published editing-decision research was not located in this pass (e.g., AutoTransition, shot-type datasets such as MovieShots). These are known from prior knowledge but not verified here.
- "V-Edit" as a specific benchmark was not found. Descript's original technical underpinnings were not sourced beyond its citation as a transcript-centered tool ([arXiv 2603.09072](https://arxiv.org/html/2603.09072v1)).
