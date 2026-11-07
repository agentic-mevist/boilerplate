# Rendering Layer and Compute Infrastructure for Programmatic / AI Video Editing

Research date: 2026-11-07. All prices are list prices as published on the cited pages on or around this date. Anything marked **(estimate)** is my own arithmetic or inference, not a sourced figure.

## How each renderer works (Remotion, HyperFrames, Manim, Motion Canvas/Revideo, Diffusion Studio/WebCodecs, MLT, GStreamer), speed and cost

### Takeaway
Most "code to video" renderers for AI agents work like a screenshot loop. They load a web page (Remotion: React; HyperFrames: plain HTML/CSS/GSAP; Revideo: canvas/TypeScript) in headless Chrome, move it to frame N, capture the pixels, and pipe the frames into FFmpeg to encode. Rendering is therefore mostly CPU work, and it parallelizes by splitting the video into chunks; Remotion Lambda and HyperFrames on Lambda/Cloud Run both do this. The newer option is in-browser rendering with WebCodecs (Remotion `@remotion/web-renderer`, Diffusion Studio Core, Descript), which moves encoding onto the user's own hardware encoder and costs the vendor nothing. Licensing is the main business difference. Remotion is source-available and needs a paid company license above 3 people ($0.01/render, $100/mo minimum for automation products). HyperFrames is Apache-2.0 with no per-render fees. Revideo is MIT. Diffusion Studio Core is free if the watermark stays, with a one-time license to remove it.

### Cited Findings

