import { useMemo, useState } from "react";
import type { Health, JuiceSource } from "../../shared/model";
import { compact, int, pct } from "../format";
import { useStore } from "../store";
import { HEALTH_COLOR, HEALTH_LABEL } from "../theme";
import { Favicon } from "./Favicon";
import { Recipe } from "./Recipe";

const FILTERS: { id: "all" | Health; label: string }[] = [
  { id: "all", label: "All" },
  { id: "clean", label: "Clean" },
  { id: "suspicious", label: "Spammy-ish" },
  { id: "toxic", label: "Murky" },
  { id: "nofollow", label: "Nofollow" },
  { id: "leak", label: "Leaks" },
  { id: "lost", label: "Lost" },
];

function SourceRow({ s, max }: { s: JuiceSource; max: number }) {
  const hover = useStore((st) => st.hover);
  const select = useStore((st) => st.select);
  const hovered = useStore((st) => st.hovered);
  const id = s.health === "lost" ? `lost:${s.id}` : s.id;
  const w = s.health === "lost" ? 0 : Math.sqrt(s.share / (max || 1));
  return (
    <button
      className={`src ${hovered === id ? "is-hover" : ""}`}
      onMouseEnter={() => hover(id)}
      onMouseLeave={() => hover(null)}
      onClick={() => select(id)}
    >
      <Favicon domain={s.link.domain} size={22} />
      <span className="src__main">
        <span className="src__name">{s.root}</span>
        <span className="src__stream">
          <span className="src__stream-fill" style={{ width: `${Math.max(1.5, w * 100)}%`, background: HEALTH_COLOR[s.health] }} />
        </span>
      </span>
      <span className="src__dr" title="Domain rating">
        {Math.round(s.factors.dr)}
      </span>
      <span className="src__share">{s.health === "lost" ? "lost" : pct(s.share)}</span>
    </button>
  );
}

export function Panel() {
  const result = useStore((s) => s.result);
  const panel = useStore((s) => s.panel);
  const setPanel = useStore((s) => s.setPanel);
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const params = useStore((s) => s.params);
  const hover = useStore((s) => s.hover);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const list = useMemo(() => {
    if (!result) return [];
    if (filter === "lost") return result.lost;
    if (filter === "all") return result.sources;
    return result.sources.filter((s) => s.health === filter);
  }, [result, filter]);

  if (!result || !panel) return null;
  const selectedSource = selected
    ? selected.startsWith("lost:")
      ? result.lost.find((s) => `lost:${s.id}` === selected)
      : result.sources.find((s) => s.id === selected)
    : null;
  const max = result.sources[0]?.share ?? 1;
  const counts: Record<string, number> = { all: result.sources.length, lost: result.lost.length };
  for (const s of result.sources) counts[s.health] = (counts[s.health] ?? 0) + 1;

  return (
    <aside className="panel" onMouseLeave={() => hover(null)}>
      <div className="panel__tabs">
        <button className={panel === "sources" ? "is-on" : ""} onClick={() => setPanel("sources")}>
          Sources <span className="count">{compact(result.sources.length)}</span>
        </button>
        <button className={panel === "insights" ? "is-on" : ""} onClick={() => setPanel("insights")}>
          Insights <span className="count">{result.insights.length}</span>
        </button>
        <button className="panel__close" aria-label="Close panel" onClick={() => (select(null), setPanel(null))}>
          ×
        </button>
      </div>

      {panel === "sources" && selectedSource && <Recipe source={selectedSource} params={params} onBack={() => select(null)} />}

      {panel === "sources" && !selectedSource && (
        <>
          <div className="filters">
            {FILTERS.filter((f) => f.id === "all" || (counts[f.id] ?? 0) > 0).map((f) => (
              <button key={f.id} className={`chip ${filter === f.id ? "is-on" : ""}`} onClick={() => setFilter(f.id)}>
                {f.id !== "all" && <span className="dot" style={{ background: HEALTH_COLOR[f.id as Health] }} />}
                {f.label} <span className="count">{counts[f.id] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="src-head">
            <span>Linking site</span>
            <span title="Domain rating">DR</span>
            <span>Juice</span>
          </div>
          <div className="src-list">
            {list.map((s) => (
              <SourceRow key={`${s.health}:${s.id}`} s={s} max={max} />
            ))}
            {!list.length && <div className="empty">Nothing here.</div>}
          </div>
          <div className="panel__foot">
            Showing the strongest {int(result.coverage.sampled)} of {int(result.coverage.total)} linking sites
            {result.ignored > 0 ? ` · ${result.ignored} search-cache links ignored` : ""}.
          </div>
        </>
      )}

      {panel === "insights" && (
        <div className="insights">
          {result.insights.map((i) => (
            <div key={i.id} className={`insight insight--${i.tone}`}>
              <div className="insight__top">
                <span className="insight__title">{i.title}</span>
                {i.metric && <span className="insight__metric">{i.metric}</span>}
              </div>
              <p>{i.body}</p>
              {i.sourceIds && i.sourceIds.length > 0 && (
                <div className="insight__srcs">
                  {i.sourceIds.slice(0, 6).map((id) => {
                    const src = result.sources.find((s) => s.id === id) ?? result.lost.find((s) => s.id === id);
                    if (!src) return null;
                    const key = src.health === "lost" ? `lost:${src.id}` : src.id;
                    return (
                      <button key={id} className="mini-src" onMouseEnter={() => hover(key)} onMouseLeave={() => hover(null)} onClick={() => (setPanel("sources"), select(key))}>
                        <Favicon domain={src.link.domain} size={14} /> {src.root}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export { HEALTH_LABEL };
