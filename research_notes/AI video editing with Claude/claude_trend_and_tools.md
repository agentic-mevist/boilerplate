# Is "AI video editing with Claude / Claude Code" a real, measurable trend? Fact sheet, tools landscape, and the editor profession (as of 2026-11-07)

Method note: Primary data was pulled live on 2026-11-07. GitHub star counts come from the GitHub search API; direct repo endpoints were blocked in this session. Monthly npm totals are summed from api.npmjs.org/downloads/range, which only returns about 18 months, so the earliest month is May 2025. Search volumes come from DataForSEO (Google Ads search_volume/live, location 2840 = US, English, monthly data through Sep 2026) and Google Trends (DataForSEO google_trends/explore/live, no location set, so probably worldwide; values are relative 0–100 within each query). The raw JSON is in the session scratchpad, not in this repo. Everything else has an inline URL. Items marked **[UNVERIFIED]** come from secondary or aggregator sources I could not check against a primary source.

---

## 1. Has Anthropic published usage data that mentions video, media, design or creative work? And what are the Claude Code growth stats?

### Takeaway
No. Anthropic has **not** published any statistic on "video editing" as a Claude use case. The Economic Index reports cover coding, writing and occupations, and the only video mention found is "short-form video scripts" as a work-related *creative writing* output. What Anthropic *has* done is product moves: Claude for Creative Work connectors (Adobe incl. Premiere, Blender) on Apr 28, 2026, a qualitative study of creatives (Dec 2025), and fast Claude Code growth disclosures. Any claim that "Anthropic says X% of people edit video with Claude" is unsupported.

