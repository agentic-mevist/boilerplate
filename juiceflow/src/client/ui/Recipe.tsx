import { CATEGORY_META } from "../../shared/categories";
import { DEFAULT_PARAMS, scoreOf, type JuiceSource, type ModelParams } from "../../shared/model";
import { int, mult, pct, timeAgo } from "../format";
import { HEALTH_COLOR, HEALTH_LABEL } from "../theme";
import { Favicon } from "./Favicon";

function Bar({ value, max = 100, color = "var(--juice)" }: { value: number; max?: number; color?: string }) {
  return (
    <span className="bar">
      <span className="bar__fill" style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </span>
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

      <a className="recipe__url" href={l.url} target="_blank" rel="noreferrer noopener" title={l.url}>
        {l.title || l.url}
      </a>
      {l.context && <p className="recipe__context">“…{l.context}…”</p>}

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
