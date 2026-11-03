import { useEffect, useState } from "react";
import { CATEGORY_META } from "../../shared/categories";
import { DEFAULT_PARAMS, scoreOf, type JuiceSource, type ModelParams } from "../../shared/model";
import type { RawLink } from "../../shared/types";
import { fetchLinks, type LinksResponse } from "../api";
import { int, mult, pct, timeAgo } from "../format";
import { useStore } from "../store";
import { HEALTH_COLOR, HEALTH_LABEL } from "../theme";
import { Favicon } from "./Favicon";

function Bar({ value, max = 100, color = "var(--juice)" }: { value: number; max?: number; color?: string }) {
  return (
    <span className="bar">
      <span className="bar__fill" style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </span>
  );
}

function shortUrl(u: string): string {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, "") + decodeURI(x.pathname) + x.search).replace(/\/$/, "");
  } catch {
    return u;
  }
}

/** One referring link: the page it's on, its anchor text, and where it points on your site. */
function LinkCard({ link, compact }: { link: RawLink; compact?: boolean }) {
  const rel = link.attributes.filter((a) => ["nofollow", "ugc", "sponsored"].includes(a.toLowerCase()));
  const follow = link.dofollow && !rel.length;
  return (
    <a className={`linkcard ${compact ? "linkcard--compact" : ""}`} href={link.url} target="_blank" rel="noreferrer noopener" title={link.url}>
      {!compact && <span className="linkcard__eyebrow">Linking page</span>}
      <span className="linkcard__title">{link.title || shortUrl(link.url)}</span>
      <span className="linkcard__url">{shortUrl(link.url)} ↗</span>
      {link.anchor && <span className="linkcard__anchor">“{link.anchor}”</span>}
      {!compact && link.context && <span className="linkcard__context">…{link.context}…</span>}
      <span className="linkcard__meta">
        <span className={`badge ${follow ? "badge--ok" : "badge--muted"}`}>{follow ? "dofollow" : rel.join(", ") || "nofollow"}</span>
        {link.placement && <span className="badge">{link.placement}</span>}
        <span className="linkcard__to" title={link.urlTo}>
          → {shortUrl(link.urlTo)}
        </span>
      </span>
    </a>
  );
}

