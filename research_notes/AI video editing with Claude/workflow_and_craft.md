# AI Video Editing with Claude Code: Workflow + Social-Video Craft Fundamentals (as of 2026-11-07)

Scope note: research was done on 2026-11-07 with web search (Serper) and direct fetches of primary pages (GitHub READMEs, code.claude.com docs, remotion.dev, hyperframes.heygen.com, YouTube Help, USC/Science Communication, the MrBeast PDF). Several of the most detailed "how it works in practice" sources are vendor blogs (cutback.video / Selects, LaoZhang AI) and are flagged as such: their tests are useful, but each sells an alternative.

---

## Q1. What does a typical Claude Code video-editing pipeline look like today?

### Takeaway
Claude Code does not edit video itself. It acts as a "conductor": a speech-to-text tool produces a word-timestamped transcript, Claude reads the text and writes a cut list (EDL/JSON), ffmpeg renders it, and code-based tools (Remotion, HyperFrames, Manim) add graphics. Use it to automate the speech-driven rough cut and the mechanical finishing (captions, loudness, crops, exports). Taste, visual selection, and the final polish usually still happen by hand or in an NLE.

### Cited Findings

**Overall architecture**
- Claude takes only JPEG/PNG/GIF (first frame)/WebP images; no video or audio files. So every "fully automated" setup is a pipeline: STT writes a transcript, Claude writes the cut list, ffmpeg renders — [LaoZhang AI blog, Oct 15 2026](https://blog.laozhang.ai/en/posts/claude-code-video-editing) (vendor blog; cites Anthropic vision docs)
- Japanese site Fyve (Jun 29 2026, as quoted by LaoZhang): Claude Code "acts as a conductor for ffmpeg and Whisper"; treat the result as a draft that's roughly 70% automated and 30% handwork — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- video-use (browser-use) pipeline: Transcribe → Pack → LLM reasons → EDL → Render → Self-Eval (fix + re-render up to 3 times). Design principles: "Text + on-demand visuals. No frame-dumping"; "Audio is primary, visuals follow. Cuts come from speech boundaries and silence gaps"; "Ask → confirm → execute → self-eval → persist. Never touch the cut without strategy approval"; "12 hard rules, artistic freedom elsewhere" — [browser-use/video-use README](https://github.com/browser-use/video-use)
- video-use features: cuts filler words ("umm", "uh", false starts) and dead space; auto color grade per segment (ffmpeg chain); **30 ms audio fades at every cut** to avoid pops; burned subtitles (default 2-word UPPERCASE chunks); animation overlays via HyperFrames/Remotion/Manim/PIL spawned in parallel sub-agents; persists session memory in `project.md` — [video-use README](https://github.com/browser-use/video-use)
- video-use is reported at ~29,000 GitHub stars (Oct 15 2026). It uses ElevenLabs Scribe ($0.22/audio hour; free tier ≈4.5 h). Its SKILL.md calls local Whisper on CPU an anti-pattern, and PRs adding local/Groq Whisper were not merged as of Oct 15 2026 — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- A Habr review (May 7 2026, via LaoZhang): video-use handles talking heads only, with no B-roll out of the box. Its self-check catches technical faults (pops, hidden subtitles) but not a wrong take being kept — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

**A concrete 8-step talking-head pipeline (chrislema/videoeditor, Claude Code skills)**
- `/process-video <file> [-HD|-4K|-portrait] [-nocaptions]` — [chrislema/videoeditor](https://github.com/chrislema/videoeditor):
  1. **Remove silence**: ffmpeg `silencedetect` finds gaps >0.5 s and trims them to 0.3 s pauses. Re-encodes for frame-accurate cuts; stream copy "causes keyframe drift"
  2. **Label sections**: whisper-cli transcript split into 3–6 s chunks, labeled normal (1.0x, ~60%), emphasis (1.25x, ~30%), critical (1.6x, ~10%)
  3. **Produce zoom**: OpenCV Haar face detection over 10 sampled frames; punch-in crops centered on the face (a "dynamic zoom" jump-cut substitute)
  4. **Correct colors**: "warm-punch" grade (warm shift, mild S-curve, slight saturation lift)
  5. **Master audio**: highpass/lowpass, +3 kHz presence, 200 Hz warmth, 3:1 compression, loudness normalization to **−16 LUFS**
  6. **Add captions**: drawtext burn-in, 6-word ALL CAPS chunks (landscape) or 3-word chunks (portrait)
  7. **Review**: a human reviews; intermediates are kept so single steps can be re-run
  8. **Clean artifacts**
  - Tooling: Homebrew ffmpeg (ffmpeg 9+ includes drawtext; older builds need `ffmpeg-full`), whisper.cpp `ggml-medium.bin`, opencv-python-headless

**Transcription layer (Whisper / whisper.cpp / WhisperX / faster-whisper / ElevenLabs Scribe)**
- WhisperX refines Whisper timestamps using forced alignment with a phoneme-based ASR model (wav2vec 2.0) and adds diarization — [WhisperX author on openai/whisper discussion](https://github.com/openai/whisper/discussions/684); [m-bain/whisperX](https://github.com/m-bain/whisperx)
- Practitioner caveat: WhisperX is more accurate than plain Whisper for timestamps but "not accurate enough for word level segmentation" in some uses — [r/MachineLearning thread](https://www.reddit.com/r/MachineLearning/comments/1cbd8x1/d_speech_to_text_word_level_timestamps_accuracy/) (anecdotal)
- Timestamp drift in a real test: Whisper put the end of "platforms." at 29.50 s, but ffmpeg silencedetect showed speech ran to 30.04 s, so the cut chopped the word. The start of "Hi," was off by +0.28 s. Fix: pad cuts and/or snap to silencedetect boundaries — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Install gotcha as of Oct 2026: faster-whisper 1.2.1 crashed with PyAV 19; pinning `"av<19"` fixed it (likely temporary) — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Vendor test: ElevenLabs Scribe v2 word edges were about 120 ms off (≈4 frames at 30 fps), which is audible as clipped consonants or clicks — [cutback.video / Selects, Nov 1 2026](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline) (vendor; it claims its own product gets ~10 ms)

**Silence / filler / blooper removal**
- auto-editor: `--margin` (default 0.2 s) keeps padding around cuts. `--edit audio:threshold=0.04` is the default; `--edit motion:threshold=0.02` cuts motionless stretches; the two can be combined — [WyattBlue/auto-editor README](https://github.com/WyattBlue/auto-editor)
- auto-editor exports timelines for Premiere, Resolve, Final Cut Pro, Shotcut and Kdenlive, and runs fully local. Limitation: it "cannot tell a retake from a good take" (only Claude's reading of the transcript can) — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Retakes are easy to spot in text: the same words appear twice and only the second run is complete — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

**Captions**
- Soft subtitles work with standard ffmpeg, but many social platforms ignore embedded subtitle tracks, so upload the .srt separately. Burned-in captions need the ffmpeg `subtitles` filter (Homebrew `ffmpeg-full` at the time). Example vertical command: `crop=ih*9/16:ih,scale=1080:1920,subtitles=final.srt:force_style=...` — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Remotion has a dedicated `/remotion-captions` skill — [Remotion Agent Skills docs](https://www.remotion.dev/docs/ai/skills)

**Motion graphics (code → video)**
- Remotion Agent Skills: install with `npx skills add remotion-dev/skills` or `gh skill install remotion-dev/skills`. They are also offered at `bun create video`. Skills: `/remotion-best-practices`, `/remotion-create`, `/remotion-markup`, `/remotion-studio`, `/remotion-render`, `/remotion-maps`, `/remotion-captions`, `/remotion-saas`, `/remotion-interactivity` — [remotion.dev/docs/ai/skills](https://www.remotion.dev/docs/ai/skills)
- Remotion also maintains a Claude Code plugin that bundles the Agent Skills — [remotion.dev Claude Code plugin](https://www.remotion.dev/docs/ai/claude-code-plugin); [Prompting videos with coding agents](https://www.remotion.dev/docs/ai/coding-agents)
- Remotion licensing: free for individuals and companies with ≤3 employees. Larger companies pay $25/seat/month or $0.01/render with a $100 monthly minimum — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing) (verify on remotion.dev/license)
- HyperFrames (HeyGen, Apache-2.0): HTML/CSS/GSAP → MP4. Install with `claude plugin marketplace add heygen-com/hyperframes` then `claude plugin install hyperframes@hyperframes`. Needs Node 22+ and FFmpeg (`npx hyperframes doctor`). Use: "Using /hyperframes:hyperframes, make a 10-second product intro for …". For longer story films it first offers three storylines; it gives a live browser preview and editor, and `npx hyperframes render --output final.mp4`. There is also a desktop Studio app and a hosted connector for the Claude chat app — [HyperFrames docs](https://hyperframes.heygen.com/guides/with-claude-code)
- HyperFrames and Remotion "render titles, lower thirds and charts over a cut but do not cut footage" — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Benchmark by awesome-claude-video-skills (16 skills run end to end on a promo brief): HyperFrames took 23.5 min for a 15-s brief; Remotion's skills rendered reliably in 4.5 min but looked "close to the default" unless given a design direction. **Claude Code with no skill made a passing film in 4.4 min.** "A skill earns its place with a look, a workflow, or footage to edit." The list catalogs 427 repos — [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- digitalsamba/claude-code-video-toolkit mostly *makes new* videos (Remotion templates, voiceover, avatars). On existing footage it can trim, concatenate, crop to 9:16, redub and add music, but has no silence cutting, transcript cuts or subtitles — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing); [repo](https://github.com/digitalsamba/claude-code-video-toolkit)

**B-roll, music, SFX, audio cleanup**
- Pexels API is free; default rate limit is 200 requests/hour and 20,000/month, raised free on request — [Pexels API docs](https://www.pexels.com/api/documentation/)
- ElevenLabs offers text-to-sound-effects via its API (alongside voice, music, dubbing, transcription) — [ElevenLabs API](https://elevenlabs.io/api); [Sound effects](https://elevenlabs.io/sound-effects)
- appariciojunior/video-editor-skills includes `music-and-sound` (Epidemic Sound cues per section, ducking envelope, "tasteful SFX"), `broll` ("finding and watching B-roll, cutting it by action and story") and `voice-and-audio` (loudness normalization, diagnosing a muffled voice, EQ recipe) — [repo](https://github.com/appariciojunior/video-editor-skills)
- Adobe Podcast Enhance Speech v2 removes noise and echo. It is web-app only; a competitor states "Adobe Podcast does not have a public API" — [Adobe Podcast](https://podcast.adobe.com/en/enhancespeech); [Cleanvoice (competitor)](https://cleanvoice.ai/adobe-podcast-api-alternative/). It therefore can't be scripted into a Claude Code pipeline; it's a manual step

**NLE handoff and MCP servers**
- ButterCut (barefootford): local WhisperX plus visual analysis. Claude builds a select, scene or rough cut and exports XML to Final Cut Pro, Premiere and DaVinci Resolve. Targets Apple Silicon Macs (Ruby, Python, full FFmpeg, WhisperX). Free under PolyForm Noncommercial with commercial *output* allowed; Pro ($49/yr) adds multi-track B-roll over the A-roll spine; multicam is "coming soon" — [barefootford/buttercut](https://github.com/barefootford/buttercut)
- appariciojunior/video-editor-skills: skills only, no code, for DaVinci Resolve **Studio**. Claude imports footage, cuts retakes and dead air, keeps B-roll, scores, captions, adds Remotion brand graphics, and **adds every feedback lesson to your CLAUDE.md**. Raw footage is never modified, and Claude only *adds* timelines in Resolve. License CC BY-NC 4.0 — [repo](https://github.com/appariciojunior/video-editor-skills)
- samuelgursky/davinci-resolve-mcp: controls Resolve Studio through the official scripting API; the installer configures Claude Desktop/Code, Cursor and others — [repo](https://github.com/samuelgursky/davinci-resolve-mcp). It lists "judging a cut" as a non-goal and calls its output "a first-pass assembly". The free Resolve edition only works via a bridge script; Resolve 21.1 moved Python scripting to Studio — [LaoZhang AI summary](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Premiere Pro MCP (hetpatel-11/adobe_premiere_pro_mcp): `.mcpb` bundle for Claude Desktop, validated on macOS. It warns that scripting often can't read existing caption text and that Premiere 26 has no scripting API for removing effects — [repo](https://github.com/hetpatel-11/adobe_premiere_pro_mcp); [LaoZhang summary](https://blog.laozhang.ai/en/posts/claude-code-video-editing); [premiere-pro-mcp.com setup](https://premiere-pro-mcp.com/blog/claude-desktop-premiere-pro-mcp-setup/)
- Palmier Pro runs a local MCP server while the app is open (macOS 26, Apple Silicon); builds after v0.7.6 are proprietary — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Hosted option: ChatCut Claude Code plugin (footage uploaded to their servers; $25–$160/month) — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Premiere can export Final Cut Pro XML (File > Export > Final Cut Pro XML) — [Adobe Help](https://helpx.adobe.com/premiere/desktop/render-and-export/export-files/export-a-project-as-a-final-cut-pro-xml-file.html)

**Which footage fits**
- Fits: one person to camera with pauses and retakes; narrated screen recordings (but a cut can skip an on-screen step that happened during a pause); podcasts (needs diarization). Poor fit: multicam, B-roll picked by look, color-critical work, sports and action — "Keep it in Premiere Pro, DaVinci Resolve or Final Cut Pro and let Claude handle transcripts, subtitles and exports" — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

### Inferences
- A good tutorial arc: (1) transcribe with word timestamps → (2) Claude proposes a keep-list/EDL that you approve → (3) ffmpeg render with padding, 30 ms fades and frame-accurate re-encode → (4) audio chain (highpass, EQ, compression, loudnorm) → (5) captions → (6) Remotion/HyperFrames overlays → (7) export XML/EDL to an NLE for taste passes. Every step except (2)'s judgment and (7) is mechanical and highly automatable.
- The recurring production bugs to teach are clipped words at cut points (timestamp drift), audio pops (no crossfade), keyframe drift (stream-copy cuts), missing ffmpeg filters (drawtext/subtitles builds), and Claude miscounting durations. The fixes are snapping to silence, padding, fades, re-encoding, and making Claude *compute* totals with code.

### Gaps
- I couldn't verify current Suno API availability or terms (Suno has historically had no official public API). Treat music generation via Suno inside a pipeline as unverified, and check licensing.
- I didn't fetch MCP servers for After Effects and Blender. Search results show Premiere/After Effects MCP tutorials (e.g., [YouTube](https://www.youtube.com/watch?v=20QgLCAXQYM)), but I didn't verify their capability or maintenance.
- I didn't verify OTIO (OpenTimelineIO) or EDL specifics for this pipeline; auto-editor and ButterCut cover XML exports.
- I didn't research Motion Canvas or Manim current status in depth. Manim is cited as an overlay option by video-use.
- No independent (non-vendor) benchmark exists comparing these pipelines on real footage.

---

## Q2. How does Claude "watch" video, and what are the limitations?

### Takeaway
It doesn't. Claude reads a transcript and, when needed, looks at sampled still frames or composite "contact sheets" (filmstrip + waveform + word labels). It can't hear audio or see motion between frames, so it can't judge timing feel, clipped consonants, or B-roll aesthetics unless something renders those signals into text or images. For true video understanding, people route clips to Gemini through an MCP server or skill.

### Cited Findings
- video-use: "The LLM never watches the video. It reads it." Layer 1 is the transcript (word-level timestamps, diarization, audio events like (laughter)), all takes packed into a ~12 KB `takes_packed.md`. Layer 2 is `timeline_view`, which renders a filmstrip + waveform + word-labels PNG for a time range "only at decision points." Naive frame dumping would be "30,000 frames × 1,500 tokens = 45M tokens of noise" — [video-use README](https://github.com/browser-use/video-use)
- Token math: on Claude 4.7+ (Opus 5.5 included), a 1920×1080 frame costs ≈2,691 tokens. One frame per second for 10 minutes ≈1.61M tokens, versus ≈7,500–21,000 tokens for that 10-minute transcript — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Invisible in text: an out-of-focus shot, a blink, a cluttered background — "Claude only notices it if a frame from that exact moment is checked." Tools that care about sound measure loudness with code instead of listening — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Vendor test (Claude Opus in Claude Code, 30-min interview, Scribe v2 transcript, asked for a 300 s highlight) — [cutback.video](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline) (vendor with a competing product):
  - Claude reported 299.32 s, but its cuts actually summed to 578.24 s (93% over)
  - All 11 cuts broke mid-sentence
  - 6 parallel subagents didn't fix the sentence breaks
  - Camera switching by speaker cut too fast
  - A parkour highlight found only 2 valid attempts and kept post-attempt talking instead ($12 in tokens, 25 min)
- Gemini video understanding: about 100 tokens/s at default (low) media resolution or about 300 tokens/s at high. It accepts public YouTube URLs (preview, free). File API takes up to 20 GB (paid) or 2 GB (free) — [Gemini API video understanding](https://ai.google.dev/gemini-api/docs/video-understanding); [aistudio doc snippet](https://aistudio.google.com/docs/video-understanding). The File API samples at **1 fps** by default — [Google AI dev forum](https://discuss.ai.google.dev/t/optimal-video-pre-processing-parameters-fps-resolution-for-file-api/87440). So fast action between samples can be missed.
- Google introduced "agentic video understanding" (Sep 1 2026), claiming up to 88% fewer tokens, up to 66% lower cost, and up to 7% better quality — [Google blog](https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/) (company claim)
- Bridges: ugarchance/mcp-gemini-video-understanding lets Claude Code send local files or YouTube URLs to Gemini and get text back — [repo](https://github.com/ugarchance/mcp-gemini-video-understanding). There are also "watch" skills with Gemini or local engines — [joaoqueiros guide](https://www.ai.joaoqueiros.com/blog/watch-skill-ai-video-analysis-gemini-local-install-guide)
- In claude.ai, "Claude Motion" makes code-built animations saved as MP4 but does not edit uploaded footage — [cutback.video](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline); [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

### Inferences
- The best practice is "transcript first, frames on demand": contact sheets at cut boundaries, plus a self-eval that re-transcribes the *output* to confirm no words were clipped. LaoZhang did this: re-transcribing final.mp4 returned the full clean script.
- Use Gemini for "what happens visually" questions (B-roll logging, finding action moments, analyzing reference videos). Use Claude for the reasoning and the code.

### Gaps
- No Anthropic doc found saying Claude Code natively ingests video as of Nov 2026. Both blogs (Oct 15 and Oct 31 2026) say it doesn't, citing Anthropic docs. Re-check before publishing, since this changes fast.

---

## Q3. Claude Code local/desktop vs. Claude Code on the web (cloud sessions) for video

### Takeaway
Do footage work locally, or in a cloud session attached to your own machine via Remote Control. Cloud VMs have no GPU and modest resources, don't ship ffmpeg by default, get code via GitHub (bad for multi-GB media), and enforce command timeouts. Cloud sessions shine for code-only work: Remotion/HyperFrames projects, skill authoring, and long unattended renders of small assets that can keep going after you close the laptop.

### Cited Findings
- A cloud session runs on Anthropic-managed infrastructure, "keeps running after you close your laptop", and can be steered from any device including the mobile app. Usage counts toward plan limits; there's no separate VM charge. Available on Pro, Max, Ultra, Team and eligible Enterprise seats — [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web)
- Code reaches the VM by cloning from GitHub. Repos without a GitHub remote are bundled and uploaded, and the bundle must be **under 100 MB**. Untracked files aren't included, and files managed by Git LFS have uncommitted changes left out — [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web). In practice, raw footage can't just be dropped into a cloud session.
- VM: Ubuntu 24.04 x86_64 with approximate ceilings of **4 vCPUs, 16 GB RAM, 30 GB disk**. "For workloads beyond these limits, use Remote Control to run Claude Code on your own hardware" or a self-hosted environment — [Cloud environments docs](https://code.claude.com/docs/en/cloud-environments)
- Pre-installed tools: Python, Node 20–22, Docker, Chrome, etc. **ffmpeg is not listed**; install it in a setup script (runs as root, `apt install` works) — [Cloud environments docs](https://code.claude.com/docs/en/cloud-environments). No GPU is mentioned.
- Time limits: foreground commands default to 2 min (max 10 min). After timeout they move to the background and can run up to 30 more minutes. Raise the limits with `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS`. Idle VMs pause and can be reclaimed — [Cloud environments docs](https://code.claude.com/docs/en/cloud-environments)
- Network: the default "Trusted" level allows package registries and allowlisted domains only. Reaching Pexels, ElevenLabs or Gemini APIs needs "Custom" domains or network secrets, which inject keys without exposing them to the session — [Cloud environments docs](https://code.claude.com/docs/en/cloud-environments)
- Handoff: `claude --cloud "task"` starts a cloud session, and `claude --teleport` pulls one back to the terminal (one-way from CLI; the Desktop app can send a local session to the cloud). Remote Control lets you steer a *local* session from phone or browser — [Claude Code on the web docs](https://code.claude.com/docs/en/claude-code-on-the-web)
- Hosted video pipelines move footage off your machine: ChatCut is server-side, and video-use sends audio to ElevenLabs for transcription — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

### Inferences
- Recommendation for the tutorial:
  - **Local (terminal/Desktop app)** for ingest, transcription (whisper.cpp uses Apple Silicon acceleration), ffmpeg renders and NLE/MCP control. Resolve and Premiere MCP servers need the app running on the same machine.
  - Use **Remote Control** if you want to walk away from the laptop and steer from your phone while it keeps rendering on your hardware.
  - Use **cloud sessions** for Remotion/HyperFrames code, caption styling and skill development, where assets are small and git-friendly.
- A 30 GB disk and 10-minute command cap make 4K multi-take renders in the cloud impractical without tuning. CPU-only Whisper on 4 vCPUs will be slow.

### Gaps
- There's no official doc on uploading large media files directly into a cloud session (other than via the repo). I didn't find any documented attachment size limit for video in Claude Code on the web.

---

## Q4. Best existing tutorials, guides and repos

### Takeaway
The strongest starting points are video-use (end-to-end talking heads), chrislema/videoeditor (readable 8-step skill pipeline), ButterCut and appariciojunior/video-editor-skills (NLE-first), the Remotion and HyperFrames official skills (graphics), the Resolve and Premiere MCP servers, and LaoZhang's step-by-step faster-whisper + ffmpeg walkthrough.

### Cited Findings

**Repos**
- [browser-use/video-use](https://github.com/browser-use/video-use) — conversational editor; transcript + timeline_view; self-eval
- [chrislema/videoeditor](https://github.com/chrislema/videoeditor) — 8 skills: silence, labels, zoom, color, audio master, captions
- [barefootford/buttercut](https://github.com/barefootford/buttercut) — rough cut → FCP/Premiere/Resolve XML
- [appariciojunior/video-editor-skills](https://github.com/appariciojunior/video-editor-skills) — Resolve Studio first-pass editor, with a CLAUDE.md lessons loop
- [remotion-dev/skills](https://github.com/remotion-dev/skills) and the [Remotion docs](https://www.remotion.dev/docs/ai/skills)
- [HyperFrames + Claude Code guide](https://hyperframes.heygen.com/guides/with-claude-code)
- [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) — generation-focused
- [samuelgursky/davinci-resolve-mcp](https://github.com/samuelgursky/davinci-resolve-mcp)
- [hetpatel-11/adobe_premiere_pro_mcp](https://github.com/hetpatel-11/adobe_premiere_pro_mcp)
- [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) — 427 repos, security-graded, with a 16-skill bake-off
- [seedprod/video-editor-for-claude-code](https://github.com/seedprod/video-editor-for-claude-code) — removes "Claude thinking" dead time from screen recordings
- [PaulBratslavsky/roughcut-ai-local-first-editor](https://github.com/PaulBratslavsky/roughcut-ai-local-first-editor) — local-first talking-head rough cut
- [riecodes/free247editor](https://github.com/riecodes/free247editor) — multi-agent editor (not evaluated)
- [ugarchance/mcp-gemini-video-understanding](https://github.com/ugarchance/mcp-gemini-video-understanding)

**Guides and articles**
- [LaoZhang AI, "Claude Code Video Editing: It Reads Transcripts, Not Your Video" (Oct 15 2026)](https://blog.laozhang.ai/en/posts/claude-code-video-editing) — the most detailed tested walkthrough, with commands and error fixes (vendor blog, but the content is technical)
- [cutback.video, "Can Claude Edit Videos?" (Nov 1 2026)](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline) — failure-mode tests (vendor)
- [ChatPRD "How I AI": Brooke Lacey's short-form workflow (Oct 29 2026)](https://www.chatprd.ai/how-i-ai/workflows/claude-code-short-form-video-editing) — FFmpeg + Whisper + Python with a **TSV cut list for human review**
- [Griffin Wooldridge, Talking-Head Editor skill](https://griffinwooldridge.com/skills/talking-head-editor) — "tight cuts that never clip a word, clean voice, captions and motion graphics written as code"
- [MindStudio: Claude Code for motion graphics (Apr 2026)](https://www.mindstudio.ai/blog/claude-code-video-editing-motion-graphics)
- [futureofmarketing.de AI video editing playbook (Oct 20 2026)](https://www.futureofmarketing.de/p/ai-video-editing-playbook)
- [r/ClaudeWorkflows talking-head workflow (whisper.cpp + ffmpeg)](https://www.reddit.com/r/ClaudeWorkflows/comments/1w9k55a/workflow_automated_talkinghead_video_editing_with/)
- [Reddit: Remotion Agent Skills setup guide](https://www.reddit.com/r/MotionDesign/comments/1qkqxwm/complete_guide_how_to_setup_remotion_agent_skills/)
- Community sentiment threads: [r/davinciresolve "Opus 5.5 + Resolve MCP"](https://www.reddit.com/r/davinciresolve/comments/1x11kck/claude_opus_55_davinci_resolve_mcp_is_a_monster/); [r/VideoEditors on Claude in workflows](https://www.reddit.com/r/VideoEditors/comments/1v1d6ti/anyone_effectively_using_claude_in_their_workflows/)

**YouTube tutorials (titles from search; content not verified)**
- [I Fully Automated My Video Editing with Claude Code](https://www.youtube.com/watch?v=gRhxHzZPT7Y)
- [I Fully Automated My Video Editing Using Claude Code (reference-based editing)](https://www.youtube.com/watch?v=X1M61eZtYL8)
- [Remotion skill walkthrough](https://www.youtube.com/watch?v=7OR-L0AySn8)
- [ButterCut "I Taught Claude Code to Edit Movies"](https://www.youtube.com/watch?v=FBkfr1yWf_s)
- [Claude Code + Gemini video analysis](https://www.youtube.com/watch?v=Vu67H0f9Yjc)

### Inferences
- For a "learn enough to be dangerous" tutorial, chrislema's pipeline is the clearest teaching scaffold: each step is one concept. video-use is the best "just works" demo.

### Gaps
- Star counts, maintenance status and quality weren't independently verified for most repos (except the video-use star count reported by LaoZhang).

---

## Q5. Common mistakes and iteration practices

### Takeaway
The winning pattern is to approve the plan before cutting, review a human-readable cut list, give concrete style references, and write every correction into CLAUDE.md or a project memory file so the next video starts smarter. The most common mistakes are trusting raw timestamps, letting Claude do arithmetic in its head, skipping the review pass, and expecting visual judgment from a text model.

### Cited Findings
- video-use asks first and only acts on confirmation: "inventories the sources, proposes a strategy, waits for your OK", then self-evaluates at every cut boundary before showing you, and persists memory in `project.md` — [video-use](https://github.com/browser-use/video-use)
- appariciojunior: give feedback in plain words ("too choppy", "music louder on B-roll"); "Claude adds every lesson to your CLAUDE.md so the next video starts smarter". Ships a `LEARNINGS.md` of what went wrong — [repo](https://github.com/appariciojunior/video-editor-skills)
- Brooke Lacey's workflow uses a TSV cut list to review timing before rendering — [ChatPRD](https://www.chatprd.ai/how-i-ai/workflows/claude-code-short-form-video-editing)
- chrislema keeps intermediates so you can re-run individual steps after review — [repo](https://github.com/chrislema/videoeditor)
- Claude "estimates instead of adding up" durations (reported 299 s, actual 578 s), and cuts broke mid-sentence — [cutback.video](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline) (vendor)
- Remotion's own skills produce default-looking output: "bring your own design direction" — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- Reference-based editing ("have AI 'watch' reference videos, extract framing, typography …") is a taught technique — [YouTube tutorial](https://www.youtube.com/watch?v=X1M61eZtYL8) (content not verified)
- Treat output as a draft (~70/30 automation/handwork) — [Fyve via LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)

### Inferences
- Tutorial checklist:
  1. Put a style guide in CLAUDE.md: caption font, words per chunk, safe zones, color look, LUFS target, pause length, "never cut mid-sentence", pad values.
  2. Supply 1–3 reference videos, analyzed via Gemini or contact sheets, plus brand assets.
  3. Require a written keep-list with sentence-boundary checks, and totals computed with code.
  4. Render a low-res preview first.
  5. Re-transcribe the output to verify.
  6. Log corrections back into CLAUDE.md.
  7. Finish in an NLE when taste matters.

### Gaps
- No quantitative data found on iteration counts or time saved versus manual editing (beyond anecdotes).

---

## Q6. What makes social video perform (evidence)

### Takeaway
Performance comes from two things. **Packaging** (title and thumbnail, measured by CTR) gets the click. **Retention**, especially the first seconds and minutes and whether the opening delivers on the packaging, gets the distribution. Audio clarity measurably changes how credible a speaker seems. Captions matter because a large share of feed viewing is silent. Many widely circulated "hook stats" come from vendors and should be cited cautiously.

### Cited Findings

**Packaging and expectations**
- MrBeast production guide (leaked 2024): the metrics that matter are CTR, AVD (average view duration) and AVP (average percentage viewed). "I Spent 50 Hours In Ketchup" vs. "…In My Front Yard": the same effort is "easily 100x more viral" because of packaging. "THIS IS WHY YOU MUST KNOW THE TITLE AND THUMBNAILS OF THE VIDEOS YOU ARE MAKING!" A bouncy castle that's red in the video but yellow in the thumbnail breaks expectations — [MrBeast PDF](https://cdn.prod.website-files.com/6623bf84e83241ec49b548e4/66edaa19db6e9359bb92931f_How-To-Succeed-At-MrBeast-Production%20(2).pdf); [Simon Willison summary](https://simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production/)
- The guide's goal is "the best YOUTUBE videos possible… Not the best produced… Not the highest quality" — [Simon Willison](https://simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production/)
- YouTube: "Half of all channels and videos on YouTube have an impressions CTR that can range between 2% and 10%" — [YouTube Help, Impressions & CTR FAQs](https://support.google.com/youtube/answer/7628154?hl=en)
- YouTube lets creators A/B test up to 3 titles and thumbnails; the winner is chosen by **watch time share**, not CTR — [YouTube Help A/B test](https://support.google.com/youtube/answer/16391400?hl=en); [vidIQ](https://vidiq.com/blog/post/youtube-launches-new-thumbnail-testing-tool/)
- Paddy Galloway reports YouTube Studio is adding an "ask studio packaging assistant" and thumbnail generation — [Paddy Galloway on X](https://x.com/PaddyG96/status/2102774246480982355) (feature details unverified on YouTube's own pages)
- Colin & Samir: decide the idea and "probably what your title and thumbnail is" before writing the story in a three-act structure — [Musicbed interview](https://www.musicbed.com/articles/filmmaking/youtube/the-biggest-mistake-filmmakers-make-with-colin-and-samir/). They also publish "16 Engaging Thumbnail Frameworks" — [Colin & Samir](https://courses.colinandsamir.com/16-engaging-thumbnail-frameworks). Paddy Galloway on ideation and packaging — [Colin & Samir resource](https://www.colinandsamir.com/resources/the-new-rules-of-youtube-from-paddy-galloway)

**Retention structure (long-form)**
- YouTube "Intro" metric = % still watching after **30 seconds**. A high value means the first 30 s "matched the viewer's expectation of the video's thumbnail and title." YouTube recommends changing the title and thumbnail to better reflect the content, or reworking the first 30 s — [YouTube Help, key moments](https://support.google.com/youtube/answer/9314415?hl=en)
- YouTube's retention-graph glossary: flat = watched through; gradual decline = losing interest; **spikes** = rewatched or shared (or confusing content); **dips** = skipped or abandoned. If top moments come late, "introduce the compelling content earlier." Requires a video ≥60 s with ≥100 views — [YouTube Help](https://support.google.com/youtube/answer/9314415?hl=en)
- MrBeast structure:
  - "As with almost every video on Youtube, the first minute has the most loss." They lost 21M of 60M viewers in minute 1, considered above average
  - Minutes 1–3: "transition from hype to execution… Stop telling people what they will be watching and start showing them"; "crazy progression"
  - A **3-minute re-engagement** (a spectacle that fits the story)
  - Minutes 3–6: "lots of quick scene changes and highly stimulating simple content"
  - Another re-engagement around the **6-minute** mark, then "back half" content
  - "Hook people at the start… have no dull moments" — [MrBeast PDF](https://cdn.prod.website-files.com/6623bf84e83241ec49b548e4/66edaa19db6e9359bb92931f_How-To-Succeed-At-MrBeast-Production%20(2).pdf)
- Third-party benchmark: "a good YouTube retention rate is about 30% average percentage viewed, or 60% past the first 30 seconds" — [vidIQ](https://vidiq.com/blog/post/increase-audience-retention-youtube/) (vendor rule of thumb, not YouTube data)

**First seconds (feeds and ads)**
- Meta/Nielsen (2016, video *ads*): up to 47% of campaign value was delivered in the first three seconds, and up to 74% in the first ~10 seconds — [Meta for Business, "Capture attention…"](https://www.facebook.com/business/news/updated-features-for-video-ads); [Meta "Value of video"](https://www.facebook.com/business/news/value-of-video). These are ad brand-lift metrics, not organic creator content, and the data is old.
- TikTok Marketing Science: 63% of the highest-CTR TikTok videos highlight the key message or product in the first three seconds — [Digiday sponsored (TikTok)](https://digiday.com/sponsored/how-brands-are-leveraging-tiktoks-tools-and-data-to-reach-new-audiences/); [TikTok creative best practices](https://ads.tiktok.com/business/en-US/blog/creative-best-practices-top-performing-ads). This is also ad data.
- YouTube Shorts "Viewed vs. Swiped away" is the feed-level hook metric — [vidIQ Shorts algorithm 2026](https://vidiq.com/blog/post/youtube-shorts-algorithm/); a non-peer-reviewed Medium analysis claims Shorts under 60% "viewed" performed poorly vs. 70–90% — [Medium](https://medium.com/@antoinelacombled/cracking-the-youtube-shorts-algorithm-a-study-of-3-3-billion-views-4711fdf7931b) (weak source)
- Claim to treat cautiously: "Shorts with an immediate hook in the first 2 seconds retain 19% more viewers" (attributed to "2025 Zebracat data", a vendor) — [virvid.ai](https://virvid.ai/blog/first-3-seconds-hook-faceless-shorts-2026)

**Audio quality → credibility**
- Newman & Schwarz (2018), *Science Communication*. Exp. 1: 97 participants, YouTube conference talks with good vs. degraded audio. Exp. 2: 99 participants, NPR Science Friday interviews. With poor audio, "viewers thought the talk was worse, the speaker less intelligent and less likeable and the research less important." The mechanism is processing fluency — [USC Dornsife summary](https://dornsife.usc.edu/news/stories/norbert-schwarz-research-links-sound-quality-belief/); [journal abstract](https://journals.sagepub.com/doi/abs/10.1177/1075547018759345); [PDF](https://gwern.net/doc/design/visualization/2018-newman.pdf)
- Replicated in another domain: low audio quality reduced credibility in a virtual-court study (Bild et al., 2021) — [APA PsycNet](https://psycnet.apa.org/record/2022-09218-008)

**Captions and silent viewing**
- "85% of Facebook video is watched without sound." This 2016 Digiday figure came from *publishers' own* Facebook data (e.g., LittleThings, Mic) in an autoplay-muted era; it's not a universal stat — [Digiday 2016](https://digiday.com/media/silent-world-facebook-video/); critique of overuse: [LinkedIn trace](https://www.linkedin.com/posts/gaurabofficial_85-of-video-is-watched-without-sound-activity-7524302740206948352-aKOU)
- Verizon Media/Publicis Media (2019, 5,616 US consumers aged 18–54): 69% watch with sound off in public and 25% in private; 80% of caption users aren't hearing-impaired; viewers say they're more likely to watch an entire video with captions — [Forbes](https://www.forbes.com/sites/tjmccue/2019/07/31/verizon-media-says-69-percent-of-consumers-watching-video-with-sound-off/); [StreamingMedia](https://www.streamingmedia.com/Articles/ReadArticle.aspx?ArticleID=131860) (self-reported survey)

**Pacing and visual change**
- Average shot length in English-language films fell from ~12 s (1930) to ~2.5 s (2014), per James Cutting's research — [Cutting et al. 2011, PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3485803/); [Wired 2014](https://www.wired.com/2014/09/cinema-is-evolving/). This is evidence of a cultural pacing trend, not of what performs on YouTube.
- Shot lengths are shortest at the climax and lengthen in the epilogue, so pacing should follow the narrative — [Cutting, academia.edu](https://www.academia.edu/35757004/On_shot_lengths_and_film_acts_A_revised_view)

### Inferences
- Correct a common beginner belief: "faster cuts = better". MrBeast pairs fast scene changes with *story* and *re-engagements*. YouTube's own guidance focuses on matching the promise, not editing speed. Pacing tools (jump cuts, punch-ins, B-roll) serve clarity and momentum.
- Prioritize audio over video for talking heads. There's peer-reviewed evidence for audio→credibility; I found no equivalent evidence that 4K vs. 1080p affects credibility.
- Burned-in captions are a reasonable default for short-form feeds, but the "85%" number shouldn't be cited as a current fact.

### Gaps
- I found no rigorous, public data on the optimal frequency of B-roll or visual changes for YouTube or short-form; claims like "change the visual every 3–5 s" are creator folklore.
- No independent study isolating sound design or SFX impact on retention.
- I didn't verify YouTube Creator Academy pages beyond the key-moments and CTR help articles.

---

## Q7. Standard pipeline (pre-production → production → post → publishing) and what beginners miss

### Takeaway
Pros start with packaging (idea + title + thumbnail) and structure the script around the first 30–60 seconds. They record with good audio first. Editing serves retention (hook, re-hooks, payoff). After publishing, they read the retention graph and A/B test packaging. Beginners most often skip packaging-first and post-publish analysis.

### Cited Findings
- Packaging first: "The creative process… starts with the title and thumbnail" — [Simon Willison on MrBeast guide](https://simonwillison.net/2024/Sep/15/how-to-succeed-in-mrbeast-production/). Colin & Samir define the idea, title and thumbnail before story-writing in three acts — [Musicbed](https://www.musicbed.com/articles/filmmaking/youtube/the-biggest-mistake-filmmakers-make-with-colin-and-samir/). Agency phrasing: "an idea you cannot package is usually an idea you should not film" — [WKND agency](https://wkndagency.com/blog/youtube-titles/)
- In MrBeast's guide, failure in the first minute is attributed to production basics: "wasn't well-lit, I didn't match the expectations of the clickbait, I didn't pre plan what I'd say, and we didn't front load some interesting stuff" — [MrBeast PDF](https://cdn.prod.website-files.com/6623bf84e83241ec49b548e4/66edaa19db6e9359bb92931f_How-To-Succeed-At-MrBeast-Production%20(2).pdf)
- Post-publish analysis: the retention report (intro / top moments / spikes / dips), segmented by new vs. returning viewers and subscribers; data takes 1–2 days to process — [YouTube Help](https://support.google.com/youtube/answer/9314415?hl=en). Packaging A/B tests run via Test & Compare — [YouTube Help](https://support.google.com/youtube/answer/16391400?hl=en)
- Delivery: platforms often ignore embedded subtitle tracks, so upload the SRT; also produce a 9:16 version — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing). appariciojunior's `youtube-export` skill covers deliver settings "without 25 GB files" — [repo](https://github.com/appariciojunior/video-editor-skills)
- A clean transcript is also used for descriptions, social posts and chapters: chrislema saves a `.md` transcript, and cutback lists "titles, descriptions, chapter markers" as Claude strengths — [chrislema](https://github.com/chrislema/videoeditor); [cutback.video](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)

### Inferences
- Suggested pipeline for the tutorial:
  - **Pre-production**: idea validation (outliers in your niche) → title + thumbnail mock → hook script for the first 30 s → outline with re-hooks → shot and B-roll list
  - **Production**: audio first (lav or shotgun mic, treated room), lighting, eye line, multiple takes of the hook, room tone
  - **Post-production**: ingest/backup → transcript → rough cut (retakes, silences) → pacing pass (punch-ins, B-roll, graphics) → sound (cleanup, loudness, music, SFX) → color → captions → thumbnail final → export
  - **Publish**: title, description, chapters, end screens, SRT, A/B test
  - **Analyze**: intro %, dips, CTR at 24–48 h
- Beginners typically miss: packaging before filming; matching the opening to the thumbnail promise; re-hooks; audio quality; reviewing retention dips; chapters and SRT uploads; making multiple hook takes.

### Gaps
- I didn't locate an official YouTube page on chapters' effect on retention or search.

---

## Q8. Content format taxonomy and editing needs

### Takeaway
Formats differ mainly in what drives the cut: speech (talking head, podcast clip, tutorial) or visuals (vlog, faceless B-roll, motion explainer). Speech-driven formats are where Claude Code automation is strongest today.

### Cited Findings
- Speech-driven formats (talking head, narrated screen recording, podcast) suit transcript editing. Visually driven ones (multicam, B-roll by look, action) do not — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- Screen-recording tutorials risk cutting an on-screen step that happened during a silence — [LaoZhang AI](https://blog.laozhang.ai/en/posts/claude-code-video-editing). seedprod's tool targets removing agent "thinking" dead time in screen recordings — [repo](https://github.com/seedprod/video-editor-for-claude-code)
- Podcast clips need diarization and speaker-based camera switching. Claude-only switching "switched cameras too fast" in a vendor test — [cutback.video](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)
- Vlog pacing skill covers "silence detection, pads, pause rules, room at scene edges, jump-cut zoom", and B-roll is cut "by action and story" — [appariciojunior](https://github.com/appariciojunior/video-editor-skills)
- Faceless / explainer / motion graphics: code-generated video (Remotion, HyperFrames, Manim); the awesome list has 76 explainer repos, 52 shorts/social and 9 avatar repos — [awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)
- Short-form: 9:16 crop, chunked burned captions (2–3 words), hook in the first seconds — [video-use](https://github.com/browser-use/video-use); [chrislema](https://github.com/chrislema/videoeditor); [TikTok via Digiday](https://digiday.com/sponsored/how-brands-are-leveraging-tiktoks-tools-and-data-to-reach-new-audiences/)

### Inferences (taxonomy table for the writer; synthesized, not sourced as a single list)

| Format | What drives the edit | Key editing needs | Claude Code fit |
|---|---|---|---|
| Talking head (long-form) | Speech | Retakes/silence removal, jump cuts and punch-ins, B-roll and graphics for re-hooks, captions optional, strong audio | High for rough cut and finishing |
| Vlog | Visuals + story | Selecting moments by look, music-driven pacing, B-roll sequencing, color | Low–medium (needs Gemini or human for selects) |
| Faceless / VO + B-roll | Script/VO | Stock sourcing (Pexels), matching visuals to lines, music/SFX, captions | Medium (stock search and assembly are automatable; picking by look is weak) |
| Short-form (Reels/TikTok/Shorts) | Hook + speech | 0–3 s hook, 9:16 reframe with face tracking, 2–3-word captions, tight pacing | High for clipping and captions; hook choice needs human taste |
| Screen-recording tutorial | Speech + screen | Dead time removal, zoom-ins on UI, callouts, chapters | Medium (transcript misses screen events) |
| Podcast clips | Speech, multi-speaker | Diarization, camera switching, highlight selection, captions | Medium (selection good, switching weak) |
| Explainer / motion graphics | Script + design | Remotion/HyperFrames/Manim animation, VO, timing to beats | High for generation, but defaults look generic without design direction |

### Gaps
- No authoritative industry taxonomy found; the table is a synthesis.

---

## Q9. Scorecard material: what AI (Claude Code) is good and bad at, per editing step

### Takeaway
Claude Code is strong wherever a step can be expressed as text, numbers or code (transcript decisions, ffmpeg chains, captions, loudness, code-based graphics, exports, metadata). It's weak wherever the decision is perceptual (visual quality, timing feel, B-roll aesthetics, multicam, music taste). The grades below combine the cited findings above.

### Cited Findings (evidence per step; grades are inferences)
- **Transcription**: mature (Whisper/WhisperX/Scribe), but word edges drift by roughly 100–500 ms — [LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing); [cutback](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)
- **Retake / blooper detection**: good from text (repeated sentences); can keep the wrong take — [LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- **Silence removal**: solved deterministically (auto-editor, silencedetect) — [auto-editor](https://github.com/WyattBlue/auto-editor); [chrislema](https://github.com/chrislema/videoeditor)
- **Highlight selection from long content**: poor without guardrails (mid-sentence cuts, wrong totals) — [cutback](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)
- **Jump cuts / punch-in zooms**: automatable with face detection — [chrislema](https://github.com/chrislema/videoeditor)
- **Captions**: strong — [video-use](https://github.com/browser-use/video-use); [LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- **Audio mastering / loudness**: strong via ffmpeg chains — [chrislema](https://github.com/chrislema/videoeditor). AI speech enhancement like Adobe Podcast is manual (no public API) — [Cleanvoice](https://cleanvoice.ai/adobe-podcast-api-alternative/)
- **Color**: preset grades are fine; color-critical work stays in the NLE — [video-use](https://github.com/browser-use/video-use); [LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- **Motion graphics**: strong (Remotion/HyperFrames) but generic by default; slow for HyperFrames in one bake-off — [awesome list](https://github.com/zhuyansen/awesome-claude-video-skills)
- **B-roll**: search and retrieval are automatable (Pexels API); choosing by look is weak; ButterCut Pro and video-use lack or limit multi-track B-roll — [Pexels](https://www.pexels.com/api/documentation/); [ButterCut](https://github.com/barefootford/buttercut); [LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- **Multicam / action selection**: poor — [cutback](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)
- **NLE assembly via MCP**: works as first-pass assembly, not judgment — [davinci-resolve-mcp via LaoZhang](https://blog.laozhang.ai/en/posts/claude-code-video-editing)
- **Packaging / metadata** (titles, descriptions, chapters): strong from transcript — [cutback](https://cutback.video/blog/claude-for-video-editing-in-2026-what-works-what-breaks-and-the-real-pipeline)

### Inferences
- Suggested grades:

| Step | Grade |
|---|---|
| Transcribe | A− (watch the drift) |
| Silence/filler removal | A |
| Retake selection | B+ |
| Story/highlight selection | C (needs approval loop) |
| Jump cuts/zoom | B |
| Captions | A |
| Audio cleanup/loudness | A− (noise repair B) |
| Color | B− (presets) / D (matching shots) |
| B-roll sourcing | B (search) / D (choosing by look) |
| Motion graphics | B+ (needs design direction) |
| Music/SFX placement | C+ |
| Multicam | D |
| Final taste/polish | D |
| Packaging copy | B+ |
| Thumbnails | not assessed |

### Gaps
- No independent, controlled evaluation exists. The grades synthesize vendor tests, READMEs and practitioner reports.
