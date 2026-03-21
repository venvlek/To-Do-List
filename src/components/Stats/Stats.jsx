import { useMemo, useState } from "react";
import { CAT_COLOR } from "../../utils/helpers";
import "./Stats.css";

// ── helpers ───────────────────────────────────────────────────────────────────
const pad    = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const lastNDays = (n) => {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(dateKey(d));
  }
  return days;
};

// Read a CSS variable from :root at render time so charts respect the theme
const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ── BarChart ──────────────────────────────────────────────────────────────────
function BarChart({ data }) {
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const W = 460, H = 120;
  const barW = Math.floor((W - (data.length - 1) * 6) / data.length);
  const gap  = 6;

  const accentColor = cssVar("--t-accent") || "#1a1aff";
  const trackColor  = cssVar("--t-border") || "#e5e7eb";
  const mutedColor  = cssVar("--t-muted")  || "#6b7280";

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="stats__bar-svg">
      {data.map((d, i) => {
        const x      = i * (barW + gap);
        const totalH = Math.max((d.total / maxVal) * H, d.total > 0 ? 4 : 2);
        const doneH  = Math.max((d.done  / maxVal) * H, d.done  > 0 ? 4 : 0);
        return (
          <g key={i}>
            <rect x={x} y={H - totalH} width={barW} height={totalH}
              rx={3} fill={trackColor} />
            {doneH > 0 && (
              <rect x={x} y={H - doneH} width={barW} height={doneH}
                rx={3} fill={accentColor}
                style={{
                  transformOrigin: `${x + barW/2}px ${H}px`,
                  animation: `barGrow 0.6s cubic-bezier(.22,1,.36,1) ${i*0.04}s both`,
                }}
              />
            )}
            <text x={x + barW/2} y={H + 16} textAnchor="middle"
              fontSize="9" fill={mutedColor} fontFamily="Sora, sans-serif">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── DonutChart ────────────────────────────────────────────────────────────────
function DonutChart({ slices, size = 120 }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const r = 46, cx = size/2, cy = size/2;
  const circumference = 2 * Math.PI * r;

  const inkColor   = cssVar("--t-ink")   || "#1f2937";
  const mutedColor = cssVar("--t-muted") || "#6b7280";
  const trackColor = cssVar("--t-border")|| "#e5e7eb";

  let offset = 0;
  const arcs = slices.map((s) => {
    const pct  = s.value / total;
    const dash = pct * circumference;
    const gap  = circumference - dash;
    const rot  = offset * 360 - 90;
    offset += pct;
    return { ...s, dash, gap, rot };
  });

  return (
    <svg width={size} height={size} className="stats__donut-svg" viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={14} />
      {arcs.map((arc, i) =>
        arc.value > 0 ? (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={arc.color} strokeWidth={14}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            transform={`rotate(${arc.rot} ${cx} ${cy})`}
            strokeLinecap="round"
            style={{
              animation: `donutGrow 0.7s cubic-bezier(.22,1,.36,1) ${i*0.1}s both`,
              transformOrigin: `${cx}px ${cy}px`,
            }}
          />
        ) : null
      )}
      <text x={cx} y={cy-4} textAnchor="middle"
        fontSize="20" fontWeight="800" fill={inkColor} fontFamily="Sora, sans-serif">
        {total}
      </text>
      <text x={cx} y={cy+14} textAnchor="middle"
        fontSize="9" fill={mutedColor} fontFamily="Sora, sans-serif">
        TOTAL
      </text>
    </svg>
  );
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ taskMap }) {
  const DAYS_SHOWN = 56;
  const today = new Date();
  const accentColor = cssVar("--t-accent")     || "#1a1aff";
  const trackColor  = cssVar("--t-border")     || "#e5e7eb";

  const heatColor = (count, maxCount) => {
    if (count === 0) return trackColor;
    const intensity = count / maxCount;
    // Build rgba from accent but vary opacity
    if (intensity < 0.25) return accentColor + "40";
    if (intensity < 0.5)  return accentColor + "80";
    if (intensity < 0.75) return accentColor + "bb";
    return accentColor;
  };

  const cells = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key   = dateKey(d);
    const count = (taskMap[key] || []).length;
    cells.push({ key, count, dow: d.getDay(), date: d });
  }

  const weeks = [];
  let week = [];
  cells.forEach((c, i) => {
    week.push(c);
    if (week.length === 7 || i === cells.length - 1) { weeks.push(week); week = []; }
  });

  const maxCount = Math.max(...cells.map((c) => c.count), 1);
  const monthLabels = weeks.map((w) => {
    const first = w[0]?.date;
    if (!first) return "";
    return first.getDate() <= 7
      ? first.toLocaleString("default", { month: "short" })
      : "";
  });

  const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

  return (
    <div className="stats__heatmap">
      <div className="stats__heatmap-month-row">
        {monthLabels.map((lbl, i) => (
          <span key={i} className="stats__heatmap-month-lbl">{lbl}</span>
        ))}
      </div>
      {[0,1,2,3,4,5,6].map((dow) => (
        <div key={dow} className="stats__heatmap-row">
          <span className="stats__heatmap-day-lbl">{DAY_LABELS[dow]}</span>
          <div className="stats__heatmap-cells">
            {weeks.map((w, wi) => {
              const cell = w.find((c) => c.dow === dow);
              const bg   = cell ? heatColor(cell.count, maxCount) : trackColor;
              return (
                <div key={wi} className="stats__heatmap-cell"
                  style={{ background: bg }}
                  title={cell
                    ? `${cell.date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}: ${cell.count} task${cell.count!==1?"s":""}`
                    : ""}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Stats({ visible, tasks }) {
  const [period, setPeriod] = useState("7d");

  const data = useMemo(() => {
    const periodDays = period === "7d" ? 7 : period === "30d" ? 30 : 9999;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffKey = dateKey(cutoff);

    const inPeriod = period === "all"
      ? tasks
      : tasks.filter((t) => t.dueDate >= cutoffKey);

    const total   = inPeriod.length;
    const done    = inPeriod.filter((t) => t.completed).length;
    const pending = inPeriod.filter((t) => !t.completed).length;
    const rate    = total > 0 ? Math.round((done / total) * 100) : 0;

    const taskMap = {};
    tasks.forEach((t) => {
      if (!taskMap[t.dueDate]) taskMap[t.dueDate] = [];
      taskMap[t.dueDate].push(t);
    });

    const barDays = period === "7d" ? 7 : 14;
    const barData = lastNDays(barDays).map((key) => {
      const ts = taskMap[key] || [];
      const d  = new Date(key + "T00:00:00");
      const label = period === "7d"
        ? d.toLocaleDateString("en-US", { weekday: "short" }).slice(0,2)
        : d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
      return { label, total: ts.length, done: ts.filter((t) => t.completed).length };
    });

    const donutSlices = [
      { label:"High",   value: inPeriod.filter((t) => t.priority==="high").length,   color:"#ef4444" },
      { label:"Medium", value: inPeriod.filter((t) => t.priority==="medium").length, color:"#f59e0b" },
      { label:"Low",    value: inPeriod.filter((t) => t.priority==="low").length,    color:"#22c55e" },
    ];

    const cats = {};
    inPeriod.forEach((t) => { cats[t.category] = (cats[t.category] || 0) + 1; });
    const catList = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([name,count]) => ({name,count}));
    const maxCat  = catList[0]?.count || 1;

    let streak = 0;
    const sd = new Date();
    while (streak <= 365) {
      const key = dateKey(sd);
      if ((taskMap[key] || []).some((t) => t.completed)) { streak++; sd.setDate(sd.getDate()-1); }
      else break;
    }

    return { total, done, pending, rate, barData, donutSlices, catList, maxCat, streak, taskMap };
  }, [tasks, period]);

  const { total, done, pending, rate, barData, donutSlices, catList, maxCat, streak, taskMap } = data;

  const accentColor = cssVar("--t-accent") || "#1a1aff";
  const mutedColor  = cssVar("--t-muted")  || "#6b7280";

  return (
    <div className={`stats${visible ? "" : " stats--hidden"}`}>
      <div className="stats__inner">

        {/* Top bar */}
        <div className="stats__topbar">
          <div>
            <h2 className="stats__title">Your <span>Stats</span></h2>
            <p className="stats__subtitle">Task completion overview</p>
          </div>
          <div className="stats__period-tabs">
            {[["7d","7D"],["30d","30D"],["all","All"]].map(([val,lbl]) => (
              <button key={val}
                className={`stats__period-btn${period===val?" stats__period-btn--active":""}`}
                onClick={() => setPeriod(val)}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="stats__summary">
          <div className="stats__card stats__card--total">
            <div className="stats__card__label">Total Tasks</div>
            <div className="stats__card__value">{total}</div>
            <div className="stats__card__sub">in period</div>
          </div>
          <div className="stats__card stats__card--done">
            <div className="stats__card__label">Completed</div>
            <div className="stats__card__value">{done}</div>
            <div className="stats__card__sub">{rate}% rate</div>
          </div>
          <div className="stats__card stats__card--pending">
            <div className="stats__card__label">Pending</div>
            <div className="stats__card__value">{pending}</div>
            <div className="stats__card__sub">still to do</div>
          </div>
          <div className="stats__card stats__card--rate">
            <div className="stats__card__label">Success Rate</div>
            <div className="stats__card__value">{rate}%</div>
            <div className="stats__card__sub">completion score</div>
          </div>
        </div>

        {/* Streak */}
        <div className="stats__streak">
          <span className="stats__streak__icon">
            {streak>=7?"🔥":streak>=3?"⚡":streak>=1?"✅":"😴"}
          </span>
          <div className="stats__streak__text">
            <h3>{streak===0?"No streak yet":`${streak}-day streak!`}</h3>
            <p>{streak===0?"Complete a task today to start your streak":streak>=7?"You're on fire — keep it going!":"Complete tasks daily to build your streak"}</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="stats__panel">
          <p className="stats__panel__title">Daily Activity</p>
          <p className="stats__panel__hint">
            <span className="stats__panel__hint-dot" style={{ background: accentColor }} /> Completed &nbsp;
            <span className="stats__panel__hint-dot" style={{ background: "var(--t-border)" }} /> Total
          </p>
          {barData.every((d) => d.total===0)
            ? <p className="stats__empty">No tasks recorded yet</p>
            : <BarChart data={barData} />
          }
        </div>

        {/* Priority donut */}
        <div className="stats__panel">
          <p className="stats__panel__title">Priority Breakdown</p>
          <p className="stats__panel__hint">Distribution by priority level</p>
          <div className="stats__donut-wrap">
            <DonutChart slices={donutSlices} size={130} />
            <div className="stats__donut-legend">
              {donutSlices.map((s) => (
                <div key={s.label} className="stats__legend-row">
                  <span className="stats__legend-label">
                    <span className="stats__legend-dot" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="stats__legend-pct">
                    {total>0?Math.round((s.value/total)*100):0}%
                    <span className="stats__legend-sub">({s.value})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category bars */}
        {catList.length > 0 && (
          <div className="stats__panel">
            <p className="stats__panel__title">By Category</p>
            <p className="stats__panel__hint">Task count per category</p>
            <div className="stats__cat-list">
              {catList.map(({ name, count }) => (
                <div key={name} className="stats__cat-row">
                  <div className="stats__cat-row-header">
                    <span className="stats__cat-name">{name}</span>
                    <span className="stats__cat-count">{count} task{count!==1?"s":""}</span>
                  </div>
                  <div className="stats__cat-track">
                    <div className="stats__cat-fill"
                      style={{ width:`${(count/maxCat)*100}%`, background: CAT_COLOR[name] || accentColor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="stats__panel">
          <p className="stats__panel__title">Activity Heatmap</p>
          <p className="stats__panel__hint">8-week task density — darker = more tasks</p>
          <Heatmap taskMap={taskMap} />
        </div>

      </div>
    </div>
  );
}
