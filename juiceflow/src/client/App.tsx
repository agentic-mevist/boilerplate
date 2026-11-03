import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeDomain } from "../shared/domain";
import { analyze, AnalyzeError } from "./api";
import { ScreenLabels } from "./scene/KeyLabels";
import { Scene, type Insets } from "./scene/Scene";
import { useStore } from "./store";
import { HowItWorks } from "./ui/HowItWorks";
import { DemoChips, ErrorToast, Legend, Loading, Logo, SearchBar, Summary, Tooltip } from "./ui/Hud";
import { Panel } from "./ui/Panel";

function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return vp;
}

export function App() {
  const status = useStore((s) => s.status);
  const payload = useStore((s) => s.payload);
  const panel = useStore((s) => s.panel);
  const setHowOpen = useStore((s) => s.setHowOpen);
  const [landing, setLanding] = useState(() => !new URLSearchParams(location.search).get("d"));
  const abort = useRef<AbortController | null>(null);
  const vp = useViewport();
  const mobile = vp.w < 760;

  const run = useCallback(async (input: string, opts: { quiet?: boolean } = {}) => {
    const domain = normalizeDomain(input);
    const st = useStore.getState();
    if (!domain) {
      st.setStatus("error", "That doesn't look like a website. Try something like example.com");
      return;
    }
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    st.setDomain(domain);
    st.setStatus("loading");
    if (!opts.quiet) {
      setLanding(false);
      const url = new URL(location.href);
      url.searchParams.set("d", domain);
      history.replaceState(null, "", url);
    }
    try {
      const res = await analyze(domain, ctl.signal);
      if (ctl.signal.aborted) return;
      useStore.getState().setPayload(res);
    } catch (e) {
      if (ctl.signal.aborted) return;
      const msg = e instanceof AnalyzeError ? e.message : "Something went wrong. Please try again.";
      useStore.getState().setStatus("error", msg);
    }
  }, []);

  useEffect(() => {
    const d = new URLSearchParams(location.search).get("d");
    run(d || "figma.com", { quiet: !d });
  }, [run]);

  const insets: Insets = useMemo(() => {
    if (mobile) return { top: landing ? 230 : 128, right: 14, bottom: panel ? Math.round(vp.h * 0.55) : 132, left: 14 };
    return { top: landing ? 300 : 118, right: panel ? 430 : 40, bottom: 96, left: 40 };
  }, [mobile, landing, panel, vp.h]);

  return (
    <div className={`app ${landing ? "is-landing" : ""} ${mobile ? "is-mobile" : ""}`}>
      <Scene insets={insets} />
      <ScreenLabels />

      <header className="topbar">
        <Logo />
        {!landing && <SearchBar onSubmit={(d) => run(d)} />}
        <nav className="topbar__nav">
          <button className="link-btn" onClick={() => setHowOpen(true)}>
            How it works
          </button>
        </nav>
      </header>

      {landing && (
        <section className="hero">
          <div className="eyebrow">Link juice, visualized</div>
          <h1>See where your SEO juice comes from.</h1>
          <p>Every site that links to you is a spring. The stronger, cleaner and less crowded the link, the wider the stream it pours into your site.</p>
          <SearchBar onSubmit={(d) => run(d)} big />
          <DemoChips onPick={(d) => run(d)} />
        </section>
      )}

      {!landing && status !== "loading" && payload && <Summary />}
      {!landing && <DemoChipsCompact onPick={(d) => run(d)} />}

      <Legend />
      <Panel />
      <Tooltip />
      <Loading />
      <ErrorToast />
      <HowItWorks />
    </div>
  );
}

function DemoChipsCompact({ onPick }: { onPick: (d: string) => void }) {
  const payload = useStore((s) => s.payload);
  if (!payload?.demo) return null;
  return (
    <div className="demo-note">
      <span>Demo data</span>
      <DemoChips onPick={onPick} />
    </div>
  );
}
