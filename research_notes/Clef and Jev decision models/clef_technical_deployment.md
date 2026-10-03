# Clef and Clef-flash: model size, compute weight, deployment options, Workers AI API, and a live latency test

*Researched 2026-10-03, two days after the 2026-10-01 announcement. All model facts come from live sources fetched today. Numbers marked "estimate" are my own arithmetic, with the math shown. The live test made 30 calls to the Workers AI run endpoint from a container whose traffic enters Cloudflare at IAD (Ashburn, Virginia). Raw requests, responses, headers and timings are in `live_test/` (subfolders `live/`, `payloads/`, `hf_clef/`, `hf_clef-flash/`, `quants/`, `docs/`, `evals/`).*

## 1. Model facts from Hugging Face: parameters, files, dtypes, license, inference code, base models, quantizations, adoption

### Takeaway
Clef has **27.48B parameters** in total: a 27.36B backbone derived from Qwen3.8-27B (including a 0.46B vision encoder) plus a 0.128B "joint schema head". It ships as **55.0 GB of BF16 safetensors**. Clef-flash has **9.53B parameters** (a 9.41B Qwen3.5-9B-derived backbone including a 0.456B vision encoder, plus a 0.122B head) in **19.1 GB of BF16**. Both are Apache-2.0. The rank-256 LoRA is already merged into the backbone, so it adds no parameters at inference. The decision head is custom Python, not a standard transformers or vLLM architecture. The community published 35 quantizations within two days, but only those that ship and run the joint head actually work as decision models.

### Cited Findings

#### Exact parameter breakdown
I parsed every safetensors shard header via HTTP range requests and summed the tensor shapes. All tensors are BF16. Neither repo contains a tensor with "lora" in its name.

| Component | Clef | Clef-flash |
|---|---:|---:|
| Transformer layers (+ final norm) | 24,353,201,664 | 6,919,565,824 |
| Input embeddings (`embed_tokens`) | 1,271,398,400 | 1,017,118,720 |
| `lm_head` (output embeddings) | 1,271,398,400 | 1,017,118,720 |
| Vision encoder (+ merger) | 460,730,096 | 456,010,480 |
| **Backbone total** (equals the HF API "safetensors" count) | **27,356,728,560** | **9,409,813,744** |
| Joint schema head (`joint_head.safetensors`) | 128,056,324 | 121,762,820 |
| **Grand total** | **27,484,784,884** | **9,531,576,564** |
| Separate LoRA tensors | 0 (merged) | 0 (merged) |