/** Loads every link this site has to you (on demand: it's a paid lookup, cached for a week). */
function AllLinks({ source }: { source: JuiceSource }) {
  const target = useStore((s) => s.payload?.target);
  const [state, setState] = useState<{ status: "idle" | "loading" | "done" | "error"; data?: LinksResponse; error?: string }>({ status: "idle" });
  useEffect(() => setState({ status: "idle" }), [source.id]);
  const n = source.link.groupCount;
  if (!target || source.health === "lost" || n <= 1) return null;
  const load = () => {
    setState({ status: "loading" });
    fetchLinks(target, source.root)
      .then((data) => setState({ status: "done", data }))
      .catch((e: Error) => setState({ status: "error", error: e.message }));
  };
  return (
    <div className="alllinks">
      {state.status === "idle" && (
        <button className="keycap alllinks__btn" onClick={load}>
          Show every link from {source.root}
        </button>
      )}
      {state.status === "loading" && <div className="alllinks__note">Loading links from {source.root}…</div>}
      {state.status === "error" && <div className="alllinks__note">{state.error}</div>}
      {state.status === "done" && state.data && (
        <>
          <div className="recipe__section">
            {int(state.data.total)} link{state.data.total === 1 ? "" : "s"} from {source.root}
            {state.data.total > state.data.links.length ? ` · strongest ${state.data.links.length}` : ""}
          </div>
          <div className="alllinks__list">
            {state.data.links.map((l, i) => (
              <LinkCard key={`${l.url}|${i}`} link={l} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value, effect, children }: { label: string; value: React.ReactNode; effect?: string; children?: React.ReactNode }) {
  return (
    <div className="recipe__row">
      <span className="recipe__label">{label}</span>
      <span className="recipe__value">{value}</span>
      <span className={`recipe__effect ${effect && effect !== "×1" ? (effect.startsWith("×0") || effect.startsWith("÷") ? "is-down" : "is-up") : ""}`}>{effect ?? ""}</span>
      {children && <div className="recipe__detail">{children}</div>}
    </div>
  );
}

/** The full, transparent breakdown of how much juice one source sends you. */
export function Recipe({ source, params = DEFAULT_PARAMS, onBack }: { source: JuiceSource; params?: ModelParams; onBack?: () => void }) {
  const f = source.factors;
  const l = source.link;
  const alone = scoreOf(source.juice, params);
  const potentialAlone = scoreOf(source.potential, params);
  const status =
    source.health === "lost"
      ? "removed"
      : l.isBroken || (l.statusTo ?? 0) >= 400
        ? `${l.statusTo ?? "broken"}`
        : l.statusTo && l.statusTo >= 300
          ? `${l.statusTo} redirect`
          : l.statusTo
            ? `${l.statusTo} OK`
            : "OK";
  return (
    <div className="recipe">
      {onBack && (
        <button className="link-btn" onClick={onBack}>
          ← All sources
        </button>
      )}
      <div className="recipe__head">
        <Favicon domain={l.domain} size={36} />
        <div>
          <div className="recipe__domain">{source.root}</div>
          <div className="recipe__meta">
            <span className="dot" style={{ background: HEALTH_COLOR[source.health] }} /> {HEALTH_LABEL[source.health]} · {CATEGORY_META[source.category].label}
          </div>
        </div>
        <div className="recipe__share">
          <div className="recipe__share-num">{source.health === "lost" ? "0%" : pct(source.share)}</div>
          <div className="recipe__share-cap">of your juice</div>
        </div>
      </div>

      <div className="recipe__links">
        <a className="recipe__visit" href={`https://${l.domain}`} target="_blank" rel="noreferrer noopener">
          Visit {source.root} ↗
        </a>
      </div>
      <LinkCard link={l} />
      <AllLinks source={source} />

      <div className="recipe__section">The recipe</div>
      <Row label="Domain rating" value={Math.round(f.dr)}>
        <Bar value={f.dr} />
      </Row>
      <Row label="Page authority" value={`${Math.round(f.pageAuthority)}${f.authorityEstimated ? " (est.)" : ""}`}>
        <Bar value={f.pageAuthority} />
      </Row>
      <Row label="Blended authority" value={f.authority.toFixed(1)}>
        <span className="muted">
          {Math.round(params.pageWeight * 100)}% page + {Math.round((1 - params.pageWeight) * 100)}% domain. Every {params.decade / 10} points is 10× more juice.
        </span>
      </Row>
      <Row label="Outgoing links" value={f.dilutionEstimated ? "unknown" : int(f.outgoing)} effect={`÷${f.dilution.toFixed(f.dilution < 10 ? 1 : 0)}`}>
        <span className="muted">
          {f.dilutionEstimated
            ? `The provider didn't count links on this page; we assume ${params.unknownDilution}.`
            : `The page links to ${int(f.outgoing)} other site${f.outgoing === 1 ? "" : "s"} and has ${int(l.intLinks)} internal links (counted at ${Math.round(params.internalWeight * 100)}%). You get 1/${f.dilution.toFixed(1)} of its juice.`}
        </span>
      </Row>
      <Row label="Link type" value={f.follow < 1 ? (l.attributes.filter((a) => ["nofollow", "ugc", "sponsored"].includes(a)).join(", ") || "nofollow") : "dofollow"} effect={mult(f.follow)} />
      <Row label="Placement" value={f.placementLabel} effect={mult(f.placement)} />
      {f.type !== 1 && <Row label="Link kind" value={l.itemType} effect={mult(f.type)} />}
      <Row label="Spam score" value={`${Math.round(f.spamScore)} / 100`} effect={mult(f.spam)}>
        <Bar value={f.spamScore} color={f.spamScore >= params.spamToxic ? "var(--toxic)" : f.spamScore > params.spamSafe ? "var(--suspicious)" : "#9fd3a9"} />
      </Row>
      <Row label="Target page" value={status} effect={source.health === "lost" || source.health === "leak" ? "×0" : mult(f.status)} />
      {l.groupCount > 1 && <Row label="Links from this site" value={int(l.groupCount)} effect={mult(f.multi)} />}

      <div className="recipe__total">
        <span>Worth on its own</span>
        <strong>{source.health === "lost" || source.health === "leak" ? `${alone.toFixed(0)} (could be ${potentialAlone.toFixed(0)})` : `${alone.toFixed(0)} / 100`}</strong>
      </div>

      {source.notes.length > 0 && (
        <ul className="recipe__notes">
          {source.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <div className="recipe__seen">
        First seen {timeAgo(l.firstSeen)} · last checked {timeAgo(l.lastSeen)}
      </div>
    </div>
  );
}