### Cited Findings
**Economic Index editions (all checked by title and date)**
- Feb 10, 2025: Economic Index launched ("a new initiative aimed at understanding AI's impact on the economy over time") — [Anthropic on X](https://x.com/AnthropicAI/status/1888954159711313920?lang=en); original paper "Which Economic Tasks are Performed with AI?" — [PDF](https://www-cdn.anthropic.com/bf94fda13a76566aa55fceb3ca40cb79a50b6bcd.pdf)
- Sep 15, 2025: "Uneven AI adoption", a geography report plus a first look at enterprise API use. 77% of API transcripts showed automation patterns, versus about 50% on Claude.ai — [Anthropic](https://www.anthropic.com/research/anthropic-economic-index-september-2025-report); 77% figure via [Campus Technology](https://campustechnology.com/articles/2025/09/17/anthropic-study-tracks-ai-adoption-across-countries-industries.aspx)
- Jan 15, 2026: "Economic primitives", covering Nov 2025 data — [Anthropic](https://www.anthropic.com/research/anthropic-economic-index-january-2026-report)
- Mar 24, 2026: "Learning curves", sample Feb 5–12, 2026:
  - Coding is still the most common use. Computer & Mathematical tasks are 35% of Claude.ai conversations, down 18% since Aug 2025, while their share of first-party API traffic rose 14%. Claude Code "now represents a large share" of sampled API traffic (no exact figure).
  - The top-10 Claude.ai tasks fell from 24% to 19% of conversations, i.e. use is diversifying. Personal use rose from 35% to 42%.
  - About 49% of jobs have had at least 25% of their tasks done with Claude.
  - No video, design or media task statistics appear in the main text.
  - Source: [Anthropic](https://www.anthropic.com/research/economic-index-march-2026-report)
- Jun 26, 2026: "Cadences", with a survey of about 9,700 linked respondents:
  - Work-related creative writing (13% of creative writing) is "mostly short-form video scripts, screenwriting, and speeches". **This is the only explicit video mention found in Anthropic usage research.**
  - Over 80% of creative-writing conversations are personal. Marketing content is 80% work-related and blogs/articles 81%.
  - 54% of Claude Code sessions are served by Opus, versus 10% of chat and Cowork conversations.
  - Survey: productivity gains reported in speed 86%, scope 82%, quality 69%. 57% say AI made their skills more valuable.
  - The text names no Arts/Design/Media occupational share.
  - Source: [Anthropic](https://www.anthropic.com/research/economic-index-june-2026-report)
- Occupational share for "Arts, Design, Entertainment, Sports, and Media": Google's snippet of the interactive Economic Index page shows **14.5%** — [anthropic.com/economic-index](https://www.anthropic.com/economic-index). **[UNVERIFIED]** The page did not render when fetched. An aggregator gives 13.6% — [azvai](https://azvai.com/en/generative-ai-usage-anthropic-economic-index/). Neither figure can be tied to a specific report date. This category is mostly writing and design work, not video.
- Clio, the privacy-preserving usage analysis tool, was introduced Dec 12, 2024 — [Anthropic](https://www.anthropic.com/research/clio). It was renamed "Anthropic Insights" and opened to independent researchers Aug 26, 2026 — [Anthropic](https://www.anthropic.com/research/enabling-independent-research). No Clio output on video editing was found.

**Qualitative study of creatives**
- Anthropic Interviewer study (Dec 4, 2025): 1,250 professionals, including 125 creatives.
  - 97% of creatives said AI saved time and 68% said it improved quality. 70% mentioned managing peer judgment about AI use.
  - All 125 wanted to stay in control of their outputs. Filmmakers were in the sample but not analysed separately, and there were no video-editor-specific findings.
  - Participants were recruited via crowdwork platforms, which may bias responses positive.
  - Source: [Anthropic](https://www.anthropic.com/research/anthropic-interviewer)

**Product and partnership moves relevant to video**
- **Claude for Creative Work** (Apr 28, 2026): connectors for Ableton, **Adobe for creativity (50+ tools across Creative Cloud incl. Photoshop, Premiere, Express)**, Affinity by Canva, Autodesk Fusion, **Blender**, Resolume Arena, Resolume Wire, SketchUp and Splice. The post gives no usage stats. Quote: "Claude can't replace taste or imagination, but it can open up new ways of working" — [Anthropic](https://www.anthropic.com/news/claude-for-creative-work); coverage in [9to5Mac](https://9to5mac.com/2026/04/28/anthropic-releases-9-new-claude-connectors-for-creative-tools-including-blender-and-adobe/). An update dated May 1 says Anthropic's contribution to Blender was a one-time donation.
- Adobe's own announcement of the connector is [Adobe blog, Apr 28, 2026](https://blog.adobe.com/en/publish/2026/04/28/adobe-for-creativity-connector). The Adobe help page (Sep 24, 2026) lists Acrobat, Express, Photoshop, Lightroom, Illustrator, Firefly, Premiere and InDesign — [Adobe HelpX](https://helpx.adobe.com/creative-cloud/apps/integration-with-other-apps/adobe-connectors/adobe-for-claude.html).
  - Caveat: a third party (May 1, 2026) argued that at launch the connector "operates at Adobe Express level, not Photoshop or Premiere" — [MindStudio](https://www.mindstudio.ai/blog/claude-mcp-adobe-vs-photoshop-premiere-what-it-does). Premiere depth may have grown since; not verified.
- DaVinci Resolve 21.1 added an "AI integration" that connects to assistants such as Claude and ChatGPT for project management and review tasks — [Blackmagic What's New](https://www.blackmagicdesign.com/products/davinciresolve/whatsnew); description from [YouTube: What's New in DaVinci Resolve 21.1](https://www.youtube.com/watch?v=Wi44XLKQ3YA). **[Partly unverified]** I did not see the exact scope.
- No Anthropic-authored blog post or case study about Remotion or video editing was found. Remotion's own docs, not Anthropic's, are the main "Claude Code makes videos" source — [Remotion docs: Prompting videos with coding agents](https://www.remotion.dev/docs/ai/coding-agents).

**Claude Code and Anthropic growth (official disclosures)**
- Feb 12, 2026 (Series G, $30B at $380B post-money): "Claude Code's run-rate revenue has grown to over $2.5 billion; this figure has more than doubled since the beginning of 2026." Weekly active Claude Code users had doubled since Jan 1 — [Anthropic](https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation)
- Claude Code reached a $1B run-rate in Nov 2025 — [aibusinessweekly (secondary)](https://aibusinessweekly.net/p/claude-code-statistics)
- Anthropic's company run-rate:
  - Surpassed $30B, up from $9B at end of 2025 — [Anthropic on X](https://x.com/AnthropicAI/status/2041275563466502560?lang=en) (Apr 2026)
  - Topped $65B by end of July 2026 — [Reuters, Aug 17, 2026](https://www.reuters.com/technology/anthropic-revenue-run-rate-tops-65-billion-source-says-2026-08-17/) (source-based, not an official release)
- Third-party claims, all **[UNVERIFIED]**:
  - Claude Code had "2 million+ weekly active users (May 2026)" — [fatjoe](https://fatjoe.com/blog/claude-ai-stats/)
  - "No official daily, weekly, or monthly active user number as of October 1, 2026" — [presenc.ai](https://presenc.ai/research/claude-code-usage-statistics-2026)
  - Claude had 312.4M MAU in Oct 2026 — [First Page Sage](https://firstpagesage.com/reports/claude-usage-statistics/)

### Inferences
- The creator's question "Has Anthropic published usage stats on video editing?" has a clear answer: **no**. Anthropic's taxonomy (O*NET tasks and artifacts) doesn't isolate video editing. Video-related Claude use probably shows up as "coding" (Remotion, ffmpeg scripts in Claude Code) or "creative writing" (scripts).
- Anthropic's strategic signal is the Apr 2026 creative connectors plus Adobe and Blackmagic integrations. The company is positioning Claude *inside* creative tools rather than as a video editor itself.

### Gaps
- The exact current Arts/Design/Media share and its date could not be confirmed, because the interactive page did not render.
- No official Claude Code user count was found beyond "WAU doubled since Jan 1" (Feb 2026). Revenue updates after February are company-level only.
- The Jan 15, 2026 Economic Index report was not fetched in full, so it might contain task-level detail on media or design.

---

## 2. Trend evidence: search volume, Google/YouTube Trends, GitHub, npm, and the Remotion Agent Skills launch

### Takeaway
**The trend is real and measurable, but it sits in a niche and is concentrated in the "video-as-code" tooling layer, not mass-market search.**
- Remotion npm downloads grew about 17x between Dec 2025 and Oct 2026, with the inflection exactly at the Jan 20, 2026 Agent Skills launch.
- New agent-native video repos have tens of thousands of GitHub stars.
- On **YouTube search**, "claude video editing" jumped in Sep–Oct 2026, to about 30% of the volume of the generic "ai video editing" term in the latest week.
- However, the Claude-specific phrases are below Google Ads' reporting threshold on web search. Generic "ai video editing" (about 3k/mo US) is flat, and CapCut gets about 1M searches a month. So a creator who watches AI/dev YouTube *is* in a bubble relative to mainstream editing, but the bubble is growing fast.

### Cited Findings
**Remotion Agent Skills launch (Jan 20, 2026)**
- Remotion announced "Remotion now has Agent Skills – make videos just with Claude Code!" — [Remotion on X](https://x.com/Remotion/status/2013626968386765291). Install with `npx skills add remotion-dev/skills` — [Remotion docs](https://www.remotion.dev/docs/ai/skills)
- The GitHub repo `remotion-dev/skills` was created 2026-01-19 and has **6,505 stars** as of 2026-11-07 (GitHub API).
- Install counts:
  - skills.sh lists **765.0K total installs** for `remotion-best-practices` as of 2026-11-07 — [skills.sh](https://www.skills.sh/remotion-dev/skills/remotion-best-practices)
  - An earlier snapshot reported about 150K installs within 8 weeks and 440K+ by Aug 5, 2026 — [ngram](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation) (vendor blog that sells a Remotion-based product)
- Virality: "6 million views on X within 48 hours" — **[UNVERIFIED]**. It is cited by ngram, which credits StartupHub.ai, and the article is internally inconsistent ("in days" vs "within 48 hours") — [ngram](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation)
- Remotion founder Jonny Burger on X: "Remotion Skills were an accidental success" — [X profile @JNYBGR](https://x.com/JNYBGR?lang=en)
- Podcast description: "Remotion went viral in the Claude ecosystem when they released agent skills… thousands of non-coders prompting videos" — [YouTube](https://www.youtube.com/watch?v=bGIPS6iQjHM)
- Remotion is free for individuals and companies with 3 or fewer people; larger companies need a license starting at $500/mo — [Remotion pricing](https://www.remotion.dev/docs/license/pricing)
- Remotion's investor page gives no revenue figure. It says only that the company was "slightly profitable" in 2024, "grew significantly" in 2025, and "thanks to AI we are moving faster than ever" — [Remotion investors](https://www.remotion.dev/docs/investors)

**npm monthly downloads (api.npmjs.org, summed by month; Nov 2026 is partial, 1–6 Nov)**

| Package | May 2025 | Dec 2025 | Jan 2026 | Feb 2026 | Apr 2026 | Jun 2026 | Aug 2026 | Oct 2026 |
|---|---|---|---|---|---|---|---|---|
| `remotion` | 254k | 569k | 877k | 1.43M | 2.75M | 4.85M | 7.45M | **10.0M** |
| `@remotion/cli` | 168k | 358k | 553k | 955k | 1.66M | 3.24M | 5.15M | 6.97M |
| `@remotion/renderer` | 202k | 422k | 622k | 1.07M | 1.92M | 3.66M | 5.90M | 8.27M |
| `hyperframes` (HeyGen) | 0 | 0 | 0 | 0 | 87k | 1.40M | 1.10M | **3.85M** |
| `@revideo/core` | 2k | 2k | 3k | 6k | 7k | 19k | 39k | 133k |
| `@motion-canvas/core` | 1k | 2k | 3k | 2k | 3k | 34k | 11k | 30k |

Source: [api.npmjs.org/downloads/range/…/remotion](https://api.npmjs.org/downloads/range/2025-05-01:2026-11-06/remotion) (and the same endpoint for each package). Caveat: npm counts include CI and automated installs, not unique users.

**GitHub stars (GitHub search API, 2026-11-07; star counts can be inflated and there is no history)**

| Repo | Stars | Created |
|---|---|---|
| anthropics/skills | 188,270 | 2025-09-22 |
| 3b1b/manim | 96,219 | 2015-03-22 |
| heygen-com/hyperframes ("Write HTML. Render video. Built for agents.") | 80,209 | 2026-03-10 |
| calesthio/OpenMontage ("open-source, agentic video production system") | 77,847 | 2026-03-29 |
| remotion-dev/remotion | 71,355 | 2020-06-23 |
| ManimCommunity/manim | 42,314 | 2020-05-19 |
| browser-use/video-use ("Edit videos with coding agents") | 30,670 | 2026-04-12 |
| motion-canvas/motion-canvas | 19,712 | 2022-08-03 |
| Vincentwei1021/video-shotcraft (Claude Code/Codex video skill) | 17,522 | 2026-07-19 |
| jub0t/Concat (open-source editor) | 14,908 | 2026-08-25 |
| kajisho5/ffmpeg-skill (42 FFmpeg tools for coding agents) | 4,688 | 2026-09-03 |
| samuelgursky/davinci-resolve-mcp | 3,974 | 2025-03-18 |
| diffusionstudio/editor ("The VS Code of video editing, built for agents") | 3,482 | 2026-07-07 |
| FireRedTeam/FireRed-OpenStoryline (AI editing agent) | 3,642 | 2026-02-07 |
| 0xsline/OpenChatCut (conversational editor) | 2,962 | 2026-07-15 |
| nateherkai/herk-edit-kit (edit reels/Shorts with Codex/Claude) | 2,613 | 2026-04-18 |
| jordanrendric/claude-video-vision (Claude Code plugin to watch videos) | 1,470 | 2026-03-31 |
| ChatCut-Inc/agent-plugin (MCP for Codex/ChatGPT/Claude) | 1,014 | 2026-06-25 |
| Dakkshin/after-effects-mcp | 862 | 2025-04-12 |
| hetpatel-11/Adobe_Premiere_Pro_MCP | 828 | 2025-07-07 |
| leancoderkavy/premiere-pro-mcp | 492 | 2026-02-27 |

- The GitHub search for "claude video editing" returns 938 repos; "premiere mcp" 124; "after effects mcp" 138; "davinci resolve mcp" 133; "ffmpeg mcp" 612.
- ahujasid/blender-mcp and redotvideo/revideo could not be queried in this session.
- A conflicting figure: ngram (Aug 2026) cites Remotion at "25,300 GitHub stars" with no source — [ngram](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation). The live API shows 71,355, so the 25.3K figure looks stale (pre-2026). If both are accurate, Remotion nearly tripled its stars in 2026; this is not confirmed.

**Google search volume (US, Google Ads via DataForSEO; monthly)**
- "claude video editing", "claude code video", "claude remotion", "remotion claude", "video editing with claude", "claude code video editing", "premiere pro mcp", "davinci resolve mcp" and "remotion skills" all returned **no volume**, i.e. below Google Ads' reporting threshold in the US.
- "remotion": Oct–Dec 2025 = 2,400 / 1,900 / 2,400; Jan 2026 = **18,100**; Mar–Apr 2026 = **22,200**; Sep 2026 = 14,800. That is a roughly 8x step-change at the skills launch.
- "hyperframes": about 200–300 until Mar 2026, then 8,100–12,100 a month from Apr to Sep 2026.
- "ai video editing" / "ai video editor": flat at 2,900–3,600 (spike to 5,400 in Jan 2026).
- "claude code": 201K (Oct 2025), 1.0M (Mar 2026 peak), 301K (Sep 2026).
- Benchmarks: "descript" 74K–90.5K; "opus clip" about 90.5K; "capcut" 823K–1.22M.

**Google Trends via DataForSEO (relative 0–100, weekly)**
- Web, Jun 2025–Nov 2026, comparing "claude video editing", "claude remotion", "hyperframes" and "remotion":
  - "remotion" rose from 2–4 (2025) to 22 (Jan 2026) and peaked at 96 (early May 2026). It was 24–29 in Sep–Oct 2026.
  - "claude video editing" rose from about 1 to 4–5 (Mar–Jun 2026), dipped to 2, then returned to 5 (mid-Oct 2026).
  - "hyperframes" rose from 3 (Apr) to 17 (mid-Oct 2026), its high.
- **YouTube search**, Nov 2024–Nov 2026, comparing "claude video editing", "claude remotion", "claude code video" and "ai video editing":
  - Claude terms were null before Jan 2026, then 1–4 from Jan to Aug 2026.
  - In the week of Sep 27, "claude video editing" was 9 and "claude code video" 9. In the week of **Oct 25, 2026, "claude video editing" was 26** and "claude code video" 12, against "ai video editing" at 84.
  - "ai video editing" itself grew from 23 (Nov 2024) to 91 (Sep 2026).

**Content-supply signals (creator videos)**
Examples of the genre:
- "Claude + Remotion Just RETIRED video editors…" — [YouTube](https://www.youtube.com/watch?v=oWkUwno6b0E)
- "How people are generating videos with Claude Code (Remotion Skill)" — [YouTube](https://www.youtube.com/watch?v=7OR-L0AySn8)
- "Replace Your Video Editor With AI: HeyGen Hyperframes" — [YouTube](https://www.youtube.com/watch?v=qiek-fBv924)
- "Claude Code just replaced my entire video editing workflow" — [Instagram reel](https://www.instagram.com/reel/DWmtFZNk3n3/)
- A Reddit user produced 13 minutes of motion graphics with Remotion + Claude — [r/reactjs](https://www.reddit.com/r/reactjs/comments/1qzadb5/used_remotion_claude_to_produce_13_min_of_clean/)

### Inferences
- The strongest hard evidence of real usage (not just hype) is the npm curve: about 0.5M a month before the skills launch, about 10M a month in Oct 2026, with a parallel rise in `hyperframes` to 3.85M. That growth is too large to be organic Remotion developer adoption alone.
- But the user base is mostly developers and technical creators. Demand-side web search for Claude video editing is tiny compared with CapCut (about 1M/mo) or Descript (about 90K/mo).
- The YouTube-search spike in Sep–Oct 2026 shows the creator perceives something real. It also means *creator content about it* is growing faster than mainstream demand, which is the "bubble" dynamic.
- Most of what YouTube calls "editing with Claude" is really **motion graphics and video-as-code generation** (explainers, product promos, captions, title cards), plus **automated rough cuts** (filler-word removal, silence cutting via ffmpeg or video-use). It is not narrative or timeline editing.

### Gaps
- There is no historical star data, so star *growth* rates can't be computed (the API gives current counts only). The skills.sh install count can't be broken down by agent (Claude vs Codex vs Cursor) from the live page. ngram's March per-agent snapshot (Claude Code about 108K, Gemini CLI about 108K, Cursor, OpenCode and Codex about 92–93K) is **[UNVERIFIED]**.
- No Anthropic or Remotion figure exists for how many Claude users render videos.
- The Trends location for the Trends queries is unclear (no location was set, so probably worldwide).

---

## 3. Tools landscape (late 2026)

### Takeaway
There are four layers.
- **(a)** Code- and agent-native "video as code" tools (Remotion, HyperFrames, video-use, OpenMontage, ffmpeg skills, Manim, Motion Canvas, Revideo, Blender via MCP or connector) driven by Claude Code or Codex.
- **(b)** AI-native editors (Descript Underlord, CapCut, Opus Clip, ChatCut and others) that add chat agents.
- **(c)** Incumbents (Adobe Premiere/After Effects, DaVinci Resolve) adding in-app AI assistants *and* opening to Claude through connectors and MCP.
- **(d)** Generative video models (Veo 3.1, Kling 3/4, Seedance 2.x, Runway, Luma, Wan). Sora's consumer app and API were discontinued in 2026.

There is no single "Pencil.dev for video" winner yet, but several candidates explicitly use the framing: diffusionstudio "VS Code of video editing, built for agents", HyperFrames "built for agents", ChatCut and OpenChatCut.

### Cited Findings
**(a) Code-based and agentic**
- **Remotion**: React framework (stars and npm above). Agent Skills since Jan 20, 2026. It works with Claude Code, Codex, Kimi Code, OpenCode and Cursor — [Remotion docs](https://www.remotion.dev/docs/ai/coding-agents). There is a prompt showcase — [remotion.dev/prompts](https://www.remotion.dev/prompts).
- **HyperFrames (HeyGen)**: "free, open-source framework for turning HTML, CSS, media, and seekable animations into deterministic MP4 videos", designed so an AI agent builds an editable project — [GitHub](https://github.com/heygen-com/hyperframes), [docs](https://hyperframes.heygen.com/introduction). Repo created Mar 10, 2026; 80.2K stars; npm 3.85M in Oct 2026.
- **video-use (browser-use)**: "edit videos with Claude Code… Drop raw footage in a folder, chat with Claude Code, get final.mp4 back". It cuts filler words and dead space, color grades and adds subtitles — [GitHub](https://github.com/browser-use/video-use). Created Apr 12, 2026; 30.7K stars.
- **OpenMontage**: "open-source, agentic video production system", 77.8K stars (created Mar 29, 2026) — [GitHub](https://github.com/calesthio/OpenMontage).
- **ffmpeg skills/MCPs**: e.g. kajisho5/ffmpeg-skill, "Local video editor for coding agents: 42 FFmpeg tools" (4.7K stars) — GitHub search results above.
- **Motion Canvas** (19.7K stars) and **Revideo** (a fork; `@revideo/core` npm rose from 2K to 133K a month in 2026) — npm/GitHub data above.
- **Manim** (3b1b 96K, Community 42K stars) is a math-animation engine and a common Claude Code target.
- **Blender**: official Claude connector (Apr 28, 2026) — [Anthropic](https://www.anthropic.com/news/claude-for-creative-work). The community repo ahujasid/blender-mcp exists but its stars were not retrievable.
- **Claude "vision" for video**: jordanrendric/claude-video-vision, "Give Claude the ability to watch and understand videos" — GitHub search above.

**(b) AI-native editors**
- **Descript Underlord**: an agentic co-editor for rough cuts, clips, filler removal, translation and lip-sync. Descript added an API and agentic automation (May 2026) — [VP-Land](https://www.vp-land.com/stories/descript-adds-an-api-and-agentic-automation-to-its-text-based-video-editor), [Descript](https://www.descript.com/underlord)
- **CapCut**: AI editing (AutoCut, AI Edit, AI Extend, Dreamina generation) — [CapCut AI tools](https://www.capcut.com/tools/ai-tools). It has the largest search footprint, about 1M/mo in the US (DataForSEO).
- **Opus Clip**: about 90.5K US searches a month (DataForSEO).
- **ChatCut**: an "AI video editor for agents", with a plugin/MCP for Codex, ChatGPT and Claude — [GitHub](https://github.com/ChatCut-Inc/agent-plugin)
- **Eddie AI** (heyeddie.ai) publishes Resolve AI-tool comparisons, a sign it positions itself as an assistant editor — [heyeddie](https://www.heyeddie.ai/blog/ai-tools-in-davinci-resolve)
- **Riverside** imports up to 4-hour files; Descript Business takes 50 GB files — [Loopdesk](https://www.loopdesk.ai/blog/best-ai-video-editor-long-form) (secondary)
- Submagic, Captions, Gling: not researched in depth; no primary data gathered.

**(c) Incumbents**
- **Adobe**:
  - New Creative Agent and Firefly innovations (Apr 15, 2026) — [Adobe newsroom](https://news.adobe.com/news/2026/04/adobe-new-creative-agent)
  - Creative Agent expansion and AI assistants in public beta across Creative Cloud (Jun 18, 2026) — [Adobe newsroom](https://news.adobe.com/news/2026/06/adobe-unveils-major-expansion); [ProVideo Coalition](https://www.provideocoalition.com/premiere-ai-assistant/)
  - IBC release (Sep 8, 2026): Generative Media Tool in the Premiere timeline (Generate Video fills gaps; Generate Sound Effects; Soundscape and Music in beta), with **partner models Google Veo, Kling, Runway and Luma** alongside Firefly; AI audio tools in public beta; **AI Assistant in Premiere** (organizing, batch renaming, markers); **AI Assistant in After Effects (public beta)**. The release itself does not mention MCP or Claude — [Adobe blog](https://blog.adobe.com/en/publish/2026/09/08/generate-create-directly-in-your-timeline-with-new-ai-powered-innovations-in-premiere-after-effects)
  - Generative Extend now accepts 360p–4K sources — [Adobe HelpX](https://helpx.adobe.com/premiere/desktop/edit-projects/edit-with-generative-ai/generative-extend-overview.html)
  - Separately, the Adobe for Claude connector (Apr 2026) is covered in section 1.
- **DaVinci Resolve 21** (NAB, Apr 13, 2026): IntelliSearch (search people and objects), AI Speech Generator, CineFocus, de-aging and blemish removal — [RedShark](https://www.redsharknews.com/davinci-resolve-21-nab-2026-photo-page-ai-tools); [Blackmagic forum](https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=234676). **21.1 adds assistant integration with Claude/ChatGPT** — [Blackmagic](https://www.blackmagicdesign.com/products/davinciresolve/whatsnew). Community MCP: samuelgursky/davinci-resolve-mcp (about 4K stars).
- **Premiere / After Effects community MCPs**: 124–138 repos each. Top ones have about 830–860 stars (GitHub search above).
- Final Cut Pro: not researched; no data gathered.

**(d) Generative video**
- **Sora**: OpenAI announced its shutdown on Mar 24, 2026. The web and app were discontinued **Apr 26, 2026** and the API **Sep 24, 2026** — [OpenAI Help](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation); [CNBC](https://www.cnbc.com/2026/03/24/openai-shutters-short-form-video-app-sora-as-company-reels-in-costs.html); [TechCrunch](https://techcrunch.com/2026/03/24/openais-sora-was-the-creepiest-app-on-your-phone-now-its-shutting-down/)
- Current leaders, per secondary reviews **[secondary, not benchmarked by me]**: Veo 3.1, Runway, Kling (3.0/4.0), Seedance (2.0/2.5) and Wan 3.0 as of Oct 2026 — [shattered.io](https://shattered.io/best-ai-video-generators-kling-4-veo-3-1-sora-shutdown-2026/). In Feb 2026, four of six major models generated synchronized audio natively — [Medium/cliprise](https://medium.com/@cliprise/the-state-of-ai-video-generation-in-february-2026-every-major-model-analyzed-6dbfedbe3a5c)
- Higgsfield prompt skills exist for Claude, e.g. OSideMedia/higgsfield-ai-prompt-skill (869 stars), so Claude also acts as a prompt engineer for generators.

**"Pencil.dev for video" analogy**
- In design, Pencil.dev (now pen.dev) is "an agentic canvas… Design with Claude, ChatGPT…" — [pen.dev](https://pen.dev/); [Pencil docs](https://docs.pencil.dev/design-and-code/design-to-code). OpenPencil is an open-source editor that opens Figma files and lets an AI agent drive layers — [openpencil.dev](https://openpencil.dev/).
- The incumbent responded: Figma shipped its own Design Agent with code-to-canvas on May 20, 2026 — [Figma blog](https://www.figma.com/blog/the-figma-agent-is-here/).
- Video equivalents:
  - diffusionstudio/editor, "The VS Code of video editing, built for agents" (Jul 2026, 3.5K stars)
  - HyperFrames
  - OpenChatCut, a "conversational AI video editor with a professional multi-track timeline"
  - ChatCut
  - Concat, an open-source local-first editor (14.9K stars, Aug 2026)
  - Sources: the GitHub search results above.
- Incumbents are mirroring Figma's move: Adobe AI Assistant in Premiere and After Effects, and Resolve 21.1's Claude/ChatGPT integration.

### Inferences
- The "Pencil.dev for video" slot is contested but undecided. Agent-native challengers own the *motion-graphics / programmatic* niche (Remotion, HyperFrames). Incumbents still own the *timeline / footage* editing niche and are defending it by plugging in Claude and other agents, the same pattern as Figma.
- Claude's role is that of an orchestrator (writing code, driving ffmpeg/MCP, prompting generators), not a video model. Anthropic has no video-generation model.

### Gaps
- No user or revenue numbers were found for ChatCut, Eddie AI, Submagic, Captions or Gling.
- Final Cut Pro's AI and MCP status was not researched.
- Generative model rankings come from secondary blogs.

---

## 4. What is happening to the video editor profession?

### Takeaway
Demand data shows **growth in both AI-video work and human editing**, not collapse.
- Upwork: AI video generation/editing demand +329% year over year.
- Fiverr (H1 2026): video editing +36% and short-form editing +27%, alongside AI video ads +63% and Claude Code specialists +938%.
- Surveys show AI is already near-universal among creators and marketers, but humans keep final creative control.
- Hollywood's highest-profile voice, Ben Affleck, went from "AI is a craftsman at best" (Jan 2026) to selling his AI post-production startup to Netflix for $587M and using AI "for lots of things" in his own film. That supports "AI as a post-production tool, not a replacement".

### Cited Findings
**Freelance platforms**
- Upwork In-Demand Skills 2026 (Feb 4, 2026): "AI video generation and editing (+329%)" year-over-year demand growth — [Upwork IR](https://investors.upwork.com/news-releases/news-release-details/upworks-demand-skills-2026-demand-top-ai-skills-more-doubles-ai). This is from the search snippet; the page returned 403 when fetched.
- Upwork Future Workforce Index 2026 (Jul 14, 2026): AI is "rewarding workers who go beyond execution" — [Upwork](https://www.upwork.com/research/research-future-workforce-index-2026)
- Fiverr Business Trends Index (Jun 9, 2026): "Businesses Race to Hire Claude Code Specialists As Demand Surges 938%"; "AI video ads (+63%) were matched with parallel demand for human editing talent, including video editing (+36%) and short-form video editing (+27%)" — [Fiverr news](https://www.fiverr.com/news/business-trends-index-ai-2026); [Fiverr report](https://www.fiverr.com/resources/guides/reports/business-trends-index-june-2026). From snippets; the pages returned 403.
- Fiverr Q4 2025 BTI: AI video creator demand +66%, faceless YouTube editor demand +59% — [ChatCut blog (secondary)](https://chatcut.io/blog/freelance-video-editing-platforms-2026)
- Upwork editing rates **[secondary]**: $20–40/hr beginner, $45–75 mid, $80–150 expert — [GigRadar](https://gigradar.io/blog/freelance-video-editing)

**Surveys of AI use**
- Wyzowl 2026: 63% of video marketers have used AI to create or edit videos, up from 51% in 2025 — [Wyzowl](https://wyzowl.com/video-marketing-statistics/)
- YouTube/NRG Culture & Trends (Oct 21, 2026), nearly 700 video posters aged 14–44: 72% use AI on videos or images; 61% (US) are interested in using AI to insert themselves — [Social Media Today](https://www.socialmediatoday.com/news/youtube-shares-data-on-how-creators-are-using-ai/833657/)
- Adobe 2026 Creators' Toolkit Report: nearly 9 in 10 creators say creative AI tools help grow their business or audience; an "overwhelming majority" say final creative decisions must stay in their hands — [Adobe blog](https://blog.adobe.com/en/publish/2026/09/08/generate-create-directly-in-your-timeline-with-new-ai-powered-innovations-in-premiere-after-effects)
- 87% of surveyed video companies use AI in production in 2026 (Belgian survey) — [creativeailab](https://www.creativeailab.be/nearly-9-out-of-10-video-companies-now-use-ai/) **[secondary; sample not checked]**
- A viewer test (Oct 16, 2026) found 78.0% (234 respondents) chose the human edit as more engaging and 21.3% the AI edit — [USA Today press release](https://www.usatoday.com/press-release/story/51184/new-survey-finds-clear-audio-and-on-screen-text-not-authenticity-drive-viewer-preference-in-online-video/). This is a press release, so the methodology and sponsor are unverified.

**"AI won't replace editors, editors using AI will"**
- This line is widespread but unattributed. Examples: "AI won't replace video editors. Editors who use AI will replace the ones who don't." — [LinkedIn, K. Iyer](https://www.linkedin.com/posts/karnaniyer_videoediting-ai-fluxocut-activity-7518688412661342209-_2j6); and a similar line on [LinkedIn](https://www.linkedin.com/posts/muhosin47_videoediting-videoeditor-ai-activity-7496134021060390913-17QS). No canonical origin was found.

**Ben Affleck (Hollywood angle)**
- Joe Rogan Experience, viral Jan 2026: "Look, AI is a craftsman at best. A craftsman can learn how to make Stickley furniture by sitting down next to somebody and seeing what their technique is…" — [BuzzFeed, Jan 19, 2026](https://www.buzzfeed.com/stephaniesoteriou/ben-affleck-viral-smart-ai-impact-hollywood-reacts). It is also quoted in [Business Insider, Oct 7, 2026](https://www.businessinsider.com/ben-affleck-ai-knowledge-interviews-writes-python-neural-networks-interpositive-2026-10).
- Earlier, at CNBC Delivering Alpha (Nov 2024): "movies will be one of the last things, if everything gets replaced, to be replaced by AI"; "AI can write you excellent imitative verse… it cannot write you Shakespeare" — [Variety, Nov 18, 2024](https://variety.com/2024/film/news/ben-affleck-slams-ai-wont-replace-movies-1236213287/)
- **Netflix acquired his AI post-production company InterPositive** (announced Mar 5, 2026) — [Netflix](https://about.netflix.com/news/why-interpositive-is-joining-netflix). A federal filing disclosed the price as **$587M cash** — [Variety, Jul 17, 2026](https://variety.com/2026/film/news/netflix-paid-587-million-ben-affleck-ai-interpositive-1236815111/); [TechCrunch](https://techcrunch.com/2026/07/19/netflix-paid-587m-for-ben-afflecks-ai-filmmaking-startup/)
- At Bloomberg Screentime (Sep 30, 2026), Affleck said he used AI "for lots of things" in his Netflix thriller *Animals* but declined to say where — [Hollywood Reporter](https://www.hollywoodreporter.com/movies/movie-news/ben-affleck-ai-netflix-movie-animals-1236717919/); [Deadline, Oct 1, 2026](https://deadline.com/2026/10/ben-affleck-used-ai-lots-of-things-animals-1237145166/); follow-up on his "ethical" approach — [Hollywood Reporter, Oct 1, 2026](https://www.hollywoodreporter.com/movies/movie-news/ben-affleck-approach-ai-ethically-animals-replacing-1236720613/). The full verbatim Screentime quotes could not be retrieved because the articles are paywalled; only the phrase "for lots of things" is verified.

### Inferences
- Editing demand is shifting, not disappearing. Platforms show simultaneous growth in AI-video skills and in human (especially short-form) editing. The premium is moving toward judgment and story ("beyond execution", per Upwork) and toward people who can operate AI and agent toolchains.
- Affleck's arc (skeptic quote in January, $587M AI post-production exit, AI used in his own film) is a useful narrative: Hollywood is adopting AI *in post-production* as tooling.

### Gaps
- No BLS or job-posting time series for video editors was gathered.
- No editor-specific (rather than creator or marketer) AI-usage survey with a robust sample was found.
- Upwork and Fiverr numbers are from the press-release snippets; the full methodology could not be fetched (403).

---

## 5. Limitations: where AI and Claude video editing currently fails

### Takeaway
The current Claude workflows work best for **programmatic graphics and mechanical cuts**. They are weakest at taste, pacing and emotional rhythm, at understanding long footage (Claude has no native video input, so community plugins sample frames), at frame-accurate editing of real footage without a human checking, and at rendering and compute setup.

### Cited Findings
- Anthropic itself: "Claude can't replace taste or imagination" — [Anthropic, Apr 28, 2026](https://www.anthropic.com/news/claude-for-creative-work)
- Claude Code Remotion guides describe needing to read "frame math, fixing sequences, and debugging renders in Studio", i.e. iteration and debugging overhead — [OpenReplay, Jun 4, 2026](https://blog.openreplay.com/making-videos-claude-code-remotion/); see also "Video as Code: Remotion and the Agent Feedback Gap" — [Digital Applied, Aug 11, 2026](https://www.digitalapplied.com/blog/video-as-code-remotion-agentic-generation-2026)
- Video understanding requires add-ons: "Give Claude the ability to watch and understand videos — Claude Code plugin" — [GitHub claude-video-vision](https://github.com/jordanrendric/claude-video-vision)
- Pacing and emotion: "AI can handle the technical side of editing, but it can't recognize emotion, pacing, or tone" — [Lemonlight, Sep 14, 2026](https://www.lemonlight.com/blog/8-reasons-ai-video-editing-still-requires-a-specialist/) (an agency with a commercial interest)
- In a viewer preference test, 78% preferred the human edit — [USA Today press release](https://www.usatoday.com/press-release/story/51184/new-survey-finds-clear-audio-and-on-screen-text-not-authenticity-drive-viewer-preference-in-online-video/) (methodology unverified)
- Adobe connector depth: at launch, a critic said it acted at the Express level, not deep Premiere timeline control — [MindStudio](https://www.mindstudio.ai/blog/claude-mcp-adobe-vs-photoshop-premiere-what-it-does)
- Cost and licensing:
  - Remotion is free for teams of 3 or fewer; larger companies pay a license from $500/mo — [Remotion pricing](https://www.remotion.dev/docs/license/pricing)
  - The Remotion skill guide flags commercial-license requirements — [ngram](https://www.ngram.com/blog/remotion-skills-sh-ai-video-creation)
  - Coding agents require paid subscriptions — [Remotion docs](https://www.remotion.dev/docs/ai/coding-agents)
  - Claude Code usage limits are a recurring friction; Anthropic raised weekly limits 25% from Sep 14, 2026 — [ClaudeDevs on X](https://x.com/ClaudeDevs/status/2093742321473065266)
- Generative video instability: Sora's discontinuation in 2026 shows how volatile the model layer is — [OpenAI Help](https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation)

### Inferences
- "Editing with Claude" in viral videos is mostly *generation of graphics and templated video* (where code is a natural fit) plus *mechanical rough-cutting*. Story editing of real footage, the core of a professional editor's value, is the least automated part.

### Gaps
- I found no rigorous benchmark of LLM agents on long-form footage editing, frame-accuracy or pacing quality. The sources here are vendor or agency opinion plus one press-release survey.
- I found no published cost-per-video comparison (Claude Code tokens plus render compute vs. a freelance editor).
