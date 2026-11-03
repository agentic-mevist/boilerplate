import type { ModelParams } from "../../shared/model";
import { useStore } from "../store";

function Slider({ label, hint, value, min, max, step, format, onChange }: { label: string; hint: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span className="slider__top">
        <span>{label}</span>
        <b>{format(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="slider__hint">{hint}</span>
    </label>
  );
}

export function HowItWorks() {
  const open = useStore((s) => s.howOpen);
  const setOpen = useStore((s) => s.setHowOpen);
  const params = useStore((s) => s.params);
  const setParams = useStore((s) => s.setParams);
  const resetParams = useStore((s) => s.resetParams);
  const result = useStore((s) => s.result);
  if (!open) return null;
  const set = (p: Partial<ModelParams>) => setParams(p);
  const setPlacement = (k: string, v: number) => setParams({ placement: { ...params.placement, [k]: v } });
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="How the juice is calculated" onClick={() => setOpen(false)}>
      <div className="modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={() => setOpen(false)} aria-label="Close">
          ×
        </button>
        <div className="eyebrow">How it works</div>
        <h2>Every link is a spring. Here's how much it pours.</h2>
        <p>
          The model follows the ideas behind Google's PageRank and Ahrefs' Domain Rating. Data comes from DataForSEO's backlink index. For each site that links to you
          we take its strongest link and compute:
        </p>
        <div className="formula">
          juice = <span>10</span>
          <sup>authority ÷ {params.decade / 10}</sup> × <span>1 ⁄ links on the page</span> × follow × placement × spam × status
        </div>
        <ol className="how-list">
          <li>
            <b>Authority.</b> A blend of the page's own authority and the site's domain rating ({Math.round(params.pageWeight * 100)}% page / {Math.round((1 - params.pageWeight) * 100)}%
            domain). The scale is logarithmic like DR, so every {params.decade / 10} points means 10× more juice. That's why a single strong link outweighs dozens of weak ones.
          </li>
          <li>
            <b>Outgoing links.</b> A page splits its juice across every link on it. A link from a page with 5 links gets far more than one from a directory with 500.
          </li>
          <li>
            <b>Follow.</b> Nofollow, UGC and sponsored links pass only a trickle ({Math.round(params.nofollow * 100)}%).
          </li>
          <li>
            <b>Placement.</b> Links inside the content pass more than footer, sidebar or menu links (Google's "reasonable surfer").
          </li>
          <li>
            <b>Spam.</b> Spam scores above {params.spamSafe} get discounted. From {params.spamToxic} up a source counts as spammy and is mostly ignored.
          </li>
          <li>
            <b>Status.</b> A link to a broken page on your site passes nothing until you redirect that page; a redirect costs a little. Lost links pass nothing, but they're worth winning back.
          </li>
        </ol>
        <p className="muted">
          The juice score adds every stream together and puts it on a 0–100 scale, tuned so it lands near your domain rating. The tool samples your strongest {result?.coverage.sampled ?? 200} linking
          sites, which carry nearly all of the equity.
        </p>

        <div className="eyebrow" style={{ marginTop: 22 }}>
          Play with the algorithm
        </div>
        <p className="muted">Changes apply instantly: watch the streams change width. Every stream's width is that site's share of your juice.</p>
        <div className="sliders">
          <Slider label="Nofollow juice" hint="How much a nofollow link passes" value={params.nofollow} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ nofollow: v })} />
          <Slider label="Footer links" hint="Footer link weight vs. in-content" value={params.placement.footer ?? 0.35} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setPlacement("footer", v)} />
          <Slider label="Page vs. domain" hint="Weight of page authority in the blend" value={params.pageWeight} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}% page`} onChange={(v) => set({ pageWeight: v })} />
          <Slider label="Authority steepness" hint="Points needed for 10× more juice" value={params.decade / 10} min={5} max={25} step={1} format={(v) => `${v} pts`} onChange={(v) => set({ decade: v * 10 })} />
          <Slider label="Spam tolerance" hint="Spam score where discounting starts" value={params.spamSafe} min={0} max={60} step={5} format={(v) => `${v}`} onChange={(v) => set({ spamSafe: v, spamToxic: Math.max(v + 10, params.spamToxic) })} />
          <Slider label="Internal links" hint="How much internal links dilute" value={params.internalWeight} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ internalWeight: v })} />
        </div>
        <button className="keycap" onClick={resetParams}>
          Reset to defaults
        </button>
      </div>
    </div>
  );
}