**Remotion (React → headless Chromium → FFmpeg; Lambda; licensing)**
- How Lambda rendering works: one "main" Lambda opens the deployed Remotion project in a headless browser, resolves props and duration, splits the video into chunks based on concurrency, and invokes one renderer Lambda per chunk. Renderer Lambdas stream binary chunks back with AWS Lambda Response Streaming, and the main function concatenates them and uploads the result to S3. — [Remotion: How Lambda works](https://www.remotion.dev/docs/lambda/how-lambda-works)
- The chunk-concatenation algorithm is "not a public API". Remotion says building your own distributed renderer "is hard, and not recommended for most". The workaround is to render chunks with `frameRange` and `audioCodec: "pcm-16"` and concatenate them with FFmpeg. Each chunk downloads every asset it references, so assets get downloaded many times in parallel. This can hit rate limits and adds bandwidth cost. — [Remotion: How Lambda works](https://www.remotion.dev/docs/lambda/how-lambda-works)
- Lambda suits videos under about 80 minutes at Full HD, the limit set by AWS's 15-minute function timeout. — [Remotion Lambda docs](https://www.remotion.dev/docs/lambda)
- Official cost examples (2048 MB Lambda, 10 GB disk, us-east-1, Remotion 4.0.381):
  - Hello World: about $0.001 (7.56 s warm / 11.02 s cold).
  - 1-minute video embedding a video file: $0.017 warm (18.91 s) / $0.021 cold (15.52 s).
  - 10-minute remote HD video: $0.103 warm (56.09 s) / $0.108 cold (60.98 s).
  - 10-second remote 4K video: $0.013 warm (45.28 s) / $0.014 cold (53.09 s).
  - "Rendering a video inside your video increases the cost significantly", and 4K "does significantly increase the time to render and therefore the cost."
  - Source: [Remotion: Lambda cost example](https://www.remotion.dev/docs/lambda/cost-example)
- The marketing page says "Concurrency up to 200x" and "Cost per minute from $0.013". — [Remotion Lambda landing page](https://www.remotion.dev/lambda)
- Remotion's comparison of server-side rendering options:
  - Lambda is fastest because it is the only option that distributes rendering. Vercel Sandbox, Cloud Run, and custom servers render on a single machine.
  - Lambda compute is more expensive than the other options. Cloud Run is cheaper because it has no distribution overhead. A long-running server has "by far the cheapest compute cost" but you pay for idle time.
  - Remotion's conclusion: "The more videos you render, the more a long-running server might be worth for you."
  - Remotion also documents Vercel Sandbox, Cloudflare Containers, and Azure Container Apps as render targets.
  - Source: [Remotion: Comparison of SSR options](https://www.remotion.dev/docs/compare-ssr)
- Tuning Lambda speed: lowering `framesPerLambda` raises concurrency but adds overhead, with diminishing returns. More memory scales CPU proportionally, so renders get faster while cost rises linearly. — [Remotion: Optimizing for speed](https://www.remotion.dev/docs/lambda/optimizing-speed)
- GPU: headless Chromium disables the GPU by default, which causes "a significant slowdown". The following benefit from a GPU (enabled with `--gl`):
  - WebGL content (Three.js, Skia)
  - video decoding
  - box-shadow and text-shadow
  - linear and radial gradients
  - `filter: blur()` and `drop-shadow()`
  - transforms
  - many 2D canvas operations

  "AWS Lambda instances have no GPU." — [Remotion: Using the GPU](https://www.remotion.dev/docs/gpu)
- Client-side rendering: `@remotion/web-renderer` has been stable since v4.0.491. It renders in the browser and "encodes with WebCodecs using Mediabunny instead of FFmpeg". It supports only a subset of HTML elements. It needs Chrome 94+, Firefox 130+, or Safari 26+. It always sends a telemetry event for every render. — [Remotion: Client-side rendering](https://www.remotion.dev/docs/client-side-rendering)
- License: free for individuals and companies of up to 3 people, including commercial use. Larger companies need a Company License:
  - "Remotion for Automators" (video editors, prompt-to-video apps, embedding the Player): $0.01 per render, $100/mo minimum (covers 10,000 renders).
  - "Remotion for Creators": $25/mo per seat.
  - Enterprise: from $500/mo.

  Source: [Remotion License & Pricing](https://www.remotion.dev/docs/license/pricing)

**HyperFrames (HeyGen)**
- What it is: "a free, open-source framework for turning HTML, CSS, media, and seekable animations into deterministic MP4 videos". It ships a CLI, agent skills (a Claude Code plugin among them), a Studio app, a catalog of about 450 blocks, and AWS Lambda rendering. Requirements are Node.js 22+ and FFmpeg. — [heygen-com/hyperframes README](https://github.com/heygen-com/hyperframes)
- How it renders: "The renderer seeks each frame in headless Chrome and encodes the result with FFmpeg." It is "Inspired by Remotion. Both tools render video with headless Chrome and FFmpeg. The main difference is the authoring model: Remotion's bet is React components; HyperFrames' bet is plain HTML." — [hyperframes README](https://github.com/heygen-com/hyperframes)
- License: "Apache 2.0 license, with no per-render fees or commercial-use thresholds", compared with Remotion's "Source-available Remotion License". — [hyperframes README](https://github.com/heygen-com/hyperframes); also [hyperframes.heygen.com](https://hyperframes.heygen.com/)
- Determinism mechanism: "Rendering never plays your video. It asks for one frame at a time." The time for a frame is computed as `time = floor(frame)/fps` with integer math and never read from a clock. GSAP timelines are paused and seeked, never played. Chrome's `HeadlessExperimental.beginFrame` captures the pixels atomically, then FFmpeg encodes and mixes the audio. Fonts and Chrome versions can shift output by a pixel between machines; `--docker` pins Chromium, fonts, and the FFmpeg encoder. — [HyperFrames: Deterministic Rendering](https://hyperframes.heygen.com/concepts/determinism.md)
- Docs say render "is seek-driven and takes one frame at a time", unlike preview, which plays in real time. — [HyperFrames: Deterministic Rendering](https://hyperframes.heygen.com/concepts/determinism.md)
- Render paths: local CLI, Docker, a Node "Producer", HyperFrames Cloud (bills HeyGen credits), your own AWS Lambda or Google Cloud Run (both distribute across workers), and hosted preview-plus-render templates for Vercel, Cloudflare, or Modal. — [HyperFrames: Choose a rendering path](https://hyperframes.heygen.com/deploy/overview.md); [FAQ](https://hyperframes.heygen.com/faq.md)
- `--gpu` is rejected for segmented (HLS) output "because GPU encoders ignore the forced-keyframe lock that fixed-length segments depend on". On Lambda, joining chunks adds keyframes. A local render "can use the computer's browser GPU". — [HyperFrames: Render from the command line](https://hyperframes.heygen.com/guides/rendering.md)
- Studio app Free plan: 5 cloud exports a month. Pro is $25/month with unlimited cloud exports. Local rendering is free. — [HyperFrames FAQ](https://hyperframes.heygen.com/faq.md)

**Revideo / Motion Canvas**
- Revideo is "a rendering engine for creating videos in code". Scenes are TypeScript generator functions. It offers headless `renderVideo()` that "runs anywhere Node and a headless browser run, including serverless platforms like Google Cloud Run", plus "Parallelized rendering — split a render across workers" and a React `<Player>` for preview, so one project drives both preview and final render. MIT license, anonymous PostHog render telemetry. It is now the engine behind Midrender; the repo appears to have moved to `midrender/revideo`. — [Revideo README](https://github.com/redotvideo/revideo)
- Revideo "inherits Motion Canvas's canvas-based rendering and adds a Node.js API that makes server-side render calls first-class." — [PkgPulse comparison (secondary)](https://www.pkgpulse.com/guides/remotion-vs-motion-canvas-vs-revideo-programmatic-video-2026)
- Design tradeoff from a Revideo/Remotion-adjacent HN discussion: "Rendering to the DOM lets you define animations using CSS, which most programmers are already familiar with" (Remotion and HyperFrames), whereas canvas rendering (Motion Canvas and Revideo) is imperative drawing. — [Hacker News thread](https://news.ycombinator.com/item?id=41112297)

**Diffusion Studio / WebCodecs in-browser engines**
- Diffusion Studio Core is "a browser based video engine… like a game engine that is optimized for video". It "takes advantage of Canvas2DContext and the WebCodecs API to tap directly into hardware accelerated processing in the browser". It has an interactive playback mode and a "high fidelity rendering mode". It requires COOP/COEP headers for SharedArrayBuffer. Licensing: free with a "Made with Diffusion Studio" watermark; a one-time license key removes it and is verified offline. — [diffusionstudio/core README](https://github.com/diffusionstudio/core)
- The company now positions itself as "AI Video Editor for Agents: Edit videos with Claude Code, Codex, or Cursor." — [diffusion.studio](https://diffusion.studio/)

**Manim**
- Manim Community's default renderer is Cairo, which is CPU-based. One tutorial says that with Cairo "it can take minutes or even hours to render a single animation", and that switching to the OpenGL renderer speeds things up greatly. — [slama.dev Manim tutorial](https://slama.dev/manim/opengl-and-interactivity/)
- The OpenGL renderer is "significantly faster for 3D" but may need scene changes. Cairo and OpenGL feature parity is a known issue. — [Reddit r/manim](https://www.reddit.com/r/manim/comments/1t59d7y/how_can_i_make_3d_scenes_render_faster_in_manim/); [ManimCommunity discussion #1400](https://github.com/ManimCommunity/manim/discussions/1400); [Manim deep dive docs](https://docs.manim.community/en/stable/guides/deep_dive.html)

**Speed in "x realtime"** (computed from Remotion's official numbers)
- A 10-minute HD video rendered on Lambda in about 56–61 s, roughly 10x realtime, at about $0.01 per output minute. **(estimate)**
- The 1-minute video-in-video rendered in about 16–19 s, roughly 3–4x realtime, at about $0.017–0.021 per minute. **(estimate)**
- The 10-second 4K clip took about 45–53 s, roughly 0.2x realtime, meaning slower than realtime even with parallelism. **(estimate)**
- Source for all three: [Remotion cost example](https://www.remotion.dev/docs/lambda/cost-example)

**Hosted render APIs (for price comparison)**
- Shotstack charges per rendered minute: 20¢/min pay-as-you-go, then 15.6¢ (Starter, $39/mo for 250 min), 13.2¢ (Pro, $99/mo for 750 min), 10¢ (Scale, $199/mo for 2,000 min), and 5¢ (Volume, $499/mo for 10,000 min). Usage is counted by the second. AI generation (image, video, voice, music) is charged separately. — [Shotstack pricing](https://shotstack.io/pricing/)
- Creatomate starts at $54/month for 2,000 credits; credits per minute depend on resolution and fps. — [Creatomate pricing](https://creatomate.com/pricing); [Creatomate: credit calculation](https://creatomate.com/docs/account/how-are-credits-calculated)
- Rendi (FFmpeg-as-a-service) prices by GB processed (input plus output size):
  - Free: 4 vCPUs, 50 GB/mo, 1-minute command limit.
  - Pro: $25/mo for 4 vCPUs, 250 GB, 10-minute commands. Extra processing is $0.10/GB.
  - Scales up to 256 vCPUs for $1,600/mo.
  - Source: [Rendi pricing](https://www.rendi.dev/pricing)
- RenderIO (FFmpeg API) charges per command: $12/mo for 500 commands, $99/mo for 20,000. — [RenderIO pricing](https://renderio.dev/pricing)

### Inferences
- In plain words: Remotion and HyperFrames are web pages that get photographed one frame at a time. Every frame costs a full browser paint plus a screenshot, which is why they are slower and pricier per minute than a plain FFmpeg cut. They are much better for animated graphics, captions, and overlays.
- For a talking-head editor where most of the output is source footage, it is cheaper to do cuts and concatenation in FFmpeg and use HTML renderers only for overlay layers (titles, captions, B-roll cards), composited afterwards. This matches what Kapwing does with FFmpeg filter graphs (see the SaaS architecture findings below).
- Cost per output minute spans two orders of magnitude:
  - Self-run Lambda for simple content: about $0.01–0.02/min.
  - Shotstack: $0.05–0.20/min.
  - Remotion license: $0.01 per render on top of compute.

  For an AI editor that re-renders many drafts, render count matters more than minutes. Remotion's per-render fee would apply to every draft render unless drafts use the Player or client-side preview. Whether preview renders count is not verified here.
- HyperFrames is the more permissive choice for a commercial product (Apache-2.0). Remotion has the more mature distributed renderer.

### Gaps
- I found no independent, reproducible fps benchmarks for HyperFrames, Revideo, Motion Canvas, or Manim on comparable hardware. Speed figures above come only from Remotion's own docs.
- I did not research MLT/Shotcut (`melt`) or GStreamer in depth this session. Both are native C/C++ pipeline frameworks (MLT is used by Shotcut and Kdenlive; GStreamer is a plugin pipeline) that avoid the browser-screenshot overhead, but I did not fetch sources or speed numbers.
- Whether Remotion's $0.01/render applies to client-side (`web-renderer`) renders is not confirmed. The docs say telemetry is always sent, which suggests metering.

## FFmpeg basics in simple words, codecs, and hardware encoders

### Takeaway
FFmpeg is a pipeline: open the file (demux), unpack compressed frames to raw pictures (decode), change them (filter: scale, overlay, text), recompress (encode), and write a file (mux). If you change nothing about the pictures you can "stream copy" (`-c copy`), which is nearly instant because it only copies bytes. But it can only cut cleanly at keyframes, so cuts land up to several seconds off. Anything that changes pixels (captions, zooms, overlays, frame-accurate cuts) forces a decode and re-encode, which is where the CPU or GPU time goes. Hardware encoders (NVENC, VideoToolbox, QSV, AMF) are much faster with slightly lower quality per bit than x264 slow presets. Filters and scaling usually still run on the CPU unless you build a GPU-only pipeline.

### Cited Findings
- FFmpeg's documented processing model is: demuxer → decoder → filtergraph → encoder → muxer. Streams can skip decode, filter, and encode entirely with stream copy. — [ffmpeg.org documentation (ffmpeg.html "Detailed description")](https://ffmpeg.org/ffmpeg.html)
- Keyframes and GOP in plain words: video is compressed into key frames (I-frames, a full picture like a JPEG) and in-between frames (P/B-frames) that store only differences from neighbouring frames. Encoding is "compute intensive but also highly parallelizable. An increase in compute cores will lead to a corresponding decrease in encoding speed [time]." — [Kapwing engineering blog](https://www.kapwing.com/blog/how-we-built-it-scaling-to-100k-projects-a-day/)
- Seeking: `-ss` before `-i` (input seeking) parses by keyframe and is very fast. Since FFmpeg 2.1 it is also frame-accurate when transcoding, but not when stream copying. libx264's default GOP is 250 frames, which is "1 keyframe every 10 s if 25 FPS". — [FFmpeg wiki: Seeking](https://trac.ffmpeg.org/wiki/Seeking)
- "There is no way to precisely cut a video with FFmpeg if you need to cut outside an I-frame without re-encoding." — [Video StackExchange](https://video.stackexchange.com/questions/16750/using-ffmpeg-to-cut-videos-with-more-precision-than-key-frames-allow)
- MP4/MOV edit lists can sometimes give frame-accurate cuts without re-encoding, depending on the player. The common hybrid "smart cut" re-encodes only the GOP around the cut point and stream-copies the rest. — [Reddit r/ffmpeg](https://www.reddit.com/r/ffmpeg/comments/1qag2ug/trimming_video_without_reencoding/); [dev.to: frame-accurate trimming](https://dev.to/masonwritescode/frame-accurate-ffmpeg-trimming-without-re-encoding-the-whole-file-kgc)
- x264 quality knob: CRF ranges 0–51 with a default of 23. 17–18 is "visually lossless or nearly so". +6 CRF roughly halves the file size. Presets trade speed for compression efficiency. — [FFmpeg wiki: H.264](https://trac.ffmpeg.org/wiki/Encode/H.264)
- NVIDIA NVENC encodes H.264, HEVC, and AV1; NVDEC decodes MPEG-2, VC-1, H.264, HEVC, VP8, VP9, and AV1. With Blackwell, "AV1 encoding on NVIDIA Blackwell NVENC [is] comparable to software AV1 encoding with ~3X throughput" (UHQ mode), and NVDEC doubles H.264 decode throughput and adds 4:2:2. — [NVIDIA Video Codec SDK](https://developer.nvidia.com/video-codec-sdk)
- Quality vs speed:
  - "x264 leads on quality-per-bitrate but is CPU-heavy; NVENC is fast… and now nearly matches x264." — [Sephora Systems benchmark](https://sephorasystems.com/journal/encoding-benchmark-x264-nvenc-quicksync-compared)
  - OBS forum users report NVENC comparable to the x264 "slow" preset. — [OBS forum](https://obsproject.com/forum/threads/x264-or-nvenc.138619/)
  - A 2026 Fora Soft benchmark (search snippet only; the page blocked fetching) reports NVENC AV1 saving about 38–40% bitrate at roughly 400–480 fps. Treat as unverified. — [Fora Soft encoder comparison](https://www.forasoft.com/learn/video-quality/articles-vqm/encoder-comparison-x264-x265-svt-av1)
- Apple Silicon media engines: M1 Pro/Max added hardware H.264, HEVC, ProRes, and ProRes RAW, a video decode engine, "up to two video encode engines", and "up to two ProRes encode/decode engines". Max chips have two of each, Pro chips one. Performance is "roughly the same" across M1, M2, and M3 generations. FFmpeg uses these through VideoToolbox (`h264_videotoolbox`, `hevc_videotoolbox`). — [Channels community (Apple spec recap)](https://community.getchannels.com/t/apple-silicon-media-engine-launched-in-m1-pro-and-m1-max-macbook-pro-laptops/29406); [Macfinder M2 Pro test](https://macfinder.co.uk/blog/m2-pro-plex-apple-silicon-media-engine-test/); [Softron KB](https://softron.zendesk.com/hc/en-us/articles/11209248309020-About-Apple-Silicon-Computers-Hardware-Accelerators); [Apple discussions](https://discussions.apple.com/thread/255203215)
- Memory per frame: a decoded 4K frame is about 33 MB, "and at 30 frames per second, that's nearly 1GB per second". This is why copying frames between the CPU and GPU is a bottleneck. — [Descript engineering](https://www.descript.com/blog/article/the-new-descript-how-we-multiplied-the-apps-speed-and-performance)
- Kapwing finds GPUs "of minimal utility to most video encoders" in their setup. Most of their compute is FFmpeg subprocesses with "typically 16 threads each", and they keep a GPU cluster only for jobs like background removal. — [Kapwing engineering blog](https://www.kapwing.com/blog/how-we-built-it-scaling-to-100k-projects-a-day/)

### Inferences
- Plain-language summary of codecs:
  - **H.264**: plays everywhere. The default for social delivery.
  - **H.265/HEVC**: about the same quality at a smaller file. Patchier support in browsers.
  - **AV1**: smallest files, royalty-free, slow to encode in software. Fast on recent NVENC, Intel, and Apple hardware.
  - **ProRes**: huge files, very fast to decode and edit. An intermediate or master format, not for delivery.

  These are general knowledge consistent with the sources above. Exact efficiency percentages were not verified here.
- What runs on CPU and what runs on GPU in a typical FFmpeg pipeline (general practice; specific benchmarks are a gap):
  - Decode and encode can run on GPU (NVDEC/NVENC, VideoToolbox, QSV, AMF).
  - Most filters (`drawtext`, `overlay`, `subtitles`, `scale`, `crop`, `eq`) run on CPU by default.
  - GPU variants exist (`scale_cuda`, `scale_npp`, `overlay_cuda`, `scale_vt`), but mixing CPU filters with GPU decode forces frame copies that can erase the gain.
- For an agent-driven editor, the key design choice is to stream-copy whenever possible (rough cuts, concatenating same-codec clips) and re-encode only the segments that change. That is both the main cost lever and the main innovation lever.

### Gaps
- No primary-source fps numbers for NVENC, QSV, AMF, or VideoToolbox versus x264 at matched quality on 1080p talking-head content. Community benchmarks vary widely by preset and GPU generation.
- AMD AMF and Intel QSV were not researched beyond their mention in benchmark titles.

## Hardware needs, cloud costs, and transcription compute

### Takeaway
A 10-minute 1080p talking-head edit is a light job. One modern 4–8 core machine with 8–16 GB RAM and a few GB of free disk can re-encode it in minutes on CPU, and faster with a hardware encoder. 4K about quadruples pixel work and memory per frame. GPUs matter mainly for (a) AI models such as transcription, background removal, and generation, (b) WebGL-heavy motion graphics in headless Chrome, and (c) high-throughput hardware encoding. Cloud CPU is cheap (Modal about $0.047 per physical-core-hour; Lambda about $0.01–0.02 per output minute for simple Remotion renders). Small GPUs cost about $0.59–1.10/hr (T4/L4/A10 on Modal). Transcription is no longer a bottleneck: faster-whisper transcribes 13 minutes of audio in about 16–17 s on a consumer GPU, or about 51 s on an 8-thread CPU with the small model.

### Cited Findings
- **Modal pricing** (per second, preemptible list prices):

  | Resource | Price per second | Approx. per hour **(estimate)** |
  |---|---|---|
  | T4 | $0.000164 | ~$0.59 |
  | L4 | $0.000222 | ~$0.80 |
  | A10 | $0.000306 | ~$1.10 |
  | L40S | $0.000542 | ~$1.95 |
  | A100 40GB | $0.000583 | ~$2.10 |
  | H100 | $0.001097 | ~$3.95 |
  | CPU (per physical core = 2 vCPU) | $0.0000131 | ~$0.047 |
  | Memory (per GiB) | $0.00000222 | ~$0.008 |

  "Sandboxes are billed at non-preemptible rates of 3x list price." The non-preemptible sandbox CPU rate is $0.00003942 per core per second. — [Modal pricing](https://modal.com/pricing); per-hour conversions corroborated by [computeprices.com](https://computeprices.com/providers/modal)
- **Remotion Lambda per-minute cost**: about $0.01/min for a 10-minute HD video and about $0.017–0.021 for a 1-minute video-in-video (see the renderer section above). — [Remotion cost example](https://www.remotion.dev/docs/lambda/cost-example). Lambda has no GPU. — [Remotion: Using the GPU](https://www.remotion.dev/docs/gpu)
- **AWS G4dn** instances have NVIDIA T4 GPUs, are "the lowest cost GPU-based instances in the cloud for machine learning inference", and support NVENC. Up to 8 T4s, 96 vCPUs, and 1.8 TB NVMe. — [AWS EC2 G4](https://aws.amazon.com/ec2/instance-types/g4/)
- **Remotion GPU in the cloud**: Remotion documents "GPU in the cloud (bare)" and "GPU in the cloud (Docker)" setups for server-side rendering with `--gl`. — [Remotion: Using the GPU](https://www.remotion.dev/docs/gpu)
- **Transcription (faster-whisper README, 13 minutes of audio)**:
  - GPU (RTX 3070 Ti 8GB, large-v2):
    - openai/whisper fp16: 2m23s
    - faster-whisper fp16: 1m03s
    - faster-whisper batched (bs=8) fp16: 17 s (6.1 GB VRAM)
    - faster-whisper batched int8: 16 s
  - CPU (Intel i7-12700K, 8 threads, small model):
    - openai/whisper: 6m58s
    - whisper.cpp: 2m05s
    - faster-whisper int8: 1m42s
    - faster-whisper batched int8: 51 s (3.6 GB RAM)
  - Source: [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- An older benchmark reported original Whisper large-v2 at 4m30s for 13 minutes of audio on a Tesla V100S. — [Nikolas' blog](https://nikolas.blog/making-openai-whisper-faster/)
- RunPod measured Whisper across 23 GPUs: "Speed varies 2x, cost varies 24x" per hour of audio. — [RunPod: Best GPU for Whisper](https://www.runpod.io/articles/guides/best-gpu-for-whisper)

### Inferences
- **Sizing a 10-minute talking-head edit (all estimates, my arithmetic):**
  - **Source file size:** phone or camera 1080p H.264/HEVC at roughly 10–50 Mbps is about 0.75–3.75 GB for 10 minutes. 4K at about 100 Mbps is about 7.5 GB.
  - **Disk:** budget 3–4x the source size for source, proxies, and output. That is about 10–15 GB for 1080p and 30+ GB for 4K. Claude Code cloud sessions (30 GB disk per the brief) are enough for 1080p and tight for multi-take 4K.
  - **RAM:** a decoded 1080p frame is about 8 MB (a quarter of Descript's 33 MB 4K figure). FFmpeg filter graphs buffer only a handful of frames, so 4–8 GB is comfortable. Headless Chrome plus FFmpeg render workers need roughly 1–2 GB each; Remotion defaults Lambda to 2 GB.
  - **CPU:** encoding scales with cores (per Kapwing). On 4 vCPUs, x264 "medium" at 1080p30 typically runs faster than realtime, so 10 minutes takes on the order of 3–10 minutes. This is unverified; benchmark before relying on it. Hardware encoders would be several times faster.
  - **GPU:** not needed for cut, caption, and encode work. It is useful for Whisper large models, background removal or other AI effects, and WebGL-heavy graphics.
- **Transcription cost:** with large-v2 on a T4 or L4-class GPU at roughly 40–50x realtime (scaled from the 3070 Ti batched result), a 10-minute video takes about 15–30 s, or about $0.005 of GPU time on Modal at L4 rates, before cold-start overhead. On a 4-vCPU sandbox, faster-whisper small int8 batched should run in about 1–2 minutes for 10 minutes of audio. These scalings are estimates.
- Apple Silicon Macs are strong local rendering machines. VideoToolbox H.264/HEVC/ProRes encode runs on dedicated media engines while the CPU handles filters or Chrome. This is an argument for local or desktop rendering for creators who own Macs.

### Gaps
- I did not fetch AWS EC2 on-demand $/hr for g4dn, g5, or g6 (the AWS pricing page renders prices through JavaScript). Commonly cited figures (about $0.53/hr for g4dn.xlarge) are unverified here.
- I did not fetch the AWS Lambda GB-second price directly (also rendered dynamically). Use Remotion's measured costs instead.
- I did not verify Replicate or Fly.io GPU pricing.
- I found no primary benchmark for x264 versus NVENC fps on 4-vCPU cloud instances specifically.

## Sandboxes for rendering, and how video SaaS companies architect rendering

### Takeaway
Agent sandboxes can render, but they are general-purpose CPU boxes. E2B is CPU-only by design. Cloudflare Containers top out at 4 vCPU, 12 GiB, and 20 GB disk. Claude Code cloud sessions have 4 vCPU, 16 GB, 30 GB, and no GPU. Daytona and Modal offer GPU sandboxes, but Modal bills sandboxes at 3x list. The real bottlenecks are moving multi-GB media in and out and paying sandbox premiums for long encodes. Production video SaaS splits the work:
- **Kapwing:** renders server-side with FFmpeg on autoscaled GCP clusters. Low-res proxies are used for preview and originals for the final output.
- **Descript:** moved decode, composite, and encode into the browser with WebCodecs and WebGL (2–3x faster 4K exports), and keeps a server-side "Media Transform Server" to normalize uploads.
- **Shotstack and Rendi:** sell server-side rendering per minute or per GB.

The sensible pattern is: the agent plans and edits in a sandbox, while heavy final renders go to a purpose-built render backend (Lambda, Cloud Run, a GPU worker, or the user's own browser or Mac).

### Cited Findings
- **E2B**: "No. E2B sandboxes are CPU-only… sized by vCPU and RAM only… no GPU option in the SDKs, CLI, API, or a template definition. BYOC does not change this." — [E2B docs: GPU support](https://docs.e2b.dev/faq/gpu-support)
  - A conflicting E2B marketing page mentions sandboxes with "up to 8 GPUs" (search snippet). This appears to be a comparison table of other vendors; the official FAQ is authoritative. — [E2B resources page](https://e2b.dev/resources/best-code-execution-sandboxes-for-ai-agents)
- **Daytona**: offers GPU sandboxes with "full GPU passthrough, with up to 8 dedicated GPUs… via VFIO" (H100, H200, B200, B300, RTX, MI355), alongside container sandboxes that start in under 90 ms, VM sandboxes, and macOS sandboxes. Each GPU adds up to 16 vCPUs and 192 GB. — [Daytona sandboxes docs](https://www.daytona.io/docs/en/sandboxes/); [Daytona GPU sandboxes](https://www.daytona.io/dotfiles/gpu-sandboxes)
- **Modal**: GPU and CPU per-second billing; sandboxes at 3x list price (non-preemptible). — [Modal pricing](https://modal.com/pricing)
- **Cloudflare Containers**:
  - Largest instance (standard-4) is 4 vCPU, 12 GiB, and 20 GB disk. Custom instances are capped at the same limits, with at least 3 GiB per vCPU.
  - Account limits are 1,500 concurrent vCPU and 6 TiB memory.
  - Outbound HTTP request bodies through the outbound handler are limited to 100 MB.
  - Billed per 10 ms of active running: $0.000020 per vCPU-second, $0.0000025 per GiB-second of memory, $0.00000007 per GB-second of disk.
  - Egress is $0.025/GB in North America and Europe, with 1 TB included.
  - Sources: [Cloudflare Containers limits](https://developers.cloudflare.com/containers/platform/limits/); [Cloudflare Containers pricing](https://developers.cloudflare.com/containers/platform/pricing/)
- Remotion officially documents Vercel Sandbox and Cloudflare Containers as render targets. Vercel Sandbox has "longer cold starts due to VM provisioning, installing system dependencies and downloading a browser on each render", and Vercel functions run for up to 800 s. — [Remotion: Comparison of SSR options](https://www.remotion.dev/docs/compare-ssr)
- **Claude Code cloud sessions**: 4 vCPU, 16 GB RAM, 30 GB disk, no GPU (per the task brief; not independently fetched).
- **Kapwing architecture** ("browser-based, cloud-based video editor", 100k+ projects/day):
  - "Kapwing processes the vast majority of our videos on our servers. Client-side processing is reserved for images and for very small jobs."
  - Their reasoning: server cores outscale laptops, and a server-side setup means fewer environments to validate. The downsides are network latency for small jobs and price.
  - On ingestion, they create preview-optimized versions, but "the files used to process a user's final video will always be the original high-quality inputs". This is a proxy workflow.
  - The pipeline downloads and preprocesses layers, splices them in an FFmpeg filter complex, then combines scenes. They use the concat demuxer to avoid re-encoding where possible, and render subtitles as PNGs overlaid via the filter complex for fidelity with the frontend.
  - Infrastructure: GCP autoscaled clusters (standard, premium with more cores, a GPU cluster for background removal, and a canary cluster taking 10–15% of jobs). FFmpeg subprocesses use about 16 threads each.
  - Source: [Kapwing: Scaling to 100k+ projects a day](https://www.kapwing.com/blog/how-we-built-it-scaling-to-100k-projects-a-day/)
- **Descript architecture**:
  - They rebuilt the media engine on WebCodecs (zero-copy hardware decode and encode into WebGL/WebGPU), WebGL compositing, and WebAssembly (libav.js, a sponsored WASM FFmpeg port) for demuxing and audio decoding.
  - "Everything streams from the cloud." Users see "two to three times faster 4K exports on average."
  - The previous Electron path (native FFmpeg via Beamcoder, then copied into WebGL) "effectively limited us to 720p playback on the average computer."
  - The new "Media Transform Server" transcodes user files into a consistent format server-side instead of on the user's machine.
  - They list cloud GPU rendering (streaming composited frames to the user) as "perhaps the most expensive approach", because it needs a dedicated cloud machine per active user.
  - Source: [Descript engineering blog](https://www.descript.com/blog/article/the-new-descript-how-we-multiplied-the-apps-speed-and-performance)
- **Rendi's model** prices on GB processed (input plus output), which directly reflects that file I/O is the main cost driver for FFmpeg-as-a-service. — [Rendi pricing](https://www.rendi.dev/pricing)

### Inferences
- **Are sandboxes good for rendering?**
  - They are fine for short or simple renders, previews, FFmpeg cuts, and running the agent's tools.
  - They are poor as the main production render farm, for four reasons:
    1. Most have no GPU (E2B, Cloudflare, Claude Code cloud).
    2. Instances are small (4 vCPU) and disks are small (20–30 GB).
    3. The premium is high (Modal sandboxes at 3x list).
    4. Every job pays to upload multi-GB source footage. For example, 3 GB at 100 Mbps takes about 4 minutes, longer than the encode itself **(estimate)**.
- A good architecture keeps media in object storage (S3 or R2) near the render workers. The agent's sandbox manipulates a lightweight edit description (EDL, JSON timeline, or HTML composition) and low-res proxies, then submits the final render to Lambda, Cloud Run, Modal, or a GPU worker that pulls originals directly from storage.
- Client-side rendering (WebCodecs) is the cheapest for the vendor (compute is free, per Kapwing's own cost logic) and is now production-proven by Descript. It is limited by browser support, user hardware, and upload of the result. A product could offer browser export by default and cloud export as a paid fallback.

### Gaps
- I found no primary engineering posts from CapCut, Canva, or Veed on their render architecture in this session. Search turned up only third-party WebCodecs tutorials.
- I have no measured upload/download throughput for E2B, Daytona, or Claude Code cloud sessions.
- Shotstack, Creatomate, and Descript server-side render internals (instance types, GPU use) are not published in sources I found.

## Innovation opportunities

### Takeaway
The render layer is still mostly "screenshot every frame, then re-encode everything", so there is real room to innovate:
1. **Incremental re-rendering**: re-encode only the GOPs or chunks touched by an edit and stream-copy the rest. Remotion already chunks on Lambda but keeps concatenation private.
2. **Caching** frames and chunks keyed by content hash, which deterministic renderers like HyperFrames make possible.
3. **Proxy preview vs final render** tiers.
4. **Browser-side WebCodecs export** to move compute to users.
5. **Agent-native render APIs** that accept an edit description and return verification artifacts: frame grabs, re-transcription of the output, and diffs.
6. **Cost-aware routing**: stream copy, then CPU, then NVENC, then distributed.

### Cited Findings
- Distributed chunked rendering already exists:
  - Remotion Lambda splits by concurrency, but "seamless concatenation of chunks is not a public API". — [Remotion: How Lambda works](https://www.remotion.dev/docs/lambda/how-lambda-works)
  - HyperFrames on Lambda and Cloud Run distributes across workers. Joining chunks adds keyframes, and GPU encoders ignore forced-keyframe locks. — [HyperFrames rendering guide](https://hyperframes.heygen.com/guides/rendering.md); [deploy overview](https://hyperframes.heygen.com/deploy/overview.md)
  - Revideo has "parallelized rendering — split a render across workers". — [Revideo README](https://github.com/redotvideo/revideo)
- Determinism, the precondition for caching and incremental re-renders: HyperFrames renders "same input, same frames, same output. Built for CI, regression tests". Frame time comes from integer math; Docker pins Chromium, fonts, and FFmpeg. — [HyperFrames determinism](https://hyperframes.heygen.com/concepts/determinism.md); [README](https://github.com/heygen-com/hyperframes)
- Asset duplication is a known inefficiency: each Lambda chunk re-downloads all referenced assets, and an API to avoid S3 bandwidth charges is "planned". — [Remotion: How Lambda works](https://www.remotion.dev/docs/lambda/how-lambda-works)
- Stream-copy concatenation as a cost lever: Kapwing pre-combines layers with the concat demuxer "which does not require re-encoding" to "significantly reduce the total processing". — [Kapwing](https://www.kapwing.com/blog/how-we-built-it-scaling-to-100k-projects-a-day/)
- Smart-cut (re-encode only the GOP around a cut, stream-copy the rest) is a known technique. Precise cuts otherwise require re-encoding. — [dev.to: frame-accurate trimming](https://dev.to/masonwritescode/frame-accurate-ffmpeg-trimming-without-re-encoding-the-whole-file-kgc); [FFmpeg wiki: Seeking](https://trac.ffmpeg.org/wiki/Seeking)
- Browser-side rendering is maturing:
  - Remotion web-renderer is stable since v4.0.491. — [Remotion client-side rendering](https://www.remotion.dev/docs/client-side-rendering)
  - Diffusion Studio Core uses WebCodecs for hardware acceleration. — [diffusionstudio/core](https://github.com/diffusionstudio/core)
  - Descript reports 2–3x faster 4K exports via WebCodecs. — [Descript](https://www.descript.com/blog/article/the-new-descript-how-we-multiplied-the-apps-speed-and-performance)
- Agent-first tooling is the current competitive frontier:
  - HyperFrames ships agent skills and a Claude Code plugin with a "lint, preview, and render" loop, plus frame-by-frame verification skills (`/remotion-to-hyperframes`, `/reverse-any-video`). — [HyperFrames README](https://github.com/heygen-com/hyperframes)
  - Diffusion Studio markets "Edit videos with Claude Code, Codex, or Cursor." — [diffusion.studio](https://diffusion.studio/)
  - Descript offers an "API + MCP" to edit video from an AI assistant. — [Descript site nav on engineering blog page](https://www.descript.com/blog/article/the-new-descript-how-we-multiplied-the-apps-speed-and-performance)
- Hardware AV1 is now near software quality at about 3x throughput on Blackwell NVENC, which opens cheap high-efficiency delivery encodes. — [NVIDIA Video Codec SDK](https://developer.nvidia.com/video-codec-sdk)
- Transcription is cheap and fast enough to run on every render as a check (faster-whisper batched: 13 min of audio in about 16–17 s on a consumer GPU). — [faster-whisper](https://github.com/SYSTRAN/faster-whisper)

### Inferences
Each idea below is an inference from the findings above, not a sourced claim.
- **Incremental rendering for talking-head edits:** most AI edits (remove filler words, tighten pauses, swap a caption) change small spans. A renderer that keeps the last output segmented at fixed GOPs, maps timeline changes to affected segments, and re-encodes only those could cut re-render cost and latency by roughly an order of magnitude for iterative agent loops **(estimate)**. Remotion and HyperFrames already have the chunking pieces but do not expose this.
- **Content-addressed render cache:** hash (composition HTML, props, frame range, renderer version) to cache encoded chunks. Deterministic engines make this safe, and it fits agent workflows where many drafts differ slightly.
- **Two-tier render:**
  - Preview tier: 540p proxies, fast presets, CPU or in-browser, seconds.
  - Final tier: originals, quality presets, distributed or GPU.

  Kapwing already separates preview proxies from final originals.
- **Agent-friendly render API:** accept a declarative timeline or EDL instead of raw FFmpeg strings. Return structured results: per-chunk status, keyframe-snapped cut warnings, thumbnails at cut points, loudness stats, and an automatic re-transcription diff that confirms the words that should be gone are gone. This turns rendering into a verifiable tool call. FFmpeg-as-a-service products (Rendi, RenderIO) currently sell raw command execution priced by GB or command.
- **Cost routing:** pick the cheapest path per job:
  1. stream copy, nearly free
  2. CPU re-encode in the sandbox
  3. hardware encoder
  4. Lambda fan-out

  Base the choice on edit type and deadline, and show the user the cost or time tradeoff.
- **Overlay-only HTML rendering:** render only the graphic or caption layers through headless Chrome (transparent ProRes 4444 or WebM alpha) and composite them over stream-copied or lightly re-encoded footage in FFmpeg. This avoids paying browser-screenshot cost for every frame of the talking head.
- **Local-first rendering on creators' Macs:** VideoToolbox and the ProRes engines make local final renders fast and free. A desktop companion or browser export could remove most server render cost.

### Gaps
- I found no published product or paper that offers GOP-level incremental re-rendering for programmatic editors. This is either an open opportunity or something I did not discover. Worth a targeted search, for example "smart rendering" in Premiere/Resolve and LosslessCut's smart cut.
- I have no data on what share of AI-editor renders are drafts versus finals, which determines the value of caching and incremental rendering.
- WebGPU-based compositing performance relative to WebGL or server FFmpeg was not benchmarked in any source found.