- Sources for the table: the HF API reports `"safetensors": {"parameters": {"BF16": 27356728560}}` for Clef and `{"BF16": 9409813744}` for Clef-flash; the component split and head counts come from my parse of the shard headers — [HF API clef](https://huggingface.co/api/models/Cloudflare/clef?blobs=true); [HF API clef-flash](https://huggingface.co/api/models/Cloudflare/clef-flash?blobs=true); [Clef files](https://huggingface.co/Cloudflare/clef/tree/main); [Clef-flash files](https://huggingface.co/Cloudflare/clef-flash/tree/main)
- The release loader's docstring says it loads "a Clef release (merged backbone, joint schema head, and processor)", which confirms the LoRA is merged into the backbone weights — [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)
- The blog's training description: "By freezing Qwen3.8-27B for Clef and Qwen3.5-9B for Clef-flash, we jointly optimized the routing head alongside rank-256 low-rank adapters". Training used label-smoothed cross-entropy plus a Brier loss, followed by "Reinforcement Learning for Calibrated Decisions (RLCD)" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)

#### Files and sizes
- **Clef:** 12 backbone shards between 2.54 GB and 4.99 GB, plus `joint_head.safetensors` (256,125,024 bytes), `tokenizer.json` (19,989,325 bytes), `joint_schema_model.py` (23,263 bytes) and configs. The repo totals **54.99 GB** (`usedStorage` 54,989,721,117) — [HF API clef](https://huggingface.co/api/models/Cloudflare/clef?blobs=true)
- **Clef-flash:** 4 backbone shards plus `joint_head.safetensors` (243,538,016 bytes). The repo totals **19.08 GB** (`usedStorage` 19,083,248,461) — [HF API clef-flash](https://huggingface.co/api/models/Cloudflare/clef-flash?blobs=true)
- `config.json` has `"dtype": "bfloat16"` and `"mamba_ssm_dtype": "float32"`, the latter for the linear-attention recurrent state — [Clef config.json](https://huggingface.co/Cloudflare/clef/blob/main/config.json)

#### Architecture (from config.json)
- **Clef:** `Qwen3_5ForConditionalGeneration` (`model_type: qwen3_5`). It has 64 layers, hidden size 5120 and FFN size 17,408. Layers follow a repeating pattern of 3 `linear_attention` layers then 1 `full_attention` layer (`full_attention_interval: 4`), so only **16 of the 64 layers are full attention**. Those layers use 24 query heads, 4 KV heads and head_dim 256. Other values: vocab 248,320, `max_position_embeddings` 262,144, `mtp_num_hidden_layers: 0`. Vision tower: depth 27, width 1152, patch 16, spatial merge 2 — [Clef config.json](https://huggingface.co/Cloudflare/clef/blob/main/config.json)
- **Clef-flash:** the same family, with 32 layers, hidden size 4096, FFN size 12,288, **8 of 32 layers full attention**, 16 query heads and 4 KV heads, and the same vision tower — [Clef-flash config.json](https://huggingface.co/Cloudflare/clef-flash/blob/main/config.json)
- **Head config:** `{"hidden_size": 5120, "width": 1024, "routing_layers": 2, "layers": 4, "heads": 16, "feedforward": 4096}`. Clef-flash is identical except `hidden_size` is 4096 — [Clef joint_head_config.json](https://huggingface.co/Cloudflare/clef/blob/main/joint_head_config.json); [Clef-flash joint_head_config.json](https://huggingface.co/Cloudflare/clef-flash/blob/main/joint_head_config.json)
- **How the head works**, per the code:
  - The backbone runs once with `use_cache=False` and returns `last_hidden_state`. No vocabulary projection is computed and no tokens are generated.
  - Option queries pass through 2 "EvidenceRoutingLayer" blocks, which cross-attend to the projected token memory. Per-question field vectors then pass through 4 `TransformerDecoderLayer`s (self-attention plus cross-attention to that memory).
  - A "lexical prior" is built from `lm_head` rows of the option tokens, which are used only as embedding lookups.
  - Each option's logit is `prior + sigmoid(gate) * (scale * cosine + residual_MLP)`, and a softmax is taken per question — [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)
- **Prompt layout (in the code):**
  - A fixed system prompt, then `STATE:`. The state is rendered as compact JSON with sorted keys.
  - Next comes `SCHEMA FIELDS`, where each field lists its ID, TYPE, INSTRUCTION and ALLOWED OPTIONS. `choice` options are sorted alphabetically by option ID.
  - The prompt ends with `<think>\n\n</think>\n\nJOINT SCHEMA DECISIONS:`.
  - `encode_record` defaults to `max_length=16384`. It truncates the state to fit, accepts an optional `max_state_tokens`, and raises an error if the schema alone exceeds `max_length` — [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)
- The Clef-flash code is byte-identical to Clef's: both `joint_schema_model.py` files have md5 2f124e40… (own check of [Clef-flash files](https://huggingface.co/Cloudflare/clef-flash/tree/main)).

#### Model card statements
- "Clef is a 27B multimodal model that turns a state and a schema of typed questions into decisions. It reads the state as text, JSON, images, or video, and returns a probability for every allowed option of every question in a single forward pass. There is no free-form text generation and no output parsing." — [Clef model card](https://huggingface.co/Cloudflare/clef)
- "Tested with `torch` 2.11 and `transformers` 5.10.2 on a single H200." The card also notes that image and video inputs need `pillow`. Usage is `sys.path.insert(0, path)` followed by `from joint_schema_model import ... load_release_model`, i.e. a manual import rather than `trust_remote_code` — [Clef model card](https://huggingface.co/Cloudflare/clef)
- "The Clef API is fully compatible with Jev and SystemOne." `systemone()` accepts a Jev/SystemOne `POST /v1/systemone` body and returns `model`, `answers` and `usage` — [Clef model card](https://huggingface.co/Cloudflare/clef)
- Question types: "`noul` (true/false), `choice` (named options), or `score` (ordered options)" — [Clef model card](https://huggingface.co/Cloudflare/clef)
- HF metadata: `license: apache-2.0`, `library_name: transformers`, `pipeline_tag: image-text-to-text`, tags include `custom-code` and `endpoints_compatible` — [HF API clef](https://huggingface.co/api/models/Cloudflare/clef?blobs=true)
- transformers 5.10.2 was uploaded to PyPI on 2026-06-04; the latest is 5.18.0 — [PyPI transformers 5.10.2](https://pypi.org/project/transformers/5.10.2/)

#### Base models verified
- **Qwen/Qwen3.8-27B exists.** Created 2026-08-05, Apache-2.0, `Qwen3_5ForConditionalGeneration`, 27,781,427,952 BF16 parameters, 6,934,867 downloads and 16,818 likes. The card describes "64 layers", "Hidden Layout: 16 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))", "Context Length: 262,144 natively and extensible up to 1,000,000 tokens", a vision encoder and MTP. It states the model is "compatible with Hugging Face Transformers, vLLM, SGLang, TokenSpeed" — [Qwen3.8-27B card](https://huggingface.co/Qwen/Qwen3.8-27B); [HF API](https://huggingface.co/api/models/Qwen/Qwen3.8-27B)
- **Qwen/Qwen3.5-9B exists.** Created 2026-02-27, Apache-2.0, 9,653,104,368 parameters, 9,181,882 downloads, fine-tuned from Qwen3.5-9B-Base. Its layout is "8 × (3 × (Gated DeltaNet → FFN) → 1 × (Gated Attention → FFN))", with 262,144 native context extensible to 1,010,000. It is "compatible with Hugging Face Transformers, vLLM, SGLang, KTransformers" — [Qwen3.5-9B card](https://huggingface.co/Qwen/Qwen3.5-9B)
- **The parameter gap is the MTP module.** Clef's backbone has exactly 424,699,392 fewer parameters than Qwen3.8-27B, and Clef-flash has 243,290,624 fewer than Qwen3.5-9B. The base configs have `mtp_num_hidden_layers: 1` while Clef's have `0`, so Cloudflare dropped the multi-token-prediction layer, which is useless without generation. This is my arithmetic on [Qwen3.8-27B config](https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/config.json) and [Clef config](https://huggingface.co/Cloudflare/clef/blob/main/config.json).
- A third-party claim I did not verify: "comparing the release against Qwen/Qwen3.8-27B, the vision encoder and early layers are byte-identical, and Clef's post-training lives in the upper layers" — [simonlehmann/clef-NVFP4](https://huggingface.co/simonlehmann/clef-NVFP4)

#### Adoption so far (HF API, about 06:45 UTC on 2026-10-03)
- **Clef:** 824 downloads and 833 likes. **Clef-flash:** 1,303 downloads and 285 likes. Both repos were created 2026-09-30 at 21:15 UTC and last modified 2026-10-01 at 15:23 UTC — [HF API clef](https://huggingface.co/api/models/Cloudflare/clef?blobs=true); [HF API clef-flash](https://huggingface.co/api/models/Cloudflare/clef-flash?blobs=true)
- **Spaces using Clef:** `embedl/hfviewer`, `hugging-apps/clef-decision-model`, `akhaliq/clef-decision-workflow` and `burhanyilmaz/clef-playground`. Spaces using Clef-flash: `embedl/hfviewer` and `hugging-apps/clef-flash`. The demo Spaces report `zero-a10g` (ZeroGPU) hardware — [HF API space](https://huggingface.co/api/spaces/hugging-apps/clef-decision-model); [HF API space](https://huggingface.co/api/spaces/hugging-apps/clef-flash)

#### Community quantizations and derivatives
- **Counts:** 13 quantized repos for Clef and 22 for Clef-flash, plus 2 Clef fine-tunes, 1 Clef-flash fine-tune and 1 Clef adapter. The most downloaded is `bartowski/Cloudflare_clef-flash-GGUF` (3,011 downloads, 14 likes) — [HF quantized:clef](https://huggingface.co/models?other=base_model:quantized:Cloudflare/clef); [HF quantized:clef-flash](https://huggingface.co/models?other=base_model:quantized:Cloudflare/clef-flash)
- **Formats seen:** GGUF (bartowski, ggml-org, abenzerps, prithivMLmods and others), MLX 4-bit and 8-bit (mlx-community, TrevorJS), FP8 W8A8 (prithivMLmods, kurcontko), NVFP4 (simonlehmann, kurcontko, alpha-x-ai), MXFP4, EXL3, OpenVINO and int8 — [HF quantized:clef](https://huggingface.co/models?other=base_model:quantized:Cloudflare/clef); [HF quantized:clef-flash](https://huggingface.co/models?other=base_model:quantized:Cloudflare/clef-flash)

Quantized sizes, from the repo file listings ("head?" means the repo ships or runs the joint head):

| Variant | Clef | Clef-flash | Head? |
|---|---:|---:|---|
| Official BF16 safetensors | 54.99 GB | 19.08 GB | yes |
| FP8 W8A8 (prithivMLmods; `lm_head`, embeddings, vision and linear-attention kept BF16) | 35.93 GB | not checked | no head file in listing |
| NVFP4/FP8 mixed (simonlehmann; "20.2 GiB of weights in vLLM") | 23.84 GB | – | yes, plus `clef_vllm.py` |
| GGUF Q8_0 | 28.67 GB (bartowski) | 9.55 GB (bartowski) / 9.66 GB (ggml-org) | bartowski no, ggml-org yes |
| GGUF Q4_K_M | 17.20 GB (bartowski) | 5.84 GB (bartowski) / 6.49 GB (ggml-org) | as above |
| GGUF BF16 | 53.81 GB (bartowski, 2 parts) | 17.92 GB (bartowski) / 18.16 GB (ggml-org) | as above |
| Vision projector (`mmproj`) GGUF | 0.93 GB | 0.92 GB | n/a |
| MLX 4-bit (head included, vision kept BF16) | 16.3 GB | 6.2 GB | yes, via `clef_mlx.py` |
| MLX 8-bit | 29.8 GB | 10.7 GB | yes |

Sources for the table: [bartowski clef GGUF](https://huggingface.co/bartowski/Cloudflare_clef-GGUF); [bartowski clef-flash GGUF](https://huggingface.co/bartowski/Cloudflare_clef-flash-GGUF); [ggml-org Clef-Flash-GGUF](https://huggingface.co/ggml-org/Clef-Flash-GGUF); [prithivMLmods clef-FP8](https://huggingface.co/prithivMLmods/clef-FP8); [simonlehmann clef-NVFP4](https://huggingface.co/simonlehmann/clef-NVFP4); [mlx-community clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit)

- The MLX card warns: "**It is not a chat model** — `mlx_vlm.generate`, `mlx_lm.generate`, and LM Studio will load the backbone but produce meaningless text." Its Limitations list adds "Text generation tools (`mlx_lm.generate`, `mlx_vlm.generate`, LM Studio, Ollama) load the backbone but give meaningless output." — [mlx-community/clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit)
- The ggml-org card says: "This is a decision model, to be used via `/v1/systemone` API. Requires https://github.com/ggml-org/llama.cpp/pull/29831" — [ggml-org/Clef-Flash-GGUF](https://huggingface.co/ggml-org/Clef-Flash-GGUF)
- The bartowski GGUF cards show a generic chat and function-calling prompt format ("Llamacpp imatrix Quantizations"), with nothing about the joint head — [bartowski clef-flash GGUF](https://huggingface.co/bartowski/Cloudflare_clef-flash-GGUF)

### Inferences
- **ggml-org's GGUF almost certainly includes the head; bartowski's does not.** ggml-org's BF16 GGUF (18.164 GB) is larger than bartowski's (17.921 GB) by 0.243 GB, which equals the BF16 joint-head file (243.5 MB). Bartowski's BF16 file also equals the official backbone minus vision and minus head: 19.06 − 0.91 − 0.24 ≈ 17.91 GB. So "Clef in Ollama or LM Studio" with generic GGUFs would not produce decisions. Demos should use ggml-org's GGUF with llama.cpp at or after PR #29831, the MLX `clef_mlx.py`, or the official PyTorch code.
- **The head is cheap.** It is 0.47% of Clef's parameters and 1.3% of Clef-flash's. The community NVFP4 card measured it at 3–6 ms, so the cost of a decision is almost entirely one backbone prefill.
- **Embeddings are heavy in memory but light in compute.** The two 248,320-row embedding matrices are 9.3% of Clef's parameters (2 × 1.27B / 27.48B) and 21.3% of Clef-flash's (2 × 1.017B / 9.53B). They take memory but only cost table lookups, since Clef never computes a full vocabulary projection.
- **Trainable LoRA size is unknown.** Purely as an illustration (an estimate): if rank-256 adapters were on the three MLP projections of all 64 Clef layers, they would add 64 × 3 × 256 × (5120 + 17408) ≈ 1.11B trainable parameters during training. The actual target modules are not disclosed.

### Gaps
- The LoRA target modules, trainable parameter count, training data size and training compute are not disclosed. The blog gives only "rank-256" and "internal synthetic datasets".
- I did not verify the third-party claim that the early layers are byte-identical to Qwen3.8-27B. Shard layouts differ, so file hashes cannot be compared directly.
- I did not check the size of `prithivMLmods/clef-flash-FP8` or the long-tail quantization repos.

## 2. How heavy is it, in plain terms? GPU memory by precision, which GPUs fit, CPU viability, and why prefill-only scoring is cheap

### Takeaway
**Clef-flash fits on a single consumer GPU:** about 19 GB at BF16, about 10 GB at 8-bit and about 6 GB at 4-bit. **Clef needs a single datacenter GPU:** about 55 GB at BF16 (an 80 GB-class card), about 36 GB at FP8 (fits a 48 GB L40S), and about 16–24 GB at 4-bit (fits a 24 GB card at modest context). Measured community numbers:
- Clef-flash 4-bit on an Apple M5 Max peaks at 7.0 GB and answers a 1k-token request in 0.31 s.
- NVFP4 Clef on an NVIDIA DGX Spark answers a 288-token request in 177 ms.

Cost and latency scale with input tokens because Clef runs exactly one parallel forward pass and emits zero output tokens. An LLM instead pays one sequential pass per output token.

### Cited Findings
- The official BF16 weights are 54.99 GB for Clef and 19.08 GB for Clef-flash, and the reference code was "Tested … on a single H200" — [Clef model card](https://huggingface.co/Cloudflare/clef); [HF API](https://huggingface.co/api/models/Cloudflare/clef?blobs=true)
- **Measured on Apple Silicon (M5 Max, text input, MLX)** — [mlx-community/clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit):

| Variant | Download | Peak memory (1k / 4k / 16k tokens) | Latency (1k / 16k tokens) | Minimum Mac RAM |
|---|---|---|---|---|
| clef-flash-4bit | 6.2 GB | 7.0 / 7.2 / 8.6 GB | 0.31 s / 7.0 s | 16 GB |
| clef-flash-8bit | 10.7 GB | 11.4 / 11.6 / 13.0 GB | 0.34 s / 7.7 s | 24 GB (16 GB for short prompts) |
| clef-4bit | 16.3 GB | 17.1 / 17.5 / 19.6 GB | 1.4 s / 26.0 s | 32 GB |
| clef-8bit | 29.8 GB | 30.5 / 30.8 / 33.0 GB | 1.5 s / 32.0 s | 48 GB |

  The card notes that "macOS lets the GPU use only about 70–75% of RAM by default".
- **4-bit quality cost (MLX):** "4-bit costs about **1 index point** vs bf16" (Decision Index sample 54.65 vs 55.63). The top answer matched BF16 in 96.4% of 15,915 answers, and median latency was 311 ms vs 339 ms for BF16 — [mlx-community/clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit)
- **Measured on an NVIDIA DGX Spark** (GB10, "273 GB/s unified memory"), NVFP4 Clef, vLLM 0.23.1, batch 1 — [simonlehmann/clef-NVFP4](https://huggingface.co/simonlehmann/clef-NVFP4):
  - Latency: 288 tokens → **177 ms**; a 640 px image plus 4 questions (621 tokens) → **257 ms**; BANKING77 with 77 options (1,834 tokens) → **705 ms**.
  - "The joint head adds 3–6 ms of that. On this machine the floor (~170 ms) is set by reading the weights once per pass."
  - The checkpoint is "23 GB on disk (BF16 release: 55 GB); 20.2 GiB of weights in vLLM". The transformers fallback decompresses to BF16 and needs "~57 GB of GPU memory".
  - Its top answer agreed with BF16 98.5% of the time on BANKING77, with accuracy going from 94.25% to 94.50%.
- **Small KV footprint:** only 16 of Clef's 64 layers (and 8 of Clef-flash's 32) are full attention with KV heads. The rest are linear-attention (Gated DeltaNet) layers with a fixed-size state — [Clef config.json](https://huggingface.co/Cloudflare/clef/blob/main/config.json); [Qwen3.8-27B card](https://huggingface.co/Qwen/Qwen3.8-27B)
- The blog: "During inference, Clef uses Qwen for a prefill-only pass, then scores the valid schema choices in parallel. The decision step is non-autoregressive, so there's no intermediate text to generate token by token, making Clef significantly faster than autoregressive LLMs." — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **Blog latency figures:**
  - Median: Clef 209.3 ms, Clef-flash 38.8 ms, Jev 524.1 ms.
  - p95: Clef 238.6 ms, Clef-flash 122.4 ms, Jev 536.0 ms.

  These are self-reported; see section 5 — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **Pricing reflects the asymmetry.** Workers AI charges Clef only per input token ($0.240 per M) and the API always returns `output_tokens: 0`. The same-family LLM `@cf/qwen/qwen3.8-27b` costs "$0.450 per M input tokens / $3.200 per M output tokens" — [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- **A CPU path now exists.** llama.cpp merged Clef support (text only; see section 7), so GGUF inference on CPUs is technically possible — [llama.cpp PR #29831](https://github.com/ggml-org/llama.cpp/pull/29831)

### Inferences
**Memory estimate per precision.** Method: weights plus runtime. Weights come from the exact parameter counts and published quant sizes. Runtime is about 1 GB of framework overhead (an assumption) plus activations. Activation growth is taken from the MLX measurements: (8.6 − 7.0) GB / 15k tokens ≈ 0.107 GB per 1k tokens for Clef-flash, and (19.6 − 17.1) / 15 ≈ 0.167 GB per 1k tokens for Clef. Clef runs with `use_cache=False`, so no KV cache is held. If a KV cache were kept, it would need 16 layers × 2 × 4 KV heads × 256 × 2 bytes = 64 KiB per token for Clef (4.3 GB at 64k tokens), and 32 KiB per token for Clef-flash. GPU capacities are assumed standard specs, not re-verified here: H100 80 GB, H200 141 GB, RTX PRO 6000 Blackwell 96 GB, L40S 48 GB, and A10/L4/RTX 4090 24 GB.

| Model at precision | Weights | Estimated total at ≤16k tokens | Fits on (estimate) |
|---|---|---|---|
| Clef BF16 | 55.0 GB | ~58–60 GB | 1× H100/A100 80 GB, H200, RTX PRO 6000 (96 GB). Not a single L40S (needs 2× with tensor parallel); not 24 GB cards |
| Clef FP8 | 27.5 GB if fully 8-bit; 35.9 GB as published (embeddings, `lm_head`, vision and linear-attention kept BF16) | ~31–40 GB | 1× L40S 48 GB, H100, RTX PRO 6000; not 24 GB |
| Clef 4-bit | 13.7 GB if fully 4-bit; 16.3–17.2 GB (MLX/GGUF); 23.8 GB (NVFP4 mixed) | ~18–21 GB | 24 GB cards (RTX 4090, L4, A10) at short-to-moderate context, tight at 16k; Macs with ≥32 GB |
| Clef-flash BF16 | 19.1 GB | ~21–23 GB | 24 GB cards (tight); 1× L40S comfortably |
| Clef-flash 8-bit | 9.5–10.7 GB | ~11–13 GB | Any 16–24 GB GPU (L4, A10, RTX 4090); 24 GB Macs |
| Clef-flash 4-bit | 4.8–6.5 GB | ~7–9 GB | 8–12 GB consumer GPUs; 16 GB Macs |

FP8 tensor-core support on Ada, Hopper and Blackwell (but not A10/A100) is general knowledge, not verified in this session.

- **Compute per request (estimate).** Prefill costs about 2 × (non-embedding transformer parameters) × tokens. That is 2 × 24.35B = **48.7 GFLOP per token for Clef** and 2 × 6.92B = **13.8 GFLOP per token for Clef-flash**. Embeddings and `lm_head` are excluded because Clef only does lookups on them, and the attention terms are small at these lengths. The 346-token blog request therefore needs about 16.9 TFLOP on Clef and about 4.8 TFLOP on Clef-flash. The MLX timings imply about 35 TFLOPS effective for Clef (48.7 TFLOP / 1.4 s at 1k tokens) and about 45 TFLOPS for Clef-flash (13.8 / 0.31 s) on an M5 Max.
- **CPU (estimate, assuming 1–2 TFLOPS sustained on a many-core server CPU).** Clef-flash would take about 2.4–4.8 s and Clef about 8–17 s per 346-token request. That is fine for batch or offline labeling and low-QPS back-office use, but too slow for inline per-request decisions on a CDN hot path. No CPU measurement was found.
- **Why prefill-only scoring beats generation.**
  - An LLM that returns the same three fields as JSON must emit tens to hundreds of output tokens. Each one is a sequential pass that re-reads all the weights, which is memory-bandwidth-bound and cannot be parallelized within a request.
  - Clef does one pass in which all input tokens are processed in parallel (compute-bound and GPU-friendly), plus a 3–6 ms head. On the DGX Spark, one weight-read pass is about 170 ms (measured). An LLM generating 60 tokens on the same box would need about 60 such passes, roughly 10 s (estimate).
  - **Cost on Workers AI for the blog request (estimate).** Qwen3.8-27B answering in 60 JSON tokens would cost 346 × $0.45/M + 60 × $3.20/M = $0.000348, versus $0.000083 for Clef: **4.2× cheaper**. With 200 output tokens it is 9.6× cheaper, and with 1,000 thinking-plus-answer tokens 40×. Qwen3.8 has thinking on by default per its card.
  - Clef's outputs are also always valid (only allowed options), so there is no parsing and no retries.
- **Latency grows slightly faster than input length.** Clef-flash 4-bit went from 0.31 s at 1k tokens to 7.0 s at 16k: 22.6× the time for 16× the tokens, consistent with the attention layers' quadratic term. For edge use cases, keeping `state` short matters more than choosing the model.

### Gaps
- I found no published Clef measurements on H100, L40S, A10/L4 or RTX 4090. The only data points are the card's "tested on H200" (no latency figure), DGX Spark (NVFP4) and the M5 Max (MLX).
- CPU latency is not measured anywhere I found; the CPU numbers above are estimates.
- Peak memory at 64k context is unmeasured; it is only extrapolated above.
- Cloudflare does not disclose which GPU types serve Clef on Workers AI.

## 3. Workers AI: model IDs, docs, input/output schema, context, images, pricing, rate limits, free tier, Worker binding, AI Gateway, GPU footprint

### Takeaway
The hosted models are `@cf/cloudflare/clef` (**$0.24 per M input tokens = 21,818 neurons/M**) and `@cf/cloudflare/clef-flash` (**$0.09 per M = 8,182 neurons/M**). There is no output-token charge. The API uses a Jev/SystemOne-shaped JSON body (`model`, `state`, up to 64 typed `questions`) and accepts up to 4 embedded images. The advertised context window is 65,536 tokens, but see section 4: string `state` was truncated to 2,048 tokens. The default "Text Generation" rate limit is 300 requests per minute, and every account gets 10,000 free neurons per day. Call it with `env.AI.run()` in a Worker or over REST. Routing through AI Gateway adds exact-match caching and logging. Cloudflare says it has GPUs in more than 230 of its 335+ cities.

### Cited Findings
- **Catalog entries (my read-only `GET /accounts/{id}/ai/models/search?search=clef`):**
  - `@cf/cloudflare/clef`: `created_at` "2026-09-29 14:05:24.552", task "Text Generation", properties `context_window` 65536, price 0.24 USD "per M input tokens", `vision` true.
  - `@cf/cloudflare/clef-flash`: `created_at` "2026-09-29 09:25:44.258", price 0.09 USD, otherwise identical.

  ([Live test raw files](live_test/live/get_models_search_clef.json))
- **Docs pages:** "`@cf/cloudflare/clef` … Context Window 65,536 tokens … Vision Yes … Unit Pricing $0.24 per M input tokens". Clef-flash is "a fast 9B multimodal decision model … $0.09 per M input tokens" — [Workers AI: clef](https://developers.cloudflare.com/workers-ai/models/clef/); [Workers AI: clef-flash](https://developers.cloudflare.com/workers-ai/models/clef-flash/)
- **Input schema (identical for both models):**
  - `model` is required and must match `^\s*(clef|clef-flash)\s*$`.
  - `state` is required: "a string, or structured data (object/array) … Long text state is truncated to fit the model's token limit".
  - `questions` holds "1 to 64 questions; ids may use letters, digits, '_', '.', '-' (max 100 chars)".
  - **noul:** "A yes/no question. Returns the probability the answer is yes." Optional `criteria.true` / `criteria.false` descriptions.
  - **choice:** "Map of option id … to its description … 2 to 255 options".
  - **score:** "Ordered level descriptions … lowest first; levels are indexed from 0. 2 to 10 levels".
  - **images:** "Clef extension to the System One API. Optional embedded PNG, JPEG, or WebP images placed before the state (max 4; 4 MiB and 16 megapixels each, 8 MiB total decoded; whole request body max 13 MiB). Remote URLs are not accepted." Each image is either a data URL or `{content_type, base64}`.

  Sources: [Clef input schema JSON](https://developers.cloudflare.com/workers-ai/models/clef/schema-input.json); [Clef-flash input schema JSON](https://developers.cloudflare.com/workers-ai/models/clef-flash/schema-input.json)
- **Output schema:**
  - noul → `{"type":"noul","noul": <P(yes)>}`.
  - choice → `choice`, `probabilities` ("values sum to 1") and `confidence` ("How certain the model is, derived from the probabilities").
  - score → `score` ("Probability-weighted level; can land between levels"), `legend`, `probabilities` and `confidence`.
  - `usage` → `{input_tokens, output_tokens}`.

  Source: [Clef output schema JSON](https://developers.cloudflare.com/workers-ai/models/clef/schema-output.json)
- **What "noul" means:** a boolean (true/false, yes/no) question type from the Jev/SystemOne API; the answer is the probability of "true". The HF card lists "`noul` (true/false)", and the reference code's default criteria are "The proposition is true or the answer is yes." / "… false or the answer is no." — [Clef model card](https://huggingface.co/Cloudflare/clef); [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)
- **Video:** the model descriptions say Clef "reads the state as text, JSON, images, or video", but the hosted input schema only has `images` (no video field). The HF reference code does accept `videos` — [Clef input schema JSON](https://developers.cloudflare.com/workers-ai/models/clef/schema-input.json); [Clef model card](https://huggingface.co/Cloudflare/clef)
- **Pricing:**
  - Workers AI is "priced at **$0.011 per 1,000 Neurons**". "Our free allocation allows anyone to use a total of **10,000 Neurons per day at no charge**". Going beyond requires Workers Paid, and limits reset daily at 00:00 UTC.
  - The rate table lists "`@cf/cloudflare/clef` | $0.240 per M input tokens | 21818 neurons per M input tokens" and "`@cf/cloudflare/clef-flash` | $0.090 per M input tokens | 8182 neurons per M input tokens", under "Other model pricing".
  - Models that require a paid plan are listed explicitly (Kimi, GLM-5.x, DeepSeek-V4); Clef is not among them.

  Source: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- **Rate limits:** "Text Generation – 300 requests per minute, unless the model requires the Workers Paid plan". Paid-required models get 20 rpm, or 50 rpm with prepaid AI Gateway credits. Custom limits go through a "Custom Requirements Form". The page was last updated Sep 17, 2026 — [Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
- **Worker binding:** configure `[ai] binding = "AI"`, then call `env.AI.run(model, inputs)` — [Workers AI bindings](https://developers.cloudflare.com/workers-ai/configuration/bindings/). The Clef docs example is `env.AI.run("@cf/cloudflare/clef", { model: "clef", state: "...", questions: {...} })`, with comments describing `response.answers.urgent` as the "probability the request is urgent" — [Workers AI: clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- **REST:** `POST https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/cloudflare/clef`. The docs use `Authorization: Bearer $CLOUDFLARE_AUTH_TOKEN`; my test used Global API Key headers instead (both are Cloudflare API auth methods) — [Workers AI: clef](https://developers.cloudflare.com/workers-ai/models/clef/)
- **AI Gateway with the Workers AI binding:** pass `gateway: { id: "{gateway_id}", skipCache: false, cacheTtl: 3360 }` inside the `env.AI.run` inputs. Over REST, Workers AI models "require the `cf-aig-gateway-id` header to specify which gateway to route through" — [AI Gateway: Workers AI](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/)
- **AI Gateway caching:**
  - "Caching is disabled by default."
  - Caching "applies only to identical requests" ("**exact match** of the entire request", hashed with SHA-256), with an optional custom cache key.
  - Responses carry `cf-aig-cache-status` HIT/MISS. Per-request headers are `cf-aig-cache-ttl` and `cf-aig-skip-cache`.
  - Limits: cacheable request size 25 MB; cache TTL up to 1 month.

  Sources: [AI Gateway caching](https://developers.cloudflare.com/ai-gateway/features/caching/); [AI Gateway limits](https://developers.cloudflare.com/ai-gateway/reference/limits/)
- **AI Gateway pricing:**
  - "core features … dashboard analytics, caching, and rate limiting" are free.
  - Logs for customers whose first gateway is created on or after Sep 24, 2026 follow Workers Logs pricing. Legacy log storage is 100,000 logs total on Workers Free and 10,000,000 per gateway on Workers Paid.
  - Unified Billing has a 5% fee on credits.
  - Logpush includes 10M requests per month, then $0.05 per million.

  Source: [AI Gateway pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)
- **Data use and edge claims (blog):** "we don't read, store, or train on your requests or responses (unless you want to use our fine-tuning product)". The blog also says hosting on Workers AI lets Cloudflare "take advantage of our GPUs at the edge, leading to low network latency and faster decisions" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **GPU footprint:** "network runs in more than 335 cities across 125+ countries, with GPUs for AI inference in more than 230 of them" (post dated 2026-10-01) — [Cloudflare blog: Sovereign AI one year later](https://blog.cloudflare.com/sovereign-ai-choice-one-year-later/). An April 2026 post cites "data centers in 330 cities" — [Cloudflare blog: AI Platform](https://blog.cloudflare.com/ai-platform/)

### Inferences
- **The free tier covers small demos.** 10,000 neurons per day buys about 458k Clef input tokens (about 1,325 blog-sized 346-token calls, or about 807 568-token bot-classification calls). For Clef-flash it buys about 1.22M tokens (about 3,532 or about 2,152 calls).
- **Cost per million decisions** at my measured token counts: Clef **$83** (346-token ticket) to **$139** (580-token cache decision); Clef-flash **$31–$52**; images are about $141 (Clef) per million 587-token requests. A full 64k-token request, if honored, would cost $0.0157 on Clef.
- **The default rate limit is too low for inline per-request CDN decisions.** 300 rpm is 5 requests per second (432k per day). A real per-request deployment would need custom limits, sampling (classify a fraction of traffic or only new fingerprints), or caching.
- **Caching is safe and effective.** Outputs were bit-for-bit deterministic across repeats (section 4), so AI Gateway's exact-match cache can serve repeated identical states, for example the same path, user-agent and ASN fingerprint. Any byte difference in the body is a miss, so normalize the `state` before sending.
- **The 300 rpm figure is inferred.** It comes from the "Text Generation" task label shown for Clef in the catalog and docs; no Clef-specific limit is documented.

### Gaps
- Cloudflare does not say which of the 230+ GPU cities serve Clef, and documents no regional pinning or data-locality option for Clef.
- No explicit per-model rate limit is published for Clef.
- I did not check Batch API support for Clef, nor whether Workers AI LoRA uploads work with Clef.

## 4. Live test of the hosted API: exact requests and responses, latency, cost, and two surprises

### Takeaway
- **Call budget:** 30 calls to the run endpoint. 26 were successful inferences; 2 were deliberate schema-error baselines (HTTP 400); 2 sent a bad image because a download failed (HTTP 422, not billed).
- **Behavior:** both models answered the blog example and four CDN-style payloads sensibly, and Clef handled an image. Results were **deterministic** (identical probabilities on every repeat), and billing was exactly tokens × rate (header `cf-ai-neurons`).
- **Latency from this container** (traffic enters Cloudflare at IAD):

| | Clef | Clef-flash |
|---|---:|---:|
| Median end-to-end time to first byte, 346-token request | 525 ms | 401 ms |
| No-inference floor | ~187 ms | ~187 ms |
| Implied model + platform routing time | ~306 ms | ~174 ms |

- **Two surprises:**
  1. The hosted endpoint **silently truncated string `state` to 2,048 tokens**, far below the advertised 65,536-token context.
  2. The hosted **`confidence` is a normalized-purity statistic**, not the max probability used in Cloudflare's own HF reference code.

### Cited Findings

#### Setup
- Auth used the `X-Auth-Email` and `X-Auth-Key` headers (a Global API Key), passed to curl via a stdin config so no secrets appear in files or logs. Traffic went through the container's HTTPS proxy. `https://www.cloudflare.com/cdn-cgi/trace` reported `colo=IAD`, `loc=US`, and every API response's `cf-ray` ended in `-IAD`. Calls ran between 06:52 and 06:55 UTC on 2026-10-03 — [Live test raw files](live_test/live/)
- The read-only `GET .../ai/models/schema?model=@cf/cloudflare/clef` returned the same input schema as the docs, plus `"default": "clef"` on `model` — [Live test raw files](live_test/live/)
- **Response headers on successful inferences:** `cf-ai-neurons` (for example `7.55`), `cf-ai-req-id`, `api-version: 2026-10-01.epoch`, `cache-control: no-store` and `cf-ray`. There was **no `server-timing` header**, so GPU time cannot be read directly. Error responses (400 and 422) had no `cf-ai-neurons` header, i.e. they were not billed — [Live test raw files](live_test/live/)

#### Test 1: the blog's support-ticket example (both models, 5 interleaved repeats each, plus 1 initial Clef call)
**Request (sent identically to both endpoints, only `model` changed; this is the blog/docs example):**

`POST https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/cloudflare/clef` (and `.../@cf/cloudflare/clef-flash`), headers `X-Auth-Email`, `X-Auth-Key`, `Content-Type: application/json`

```json
{
  "model": "clef",
  "state": "Checkout has been failing for every customer for the last hour.",
  "questions": {
    "urgent": {
      "type": "noul",
      "instructions": "Is this support request urgent?"
    },
    "team": {
      "type": "choice",
      "instructions": "Which team should handle this request?",
      "criteria": {
        "billing": "Payments, invoices, and refunds",
        "technical": "Outages, errors, and configuration",
        "sales": "Plans and upgrades"
      }
    },
    "severity": {
      "type": "score",
      "instructions": "How severe is the customer impact?",
      "criteria": [
        "No impact",
        "Minor",
        "Major",
        "Critical"
      ]
    }
  }
}
```

**Clef response** (identical in all 6 Clef calls; header `cf-ai-neurons: 7.55`):

```json
{
  "result": {
    "model": "clef",
    "answers": {
      "urgent": {
        "type": "noul",
        "noul": 0.9906
      },
      "team": {
        "type": "choice",
        "choice": "technical",
        "probabilities": {
          "billing": 0.1762,
          "technical": 0.8088,
          "sales": 0.015
        },
        "confidence": 0.5281
      },
      "severity": {
        "type": "score",
        "score": 2.9573,
        "legend": {
          "0": "No impact",
          "1": "Minor",
          "2": "Major",
          "3": "Critical"
        },
        "probabilities": {
          "0": 0.0042,
          "1": 0.0043,
          "2": 0.0215,
          "3": 0.97
        },
        "confidence": 0.922
      }
    },
    "usage": {
      "input_tokens": 346,
      "output_tokens": 0
    }
  },
  "success": true,
  "errors": [],
  "messages": []
}
```

**Clef-flash response** (identical in all 5 calls; header `cf-ai-neurons: 2.83`):

```json
{
  "result": {
    "model": "clef-flash",
    "answers": {
      "urgent": {
        "type": "noul",
        "noul": 0.9551
      },
      "team": {
        "type": "choice",
        "choice": "technical",
        "probabilities": {
          "billing": 0.0505,
          "technical": 0.9355,
          "sales": 0.014
        },
        "confidence": 0.817
      },
      "severity": {
        "type": "score",
        "score": 2.7182,
        "legend": {
          "0": "No impact",
          "1": "Minor",
          "2": "Major",
          "3": "Critical"
        },
        "probabilities": {
          "0": 0.0151,
          "1": 0.0144,
          "2": 0.2077,
          "3": 0.7628
        },
        "confidence": 0.5005
      }
    },
    "usage": {
      "input_tokens": 346,
      "output_tokens": 0
    }
  },
  "success": true,
  "errors": [],
  "messages": []
}
```

#### Tests 2–5: CDN-flavored payloads I designed (one call per model each)

##### P2a - Bot management: GPTBot-like crawler request

Request (`model` set to `clef` or `clef-flash`):

```json
{
  "model": "clef",
  "state": {
    "request": {
      "method": "GET",
      "host": "shop.example.com",
      "path": "/products/sku-48213?ref=sitemap",
      "http_version": "HTTP/1.1",
      "user_agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
      "accept_language": null,
      "cookies_present": false,
      "asn": 8075,
      "asn_org": "Microsoft Corporation",
      "country": "US"
    },
    "client_behavior_last_60s": {
      "requests_from_ip": 240,
      "distinct_paths": 231,
      "fetched_robots_txt": true,
      "fetched_sitemap_xml": true,
      "loaded_css_js_images": false,
      "js_challenge_passed": false
    }
  },
  "questions": {
    "traffic_class": {
      "type": "choice",
      "instructions": "What kind of client most likely sent this request?",
      "criteria": {
        "human": "A person using a normal web browser",
        "good_bot": "A verified search-engine or uptime-monitoring crawler that respects robots.txt",
        "ai_crawler": "A crawler collecting content for AI model training or AI answer engines",
        "malicious": "Credential stuffing, abusive scraping, vulnerability scanning, or DDoS"
      }
    },
    "block": {
      "type": "noul",
      "instructions": "Should this request be blocked outright?"
    },
    "risk": {
      "type": "score",
      "instructions": "How risky is this request to the origin server?",
      "criteria": [
        "Benign",
        "Low",
        "Elevated",
        "High",
        "Critical"
      ]
    }
  }
}
```

clef answers (input_tokens 568, `cf-ai-neurons: 12.39`):

```json
{"traffic_class":{"type":"choice","choice":"ai_crawler","probabilities":{"human":0.0065,"good_bot":0.0229,"ai_crawler":0.7995,"malicious":0.1711},"confidence":0.5587},"block":{"type":"noul","noul":0.5446},"risk":{"type":"score","score":2.2805,"legend":{"0":"Benign","1":"Low","2":"Elevated","3":"High","4":"Critical"},"probabilities":{"0":0.0718,"1":0.0885,"2":0.3743,"3":0.4182,"4":0.0472},"confidence":0.1628}}
```

clef-flash answers (input_tokens 568, `cf-ai-neurons: 4.65`):

```json
{"traffic_class":{"type":"choice","choice":"ai_crawler","probabilities":{"human":0.0081,"good_bot":0.014,"ai_crawler":0.9289,"malicious":0.049},"confidence":0.8207},"block":{"type":"noul","noul":0.7488},"risk":{"type":"score","score":2.2327,"legend":{"0":"Benign","1":"Low","2":"Elevated","3":"High","4":"Critical"},"probabilities":{"0":0.0757,"1":0.0838,"2":0.4125,"3":0.3879,"4":0.0401},"confidence":0.1687}}
```

##### P2b - Bot management: WordPress login brute force against a site with no WordPress

Request (`model` set to `clef` or `clef-flash`):

```json
{
  "model": "clef",
  "state": {
    "request": {
      "method": "POST",
      "host": "blog.example.com",
      "path": "/wp-login.php",
      "http_version": "HTTP/1.1",
      "user_agent": "python-requests/2.32.3",
      "accept_language": null,
      "cookies_present": false,
      "asn": 14061,
      "asn_org": "DigitalOcean, LLC",
      "country": "NL",
      "body_fields": [
        "log",
        "pwd",
        "wp-submit"
      ]
    },
    "client_behavior_last_60s": {
      "requests_from_ip": 900,
      "distinct_usernames_tried": 310,
      "login_failures": 898,
      "fetched_robots_txt": false,
      "loaded_css_js_images": false,
      "js_challenge_passed": false
    },
    "site_context": "Static site hosted on Cloudflare Pages; no WordPress is installed"
  },
  "questions": {
    "traffic_class": {
      "type": "choice",
      "instructions": "What kind of client most likely sent this request?",
      "criteria": {
        "human": "A person using a normal web browser",
        "good_bot": "A verified search-engine or uptime-monitoring crawler that respects robots.txt",
        "ai_crawler": "A crawler collecting content for AI model training or AI answer engines",
        "malicious": "Credential stuffing, abusive scraping, vulnerability scanning, or DDoS"
      }
    },
    "block": {
      "type": "noul",
      "instructions": "Should this request be blocked outright?"
    },
    "risk": {
      "type": "score",
      "instructions": "How risky is this request to the origin server?",
      "criteria": [
        "Benign",
        "Low",
        "Elevated",
        "High",
        "Critical"
      ]
    }
  }
}
```

clef answers (input_tokens 561, `cf-ai-neurons: 12.24`):

```json
{"traffic_class":{"type":"choice","choice":"malicious","probabilities":{"human":0.0031,"good_bot":0.0032,"ai_crawler":0.01,"malicious":0.9837},"confidence":0.957},"block":{"type":"noul","noul":0.9845},"risk":{"type":"score","score":3.8801,"legend":{"0":"Benign","1":"Low","2":"Elevated","3":"High","4":"Critical"},"probabilities":{"0":0.0081,"1":0.0075,"2":0.0159,"3":0.0333,"4":0.9352},"confidence":0.8452}}
```

clef-flash answers (input_tokens 561, `cf-ai-neurons: 4.59`):

```json
{"traffic_class":{"type":"choice","choice":"malicious","probabilities":{"human":0.0104,"good_bot":0.0095,"ai_crawler":0.0113,"malicious":0.9688},"confidence":0.9186},"block":{"type":"noul","noul":0.9496},"risk":{"type":"score","score":3.2689,"legend":{"0":"Benign","1":"Low","2":"Elevated","3":"High","4":"Critical"},"probabilities":{"0":0.0309,"1":0.0294,"2":0.077,"3":0.3652,"4":0.4975},"confidence":0.2357}}
```

##### P3 - Edge cache policy for a personalized cart API response

Request (`model` set to `clef` or `clef-flash`):

```json
{
  "model": "clef",
  "state": {
    "request": {
      "method": "GET",
      "url": "https://shop.example.com/api/v2/cart?currency=EUR",
      "cookie_present": true,
      "authorization_header": false
    },
    "origin_response": {
      "status": 200,
      "content_type": "application/json",
      "content_length": 1843,
      "headers": {
        "cache-control": null,
        "set-cookie": "sid=REDACTED; HttpOnly; Secure",
        "vary": "Cookie",
        "etag": null
      },
      "body_preview": "{\"cart_id\":\"c_9f2\",\"items\":[{\"sku\":\"48213\",\"qty\":2}],\"customer\":{\"first_name\":\"Ana\",\"loyalty_tier\":\"gold\"}}"
    },
    "traffic_stats_last_hour": {
      "requests": 12000,
      "unique_cookie_values": 11800
    }
  },
  "questions": {
    "cache_policy": {
      "type": "choice",
      "instructions": "Which edge cache policy should apply to this URL?",
      "criteria": {
        "bypass": "Never cache at the edge; personalized or sensitive",
        "short_ttl": "Cache for seconds up to a few minutes",
        "long_ttl": "Cache for hours or days (static or versioned asset)",
        "stale_while_revalidate": "Serve a cached copy while refreshing it in the background"
      }
    },
    "personalized": {
      "type": "noul",
      "instructions": "Does this response contain user-specific data?"
    },
    "safe_ttl": {
      "type": "score",
      "instructions": "How long can this response safely be cached at a shared edge cache?",
      "criteria": [
        "0 seconds",
        "Under 1 minute",
        "1 to 60 minutes",
        "1 to 24 hours",
        "More than 1 day"
      ]
    }
  }
}
```

clef answers (input_tokens 580, `cf-ai-neurons: 12.65`):

```json
{"cache_policy":{"type":"choice","choice":"bypass","probabilities":{"bypass":0.9721,"short_ttl":0.0115,"long_ttl":0.006,"stale_while_revalidate":0.0104},"confidence":0.927},"personalized":{"type":"noul","noul":0.9843},"safe_ttl":{"type":"score","score":0.0714,"legend":{"0":"0 seconds","1":"Under 1 minute","2":"1 to 60 minutes","3":"1 to 24 hours","4":"More than 1 day"},"probabilities":{"0":0.965,"1":0.0144,"2":0.0097,"3":0.0059,"4":0.005},"confidence":0.9146}}
```

clef-flash answers (input_tokens 580, `cf-ai-neurons: 4.75`):

```json
{"cache_policy":{"type":"choice","choice":"bypass","probabilities":{"bypass":0.9308,"short_ttl":0.0336,"long_ttl":0.0069,"stale_while_revalidate":0.0287},"confidence":0.8246},"personalized":{"type":"noul","noul":0.9429},"safe_ttl":{"type":"score","score":0.2684,"legend":{"0":"0 seconds","1":"Under 1 minute","2":"1 to 60 minutes","3":"1 to 24 hours","4":"More than 1 day"},"probabilities":{"0":0.7977,"1":0.154,"2":0.0348,"3":0.0092,"4":0.0043},"confidence":0.5766}}
```

##### P4 - Comment moderation (spam/scam)

Request (`model` set to `clef` or `clef-flash`):

```json
{
  "model": "clef",
  "state": {
    "platform": "Comment section of a developer blog post about CDN caching",
    "comment": "Great write-up! btw anyone who wants the paid course for free DM me on telegram @cheapcourses_xx, also selling cracked API keys cheap",
    "author_account_age_days": 0,
    "links_in_comment": 0,
    "previous_comments_by_author": 0
  },
  "questions": {
    "action": {
      "type": "choice",
      "instructions": "What moderation action should be taken?",
      "criteria": {
        "approve": "Publish normally",
        "hold": "Hold for human review",
        "remove": "Remove automatically"
      }
    },
    "spam": {
      "type": "noul",
      "instructions": "Is this comment spam or scam promotion?"
    },
    "toxicity": {
      "type": "score",
      "instructions": "How toxic or abusive is the language toward people?",
      "criteria": [
        "Not toxic",
        "Mildly rude",
        "Insulting",
        "Hateful or threatening"
      ]
    }
  }
}
```

clef answers (input_tokens 404, `cf-ai-neurons: 8.81`):

```json
{"action":{"type":"choice","choice":"remove","probabilities":{"approve":0.0103,"hold":0.0461,"remove":0.9436},"confidence":0.839},"spam":{"type":"noul","noul":0.9815},"toxicity":{"type":"score","score":0.0524,"legend":{"0":"Not toxic","1":"Mildly rude","2":"Insulting","3":"Hateful or threatening"},"probabilities":{"0":0.972,"1":0.0114,"2":0.0087,"3":0.0079},"confidence":0.9269}}
```

clef-flash answers (input_tokens 404, `cf-ai-neurons: 3.31`):

```json
{"action":{"type":"choice","choice":"remove","probabilities":{"approve":0.0374,"hold":0.1024,"remove":0.8602},"confidence":0.6277},"spam":{"type":"noul","noul":0.9366},"toxicity":{"type":"score","score":0.0219,"legend":{"0":"Not toxic","1":"Mildly rude","2":"Insulting","3":"Hateful or threatening"},"probabilities":{"0":0.9845,"1":0.0113,"2":0.0019,"3":0.0023},"confidence":0.9592}}
```

#### Test 6: image input (Clef; one call)
Request (image is Wikimedia Commons `Cat_November_2010-1a.jpg`, 330px thumbnail, embedded as a data URL):

```json
{
  "model": "clef",
  "images": [
    "data:image/jpeg;base64,/9j/2wBDAAQDAwQDAwQEAwQFB...<61647 chars total; 46,216-byte 330x441 JPEG>"
  ],
  "state": {
    "context": "A user uploaded this image as their profile avatar on a family-friendly community site.",
    "source_url_for_reference": "https://commons.wikimedia.org/wiki/File:Cat_November_2010-1a.jpg"
  },
  "questions": {
    "subject": {
      "type": "choice",
      "instructions": "What is the main subject of the image?",
      "criteria": {
        "cat": "A cat",
        "dog": "A dog",
        "person": "One or more people",
        "vehicle": "A car or other vehicle",
        "text_screenshot": "A screenshot mostly containing text"
      }
    },
    "allow_avatar": {
      "type": "noul",
      "instructions": "Is this image acceptable as an avatar on a family-friendly site?"
    },
    "image_kind": {
      "type": "choice",
      "instructions": "What kind of image is this?",
      "criteria": {
        "photograph": "A camera photograph",
        "illustration": "A drawing or digital illustration",
        "screenshot": "A screen capture",
        "meme": "An image macro with overlaid caption text"
      }
    }
  }
}
```

Clef response (`cf-ai-neurons: 12.81`):

```json
{
  "result": {
    "model": "clef",
    "answers": {
      "subject": {
        "type": "choice",
        "choice": "cat",
        "probabilities": {
          "cat": 0.9824,
          "dog": 0.0045,
          "person": 0.004,
          "vehicle": 0.0046,
          "text_screenshot": 0.0045
        },
        "confidence": 0.9565
      },
      "allow_avatar": {
        "type": "noul",
        "noul": 0.9901
      },
      "image_kind": {
        "type": "choice",
        "choice": "photograph",
        "probabilities": {
          "photograph": 0.9653,
          "illustration": 0.0115,
          "screenshot": 0.0117,
          "meme": 0.0115
        },
        "confidence": 0.9095
      }
    },
    "usage": {
      "input_tokens": 587,
      "output_tokens": 0
    }
  },
  "success": true,
  "errors": [],
  "messages": []
}
```
- **Image token accounting:** the text portion of this request is 444 tokens by my local replica of `encode_record`, so the image cost 587 − 444 = **143 tokens**. That is 140 image tokens plus 3 wrapper tokens. It matches Qwen2-VL-style resizing: 330×441 rounds to 448×320, giving (448/16) × (320/16) / 4 = 140 merged patches. Images are billed as ordinary input tokens: 587 × 21,818 / 1M = 12.81 neurons — [Live test raw files](live_test/live/)

#### Error behavior
Invalid request (body `{"model":"clef","state":"x"}`), HTTP 400, no `cf-ai-neurons` header:

```json
{"errors":[{"message":"AiError: Bad input: Error: required properties at '/' are 'model,state,questions' (cba15bde-5351-404a-bc9e-32094e768932)","code":5006}],"success":false,"result":{},"messages":[]}
```

HTML bytes sent as a JPEG data URL, HTTP 422, no `cf-ai-neurons` header:

```json
{"errors":[{"message":"AiError: AiError: {\"error\":{\"type\":\"invalid_request\",\"message\":\"Request body failed validation\",\"details\":{\"formErrors\":[],\"fieldErrors\":{\"images\":[\"image payload is invalid\"]}}}} (ab9416f1-e1fa-49b4-a1c5-4a7678eb2e3d)","code":5012}],"success":false,"result":{},"messages":[]}
```

#### Surprise 1: `state` truncated to 2,048 tokens (tested with long access-log strings)
- **Method:** I rebuilt Cloudflare's `encode_record` token layout without torch, using Clef's own `tokenizer.json`. It reproduces the API's `usage.input_tokens` exactly for all five short payloads. I then sent synthetic access logs of about 9k, 37k and 104k tokens. All three were billed and reported as exactly **2,445 tokens**, which is 397 fixed tokens (system prompt, schema and suffix) plus **2,048 state tokens**. None returned an error — [Live test raw files](live_test/live/)

| Payload | Request body (bytes) | Tokens by local replica of `encode_record` (fixed + state = full) | API `usage.input_tokens` | `cf-ai-neurons` (clef / clef-flash) |
|---|---|---|---|---|
| p1_blog_support_ticket | 720 | 334 + 12 = 346 | 346 | 7.55 / 2.83 |
| p2a_bot_ai_crawler | 1,587 | 408 + 160 = 568 | 568 | 12.39 / 4.65 |
| p2b_bot_wp_login_bruteforce | 1,663 | 408 + 153 = 561 | 561 | 12.24 / 4.59 |
| p3_cache_policy | 1,656 | 425 + 155 = 580 | 580 | 12.65 / 4.75 |
| p4_comment_moderation | 1,008 | 339 + 65 = 404 | 404 | 8.81 / 3.31 |
| p6_logs_4k | 17,758 | 397 + 8,697 = 9,094 | 2,445 | 53.35 / 20.00 |
| p6_logs_16k | 72,463 | 397 + 36,613 = 37,010 | 2,445 | 53.35 / 20.00 |
| p6_logs_45k | 202,100 | 397 + 103,324 = 103,721 | 2,445 | 53.35 / 20.00 |
- The answers differed across the three log payloads (for example, Clef's `attack_present` was 0.0082, 0.1272 and 0.0536). That is consistent with keeping only the first 2,048 state tokens (about 19 log lines), because each generated log begins differently. The reference code truncates by keeping the head of the state (`state_ids[:max_state_tokens]`) — [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)
- The docs advertise a "Context Window 65,536 tokens", and the blog says "our model has a 64k context window (compared to Jev's 32k)". The schema text only says "Long text state is truncated to fit the model's token limit" — [Workers AI: clef](https://developers.cloudflare.com/workers-ai/models/clef/); [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- The MLX port's card says "the head was trained at 16k", and the reference code defaults to `max_length=16384` — [mlx-community/clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit); [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)

#### Surprise 2: what "confidence" means on the hosted API
- On all 38 choice and score answers that I checked programmatically, plus the 2 image answers I checked by hand, the hosted `confidence` equals **(Σp² − 1/n) / (1 − 1/n)**. This is one minus the normalized Gini impurity: 1 when the distribution is one-hot, 0 when it is uniform.
- Example: `team` probabilities {0.1762, 0.8088, 0.015} give Σp² = 0.6854, so (0.6854 − 0.3333) / 0.6667 = **0.528**. The API returned 0.5281.
- Cloudflare's HF reference `systemone_answer()` instead returns `"confidence": round(probabilities[choice], 4)`, which would be 0.8088 here.
- The score check: `score` = Σ i·pᵢ (for example 0·0.0042 + 1·0.0043 + 2·0.0215 + 3·0.97 = 2.9573), as documented.

Sources: [Live test raw files](live_test/live/); [joint_schema_model.py](https://huggingface.co/Cloudflare/clef/blob/main/joint_schema_model.py)

#### Latency results
The "minus connect/TLS" figures subtract curl's `time_pretransfer`, i.e. they exclude proxy CONNECT and TLS setup.

- **Network baseline:**
  - No-inference floor (HTTP 400 schema errors on the same run endpoint): TTFB 179 and 195 ms; minus connect/TLS, 101 and 102 ms.
  - Proxy CONNECT plus TLS setup across all 33 requests: median 87 ms (range 75–305).
  - `GET models/search` TTFB: 310–361 ms (it includes its own database lookup).
- **Clef, blog payload (346 tokens), 5 warm calls:** TTFB 419 / 426 / 525 / 561 / 610 ms (median **525**, mean 508). Minus connect/TLS: median 408 ms (318–504). **Minus the ~102 ms floor: median ~306 ms (216–402).** The first call of the session was 754 ms.
- **Clef-flash, blog payload, 5 warm calls:** TTFB 330 / 365 / 401 / 520 / 523 ms (median **401**, mean 428). Minus connect/TLS: median 276 ms (236–434). **Minus the floor: median ~174 ms (135–332).**
- **CDN payloads (404–580 tokens):** Clef 512–1,031 ms TTFB; Clef-flash 428–586 ms.
- **2,445-token (truncated) payloads:** Clef 783–1,585 ms; Clef-flash 576–800 ms. These bodies were 17–202 KB, so upload time is included.
- **Image (587 tokens, 62.8 KB body):** Clef 828 ms.

Full per-call table ([Live test raw files](live_test/live/timings.jsonl)):

| UTC time | Call | HTTP | input_tokens | TTFB (ms) | TTFB minus connect/TLS (ms) |
|---|---|---|---|---|---|
| 06:52:00.403 | smoke_clef_p1 | 200 | 346 | 754 | 669 |
| 06:52:31.650 | p1_clef_r1 | 200 | 346 | 419 | 318 |
| 06:52:32.197 | p1_clef-flash_r1 | 200 | 346 | 520 | 434 |
| 06:52:32.838 | p1_clef_r2 | 200 | 346 | 610 | 504 |
| 06:52:33.386 | p1_clef-flash_r2 | 200 | 346 | 523 | 236 |
| 06:52:33.843 | p1_clef_r3 | 200 | 346 | 426 | 338 |
| 06:52:34.235 | p1_clef-flash_r3 | 200 | 346 | 365 | 276 |
| 06:52:34.787 | p1_clef_r4 | 200 | 346 | 525 | 408 |
| 06:52:35.148 | p1_clef-flash_r4 | 200 | 346 | 330 | 255 |
| 06:52:35.740 | p1_clef_r5 | 200 | 346 | 561 | 477 |
| 06:52:36.167 | p1_clef-flash_r5 | 200 | 346 | 401 | 321 |
| 06:52:36.391 | invalid_clef_r1 | 400 |  | 195 | 101 |
| 06:52:36.598 | invalid_clef_r2 | 400 |  | 179 | 102 |
| 06:52:37.255 | p2a_bot_ai_crawler_clef | 200 | 568 | 623 | 548 |
| 06:52:37.778 | p2a_bot_ai_crawler_clef-flash | 200 | 568 | 495 | 412 |
| 06:52:38.333 | p2b_bot_wp_login_bruteforce_clef | 200 | 561 | 528 | 453 |
| 06:52:38.893 | p2b_bot_wp_login_bruteforce_clef-flash | 200 | 561 | 535 | 445 |
| 06:52:39.431 | p3_cache_policy_clef | 200 | 580 | 512 | 433 |
| 06:52:40.046 | p3_cache_policy_clef-flash | 200 | 580 | 586 | 478 |
| 06:52:41.107 | p4_comment_moderation_clef | 200 | 404 | 1031 | 742 |
| 06:52:41.562 | p4_comment_moderation_clef-flash | 200 | 404 | 428 | 347 |
| 06:53:30.876 | p5_image_avatar_clef | 422 |  | 369 | 281 |
| 06:53:31.232 | p5_image_avatar_clef-flash | 422 |  | 325 | 225 |
| 06:53:32.041 | p6_logs_4k_clef | 200 | 2445 | 783 | 704 |
| 06:53:32.646 | p6_logs_4k_clef-flash | 200 | 2445 | 576 | 489 |
| 06:53:34.262 | p6_logs_16k_clef | 200 | 2445 | 1585 | 1490 |
| 06:53:35.001 | p6_logs_16k_clef-flash | 200 | 2445 | 712 | 620 |
| 06:53:36.288 | p6_logs_45k_clef | 200 | 2445 | 1251 | 1169 |
| 06:53:37.120 | p6_logs_45k_clef-flash | 200 | 2445 | 800 | 713 |
| 06:55:09.678 | p5_image_avatar_v2_clef | 200 | 587 | 828 | 523 |

### Inferences
- **Hosted overhead dwarfs model time at small inputs.** The hosted model-plus-routing time (about 306 ms for Clef, about 174 ms for Clef-flash) is well above the blog's model latencies (209 ms and 38.8 ms). The gap is plausibly routing from the IAD edge to whichever GPU location serves the model, plus scheduling and serialization; nothing exposed lets me split it further. Clef-flash was only about 1.3× faster end to end (401 vs 525 ms median TTFB) versus 5.4× in the blog's model-only medians.
- **For demos,** expect about 0.4–0.6 s per decision when calling the REST API from outside Cloudflare in US-East. Calling from a Worker (`env.AI.run`) inside Cloudflare's network avoids the external TLS hop (about 85–100 ms here), but this was not measured.
- **The decisions were sensible and usefully calibrated:**

| Case | Clef | Clef-flash |
|---|---:|---:|
| GPTBot-style crawler: P(`ai_crawler`) | 0.80 | 0.93 |
| GPTBot-style crawler: P(block) | 0.54 | 0.75 |
| `/wp-login.php` brute force: P(`malicious`) | 0.98 | 0.97 |
| `/wp-login.php` brute force: P(block) | 0.98 | 0.95 |
| Personalized cart API: P(`bypass`) | 0.97 | 0.93 |
| Personalized cart API: P(cache 0 s) | 0.97 | 0.80 |
| Scam comment: P(`remove`) | 0.94 | 0.86 |
| Scam comment: P(spam) | 0.98 | 0.94 |

  The policy-ambiguous case (whether to block an AI crawler) drew middling probabilities, which is exactly what thresholds and human-review routing need. Clef-flash was usually less certain than Clef on `score` questions: severity confidence 0.50 vs 0.92, safe-TTL 0.58 vs 0.91, brute-force risk 0.24 vs 0.85. On `choice` questions there was no consistent pattern; Clef-flash was more peaked in 2 of 5 cases.
- **Practical consequences of the 2,048-token truncation (as observed 2026-10-03):**
  - Put the decisive evidence first in `state`.
  - Pre-aggregate logs into features (counts, rates, top IPs) instead of raw lines.
  - Expect no error on over-length input; billing uses the truncated count.

  This could be a deliberate service default (like the reference code's `max_state_tokens` parameter) that changes later; re-test before relying on long inputs. The long-log answers in my test say nothing about accuracy, because the model only saw about 19 lines.
- **Self-hosted and hosted outputs will differ on `confidence`** unless you apply the same formula. The probabilities themselves should be comparable.

### Gaps
- I did not test whether structured (object or array) `state` is capped at 2,048 tokens, because the 30-call budget was used up. The docs mention truncation only for "Long text state".
- No server-side timing is exposed (no `server-timing` header), and the GPU location is not exposed.
- All calls came from one location (IAD) in one 3-minute window, with only n = 5 per model, so p95 values are not meaningful.
- I did not test Clef-flash with an image, the Bearer-token auth path, a mismatch between the body `model` and the URL model, or images larger than 330×441.

## 5. Clef's live benchmark site (clef-evals.workers-ai-mle.workers.dev)

### Takeaway
The site is titled "Decision Model Leaderboard". It is a Cloudflare-hosted single-page app that republishes the community **Jev Decision Index 0.2.1** and adds Cloudflare's own Clef rows. **Clef ranks #1 of 73 models (Decision Index 61.21), Jev #2 (57.91) and Clef-flash #5 (57.07).** The site itself flags Clef's scores and latencies as **self-reported**: they were not reproduced by the upstream maintainers and not measured on the board's reference GPU (one NVIDIA RTX PRO 6000).

### Cited Findings
- The page renders client-side from `/data/leaderboard.json`. That file was generated `2026-10-01T15:33:42+00:00` and points to upstream `"label": "Decision Index 0.2.1"` (generated 2026-09-28), upstream URL `huggingface.co/spaces/multimodalart/jev-decision-index`, and upstream hardware `"1 x NVIDIA RTX PRO 6000"`. It covers 73 models, 48 benchmarks, a panel of 38, and five areas: Knowledge & Reasoning, Language Understanding, Retrieval & Classification, Tools & Automation, and Arts & Human Taste. Tabs: Leaderboard, Charts, Benchmarks, Methodology — [Leaderboard](https://clef-evals.workers-ai-mle.workers.dev); [leaderboard.json](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json)
- **Top of the board** (Decision Index, then median / p95 latency in ms):
  1. Clef: 61.21 (209.3 / 238.6), self-reported
  2. Jev: 57.91 (524.1 / 536.0), ECE 0.074, "Hosted API (closed)"
  3. Surogate Rune 26B-A4B v3: 57.44 (120.5 / 682.8)
  4. Decider chat · Gemma-4-31B: 57.33 (108.5 / 1114.7)
  5. Clef-flash: 57.07 (38.8 / 122.4), self-reported
  6. AutoJev-27B: 56.40
  7. simple-jev · Qwen3.8-27B: 55.74
  8. Jebadiah 27B: 54.67

  Further down: Kev 9B 38.48 (51.4 ms) and Laya 6.04 (5.8 ms) — [leaderboard.json](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json)
- **Clef's entries** are of kind "Routing head + LoRA" with source "self-reported", panel coverage 36 of 38, and missing benchmarks 40 and 45 (**iSarcasmEval** and **HLE**), which are scored 0. No ECE or Brier is reported.
  - **Area scores:** Clef 51.2 knowledge, 61.2 language, 62.5 retrieval, 81.2 tools, 47.8 arts. Clef-flash 50.4 / 52.6 / 52.3 / 82.0 / 49.9. Jev 51.4 / 62.0 / 55.4 / 75.1 / 37.7.
  - Source: [leaderboard.json](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json)
- **Site wording on methodology:**
  - "Entries marked Self-reported were run by the model's authors on the same benchmark suite and have not been reproduced by the upstream maintainers. Benchmarks an entry did not run are scored 0".
  - Clef latency "was measured on the authors' own serving stack, not the upstream reference hardware … and is not directly comparable".
  - Scoring: Brier "is converted as clip((0.25 − Brier) / 0.25)"; "gold ★ benchmarks weighted 1.2"; "The Decision Index is 100 × the weighted mean of the five areas".
  - A "Quality vs latency" chart marks the efficient frontier.

  Source: [Leaderboard JS bundle](https://clef-evals.workers-ai-mle.workers.dev/assets/index-Ddq_AEzH.js)
- The blog's headline benchmark tables (BFCL 98.47, BANKING77 94.20, CLINC150+OOS 97.43, and others) come from this run — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/); [Clef model card](https://huggingface.co/Cloudflare/clef)

### Inferences
- **Clef's lead is unreproduced so far.** Its 3.3-point lead over Jev is self-reported, and the best community-run open model (Rune 26B-A4B, 57.44) is within 0.4 points of Clef-flash. Clef-flash's self-reported 38.8 ms median would make it the clear speed/quality standout if reproduced.
- **The board's reference GPU is an edge GPU.** Upstream measures latency on an RTX PRO 6000, the same GPU class Akamai is deploying at the edge (section 7), so a reproducible latency comparison on that card would be a natural demo.

### Gaps
- As of the snapshot, the upstream maintainers had not independently run Clef or Clef-flash.
- The site does not say what hardware Cloudflare used for its self-reported latencies.

## 6. The RL fine-tuning service and Bring-Your-Own-Model via Cog

### Takeaway
The RL service is announced but not self-serve. It starts as hands-on engagements with Cloudflare's forward-deployed engineers (FDE) for design partners, with a self-serve "capture data → fine-tune → redeploy" platform promised later. No pricing, timeline or eligibility details are published, and the interest-form page adds no specifics. Redeploying fine-tuned weights depends on Workers AI's Bring-Your-Own-Model (Cog) path. Cloudflare described that path in April 2026 as tested internally and with some external customers, still in development; I found no public docs page for it.

### Cited Findings
- **The offering (blog):** "We are offering a service to help customers fine-tune Clef to suit their workloads with our hands-on FDE team. From that, we'll learn from our hands-on experiences to build a self-serve platform that customers can use to capture data, fine-tune, and redeploy the model, all on Cloudflare." The blog also calls for design partners: "If you have specific use cases and are already customers of these products — we'd love to chat with you and be design partners" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **Pipeline components (blog):**
  - "Cloudflare AI Gateway – pass all your AI traffic through AI Gateway and automatically create a dataset of requests"
  - "Cloudflare Workers AI – generate rollouts against the base Clef model"
  - "Cloudflare Containers – RL sandbox for scoring and replaying agent actions"
  - "[NEW] Trainer – update weights of fine-tuned Clef model"
  - "Cloudflare Workers AI + BYO Model – redeploy the fine-tuned model on Workers AI"

  The blog refers to "Workers AI's Bring Your Own Model (Cog) work that has been progressing since our acquisition of Replicate" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **Internal target use cases:** Trust & Safety submissions, Support triage, and "built-in to our Bot products to decide if a crawler is a good bot or bad bot" — [Cloudflare blog](https://blog.cloudflare.com/clef-decision-models/)
- **The interest page** has marketing copy ("Fine-tune them with your own data through our new reinforcement learning platform") and a dynamically loaded form. It states no timeline, pricing or eligibility — [Clef RL interest page](https://www.cloudflare.com/resource/clef-rl-interest)
- **BYO via Cog (April 16, 2026 blog):** developers write `cog.yaml` and `predict.py`, run `cog build`, and "push your Cog container to Workers AI". Cloudflare said: "We've been testing this internally with Cloudflare teams and some external customers". It was working on "customer-facing APIs and wrangler commands" and planned "faster cold starts through GPU snapshotting". The same post says "The Replicate team has officially joined our AI Platform team" — [Cloudflare blog: AI Platform](https://blog.cloudflare.com/ai-platform/)
- **The Replicate acquisition** was announced 2025-11-17 (per the press-release URL and title in search results; I did not fetch the release itself) — [BusinessWire](https://www.businesswire.com/news/home/20251117400765/en/Cloudflare-to-Acquire-Replicate-to-Build-the-Most-Seamless-AI-Cloud-for-developers)
- **The Workers AI docs index** lists "Fine-tunes: Run fine-tuned inference on Workers AI using LoRA adapters". I found no BYO-model or Cog page in it as of 2026-10-03 — [Workers AI llms.txt](https://developers.cloudflare.com/workers-ai/llms.txt)

### Inferences
- **For a demo today, "your own fine-tuned Clef on Workers AI" is not self-serve.** The practical routes are to apply as a design partner, or to fine-tune the Apache-2.0 weights elsewhere and self-host them (section 7).
- **AI Gateway logging is effectively the RL data-collection step.** Routing Clef calls through a gateway now builds the request/response dataset the RL product says it will consume.

### Gaps
- No pricing, timeline or GA date has been published for the RL service or for BYO models via Cog.
- It is unknown whether existing Workers AI LoRA-adapter uploads support Clef.

## 7. Can Clef run outside Cloudflare? Self-hosting on any GPU cloud or another edge network, and whether Jev can be self-hosted

### Takeaway
**Yes.** The weights are Apache-2.0, and four working runtimes exist: Cloudflare's PyTorch reference code, llama.cpp (merged, text only), MLX (Apple Silicon), and a community vLLM wrapper. The blockers are engineering, not licensing:
- The joint head is custom Python.
- vLLM, SGLang and TGI have no native "Clef" model.
- Generic GGUF, Ollama or LM Studio paths silently lack the head.
- The reference code handles one request at a time and is tested only to 16k tokens.
- llama.cpp has no vision support yet.

Clef-flash fits a single L40S or 24 GB GPU, so any GPU cloud or edge platform that runs custom containers can host it. Gcore Everywhere Inference offers custom containers on L40S, H100 and A100; Akamai is deploying RTX PRO 6000 Blackwell GPUs. **Jev cannot be self-hosted**: it is a hosted API only.

### Cited Findings
- **License:** Apache-2.0, "following the base model Qwen/Qwen3.8-27B" — [Clef model card](https://huggingface.co/Cloudflare/clef)
- **Reference runtime:** `joint_schema_model.py` plus transformers' `Qwen3_5ForConditionalGeneration`, tested with torch 2.11 and transformers 5.10.2 on a single H200, as described above — [Clef model card](https://huggingface.co/Cloudflare/clef). transformers' auto-mappings include `qwen3_5` (`Qwen3_5ForConditionalGeneration` and others) — [transformers modeling_auto.py](https://github.com/huggingface/transformers/blob/main/src/transformers/models/auto/modeling_auto.py)
- **vLLM:**
  - vLLM's model registry on `main` includes `"Qwen3_5ForConditionalGeneration": ("qwen3_5", ...)`, so the backbone is supported. A search of the same file for "clef" found nothing — [vLLM registry.py](https://github.com/vllm-project/vllm/blob/main/vllm/model_executor/models/registry.py)
  - The latest vLLM on PyPI is 0.30.0 — [PyPI vllm](https://pypi.org/project/vllm/)
  - A community wrapper exists: "`clef_vllm.py` runs the backbone in vLLM as a pooling model (final hidden state of every token) and Clef's joint head on top, in the same process. Needs a Blackwell GPU for NVFP4 and a vLLM build with `Qwen3_5ForConditionalGeneration` (tested: 0.23.1 nightly)" — [simonlehmann/clef-NVFP4](https://huggingface.co/simonlehmann/clef-NVFP4)
- **llama.cpp:** PR #29831, "model: add support for clef decision model (text-only)" by ngxson, has been **merged**. It adds `llama_batch_ext` and `llama_batch_ext_set_decision_order()` to average hidden states over token spans. Known limitations: "No vision support yet" and a single sequence per batch. Serve with `llama serve -hf ggml-org/Clef-GGUF` or `ggml-org/Clef-Flash-GGUF` — [llama.cpp PR #29831](https://github.com/ggml-org/llama.cpp/pull/29831); [ggml-org/Clef-Flash-GGUF](https://huggingface.co/ggml-org/Clef-Flash-GGUF)
- **MLX:**
  - `clef_mlx.py serve` exposes a local `POST /v1/systemone` (Jev/SystemOne-compatible, plus `usage.latency_ms`), `GET /health` and `GET /v1/models`.
  - "Requests run one at a time on the GPU. There is no authentication".
  - Inputs are truncated to 16,384 tokens by default. Images can be data URLs, base64 or http(s) URLs; video is not supported over HTTP.

  Source: [mlx-community/clef-flash-4bit](https://huggingface.co/mlx-community/clef-flash-4bit)
- **FP8 for vLLM:** "FP8 (W8A8, dynamic) quantization … This repo quantizes only the backbone's linear layers", made with LLM Compressor — [prithivMLmods/clef-FP8](https://huggingface.co/prithivMLmods/clef-FP8)
- **The base backbone's ecosystem:** "compatible with Hugging Face Transformers, vLLM, SGLang, TokenSpeed" — [Qwen3.8-27B card](https://huggingface.co/Qwen/Qwen3.8-27B). The base repo carries `deploy:sagemaker` and `deploy:azure` tags, and Clef carries `endpoints_compatible` — [HF API Qwen3.8-27B](https://huggingface.co/api/models/Qwen/Qwen3.8-27B); [HF API clef](https://huggingface.co/api/models/Cloudflare/clef?blobs=true)
- **Gcore Everywhere Inference:**
  - The docs list GPU flavors "1xL40S, 2xL40S, 1xH100, 2xH100, 4xH100, 1xA100, 2xA100, 4xA100" and vGPUs, "custom models", container registries and "anycast endpoints". "Smart Routing selects the closest inference region through a single endpoint". "If a pod in one region goes down, requests are automatically routed to the next-closest inference region." Available hardware "depend[s] on your account limits and region" — [Gcore docs: Everywhere Inference](https://docs.gcore.com/edge-ai/everywhere-inference)
  - The product page: "smart routing powered by Gcore's CDN network of over 210 PoPs worldwide", "per-second GPU billing", and "bring your own custom models" — [Gcore Everywhere Inference](https://gcore.com/everywhere-inference)
  - Gcore's Hugging Face deployment guide, per a search-result summary (the page itself returned 404 after a redirect): Deploy custom model → Docker image URL plus startup command, container port 7860, a flavor such as "1x L40S / 16 vCPU / 232GiB RAM", and a routing placement — [Gcore docs (search result)](https://gcore.com/docs/cloud/inference-at-the-edge/deploy-models/deploy-huggingface-models)
- **Akamai Inference Cloud,** from search-result summaries only (both direct fetches of the press release failed with a 503 and a stream error): "NVIDIA RTX PRO 6000 Blackwell Server Edition GPUs" with BlueField-3 DPUs, "thousands" of GPUs, an edge network of "over 4,400 locations", and a three-tier architecture spanning far edge, cloud IaaS and dedicated GPU clusters — [Akamai press release](https://www.ir.akamai.com/news-releases/news-release-details/akamai-deploy-thousands-nvidia-blackwell-gpus-create-one-worlds); [CRN Asia](https://www.crnasia.com/india/news/2026/akamai-takes-ai-inference-to-the-edge-with-nvidia-powered-grid-across-4-400-locations)
- **Jev:** a summary of Typesafe's launch post says Jev is available only as a hosted API, with Typesafe "opening early access" and bringing developers "off the waitlist". No open weights, on-premises, VPC or self-hosted option is mentioned. Pricing is "$0.042 / MTok" for input, with output "FREE (too cheap to meter)" — [Typesafe blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev). The Cloudflare leaderboard labels Jev "Hosted API (closed)" — [leaderboard.json](https://clef-evals.workers-ai-mle.workers.dev/data/leaderboard.json)

### Inferences
- **Self-hosting recipe for any GPU cloud or edge platform (estimate).**
  1. Build a container with Python, torch, transformers ≥5.10 and `joint_schema_model.py`. Add a small HTTP server that implements `POST /v1/systemone`, so clients written for Jev, Clef or Workers AI can switch with minimal changes. For text-only use, `llama serve` with ggml-org GGUFs works instead; for throughput, the community `clef_vllm.py` with FP8 or NVFP4 weights.
  2. Hardware: Clef-flash at BF16 on 1× L40S or a 24 GB card; Clef at FP8 on 1× L40S, or at BF16 on 1× H100 80 GB or RTX PRO 6000 96 GB.
  3. Add authentication, request batching, autoscaling, multi-region replicas and anycast or geo routing.

  On Gcore this maps to a "custom model" container on a 1×L40S flavor with Smart Routing. On Akamai it would be the RTX PRO 6000 nodes, whose 96 GB (assumed spec) holds even BF16 Clef.
- **Practical blockers to plan for:**
  - No official production server.
  - The head loops over records in Python.
  - Behavior is tested only to 16k tokens.
  - llama.cpp lacks vision.
  - Generic GGUFs lack the head.
  - No native TGI support was found.
  - To match Workers AI outputs exactly, you must replicate its `confidence` formula and its 2,048-token state cap (or deliberately not).
- **Economics vs. Workers AI (estimate, needs GPU prices I did not research).** At $0.24 per M tokens, Workers AI charges $240 per billion Clef input tokens. A dedicated GPU only wins if it processes enough tokens per hour, so at low or bursty volume Workers AI (or Gcore's per-second billing) is likely cheaper; at sustained high QPS self-hosting can win.
- **Openness is Clef's structural differentiator against Jev.** It is the only one of the two that can run on-premises, in a sovereign cloud, or on a competing edge network such as Gcore or Akamai.

### Gaps
- I found no evidence of TGI or SGLang support specifically for Clef; I did not check exhaustively.
- I did not research AWS deployment specifics (SageMaker or EC2 instance types, prices); only HF deploy tags were observed, and those are on the base model.
- Gcore and Akamai GPU pricing and the number of GPU-equipped locations were not obtained. Gcore deployment-guide details and all Akamai details come from search summaries, because direct fetches failed.
- No one has published self-hosted Clef latency on L40S or H100, so I cannot compare edge self-hosting against Workers AI on latency.
