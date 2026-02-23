import { useState } from "react";

const fontFamily = "'Recursive', ui-monospace, monospace";

const T = {
  bg: "#080b12", surface: "#0c111c", border: "#151e30",
  text: "#dce4ec", textMuted: "#6d85a0", textDim: "#4e6580",
  blue: "#38a0ff", amber: "#e5a820", magenta: "#d946a8",
  green: "#18c760", red: "#ef4444",
};

const type = {
  display:    { fvs: "'wght' 300, 'MONO' 0, 'CASL' 0, 'CRSV' 0.5, 'slnt' 0", size: 36 },
  heading:    { fvs: "'wght' 500, 'MONO' 0, 'CASL' 0.2, 'CRSV' 0.5, 'slnt' 0", size: 24 },
  subhead:    { fvs: "'wght' 600, 'MONO' 0, 'CASL' 0.3, 'CRSV' 0.5, 'slnt' -3", size: 14, ls: "1.5px" },
  body:       { fvs: "'wght' 400, 'MONO' 0, 'CASL' 0.6, 'CRSV' 0.5, 'slnt' 0", size: 13 },
  label:      { fvs: "'wght' 600, 'MONO' 1, 'CASL' 0.3, 'CRSV' 0.5, 'slnt' -4", size: 12, ls: "1px" },
  tag:        { fvs: "'wght' 800, 'MONO' 0, 'CASL' 0, 'CRSV' 0.5, 'slnt' -3", size: 11, ls: "1.5px" },
  metric:     { fvs: "'wght' 400, 'MONO' 1, 'CASL' 0.6, 'CRSV' 0.5, 'slnt' 0", size: 32, ls: "-0.5px" },
  metricUnit: { fvs: "'wght' 500, 'MONO' 1, 'CASL' 0, 'CRSV' 0.5, 'slnt' 0", size: 13, ls: "0.5px" },
  data:       { fvs: "'wght' 500, 'MONO' 1, 'CASL' 0, 'CRSV' 0.5, 'slnt' 0", size: 13 },
  code:       { fvs: "'wght' 400, 'MONO' 1, 'CASL' 0, 'CRSV' 0.5, 'slnt' 0", size: 13, ls: "0.5px" },
  timestamp:  { fvs: "'wght' 500, 'MONO' 1, 'CASL' 0, 'CRSV' 0.5, 'slnt' 0", size: 11, ls: "0.5px" },
  nav:        { fvs: "'wght' 500, 'MONO' 0.5, 'CASL' 0.2, 'CRSV' 0.5, 'slnt' -2", size: 14, ls: "1px" },
  navActive:  { fvs: "'wght' 700, 'MONO' 0.5, 'CASL' 0.1, 'CRSV' 0.5, 'slnt' -2", size: 14, ls: "1px" },
  link:       { fvs: "'wght' 700, 'MONO' 0, 'CASL' 0, 'CRSV' 0.5, 'slnt' -15", size: 10, ls: "1px" },
  breadcrumb: { fvs: "'wght' 700, 'MONO' 1, 'CASL' 0.2, 'CRSV' 0.5, 'slnt' -7", size: 10, ls: "2.5px" },
};

const s = (role) => ({
  fontFamily,
  fontVariationSettings: type[role].fvs,
  fontSize: type[role].size,
  ...(type[role].ls && { letterSpacing: type[role].ls }),
});

const parseAxes = (fvs) => {
  const axes = {};
  fvs.replace(/'(\w+)'\s+([-\d.]+)/g, (_, k, v) => { axes[k] = parseFloat(v); });
  return axes;
};

const AxisPill = ({ name, value, color }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: "1px 6px", background: `${color}10`, border: `1px solid ${color}20`,
    fontSize: 9, ...s("code"), fontSize: 9,
  }}>
    <span style={{ color: T.textDim }}>{name}</span>
    <span style={{ color }}>{value}</span>
  </span>
);

const axisColor = (name) => ({
  wght: T.text, MONO: T.amber, CASL: T.magenta, slnt: T.green, CRSV: T.textDim,
}[name] || T.textDim);

const roles = [
  { id: "display",    label: "Display",      sample: "System_Overview",        context: "Page titles, hero text" },
  { id: "heading",    label: "Heading",       sample: "Incident Feed",          context: "Section headers, card titles" },
  { id: "subhead",    label: "Subhead",       sample: "Active Entities (1h)",   context: "Card subtitles, secondary headers" },
  { id: "body",       label: "Body",          sample: "No high-risk entities recorded yet. The deception layer is monitoring 13 active honeypots.", context: "Descriptions, tooltips, longer text" },
  { id: "label",      label: "Label",         sample: "TEST & ATTACK",          context: "Sidebar group headers, section tags" },
  { id: "tag",        label: "Tag",           sample: "CRITICAL",               context: "Status badges, severity chips" },
  { id: "metric",     label: "Metric",        sample: "2,847",                  context: "Big numbers, KPI values" },
  { id: "metricUnit", label: "Metric Unit",   sample: "RPS",                    context: "Units after numbers" },
  { id: "data",       label: "Data",          sample: "198.51.100.12 → /api/orders", context: "Table cells, IP addresses, paths" },
  { id: "code",       label: "Code",          sample: "crucible run --scenario breach.yaml", context: "Commands, config, inline code" },
  { id: "timestamp",  label: "Timestamp",     sample: "11:19:35 · 2ms",         context: "Log times, durations" },
  { id: "nav",        label: "Nav",           sample: "Breach Protocol",         context: "Sidebar navigation links" },
  { id: "navActive",  label: "Nav Active",    sample: "Defense",                 context: "Active sidebar link" },
  { id: "link",       label: "Link",          sample: "TRAFFIC →",              context: "Clickable links, actions" },
  { id: "breadcrumb", label: "Breadcrumb",    sample: "SYSTEM / OVERVIEW",       context: "Path navigation" },
];

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{
        ...s("label"), color: T.blue, marginBottom: 20,
        paddingBottom: 8, borderBottom: `1px solid ${T.border}`,
      }}>{title}</div>
      {children}
    </div>
  );
}

export default function TypeSpec() {
  const [tab, setTab] = useState("specimen");
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Recursive:slnt,wght,CASL,CRSV,MONO@-15..0,300..900,0..1,0..1,0..1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; }
      `}</style>
      <div style={{
        minHeight: "100vh", background: T.bg, color: T.text,
        fontFamily, padding: "40px 48px",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...s("breadcrumb"), color: T.textMuted, marginBottom: 12 }}>
            APPARATUS DESIGN SYSTEM / TYPOGRAPHY
          </div>
          <div style={{ ...s("display"), marginBottom: 6 }}>Recursive Type System</div>
          <div style={{ ...s("body"), color: T.textMuted, maxWidth: 600, lineHeight: 1.6 }}>
            One variable font, 15 roles, 5 axes. CASL encodes warmth — human text is casual, machine output is clinical. MONO separates prose from data.
          </div>
        </div>

        {/* Color-coded axis legend */}
        <div style={{
          display: "flex", gap: 16, margin: "20px 0 40px", padding: "12px 16px",
          background: T.surface, border: `1px solid ${T.border}`,
        }}>
          {[
            { axis: "wght", desc: "weight", range: "300–900", color: T.text },
            { axis: "MONO", desc: "monospace", range: "0–1", color: T.amber },
            { axis: "CASL", desc: "casual", range: "0–1", color: T.magenta },
            { axis: "slnt", desc: "slant", range: "-15–0", color: T.green },
          ].map(a => (
            <div key={a.axis} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: a.color, opacity: 0.7 }} />
              <span style={{ ...s("code"), fontSize: 10, color: a.color }}>{a.axis}</span>
              <span style={{ ...s("code"), fontSize: 10, color: T.textDim }}>{a.desc} ({a.range})</span>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, marginBottom: 32 }}>
          {["specimen", "context", "axis map"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? T.surface : "transparent",
              border: `1px solid ${tab === t ? T.border : "transparent"}`,
              color: tab === t ? T.blue : T.textMuted,
              padding: "6px 16px", cursor: "pointer", fontFamily,
              ...s("label"), fontSize: 10,
            }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {/* ─── SPECIMEN TAB ─────────────────────── */}
        {tab === "specimen" && (
          <Section title="TYPE SPECIMEN">
            {roles.map(role => {
              const axes = parseAxes(type[role.id].fvs);
              return (
                <div key={role.id} style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 16, padding: "14px 0",
                  borderBottom: `1px solid ${T.border}08`,
                  alignItems: "center",
                }}>
                  {/* Left: role info */}
                  <div>
                    <div style={{ ...s("data"), fontSize: 11, color: T.text, marginBottom: 3 }}>
                      {role.label}
                    </div>
                    <div style={{ ...s("code"), fontSize: 9, color: T.textDim, marginBottom: 6 }}>
                      {role.context}
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {Object.entries(axes).filter(([k]) => k !== "CRSV").map(([k, v]) => (
                        <AxisPill key={k} name={k} value={v} color={axisColor(k)} />
                      ))}
                      {type[role.id].ls && (
                        <AxisPill name="ls" value={type[role.id].ls} color={T.textDim} />
                      )}
                    </div>
                  </div>

                  {/* Right: live sample */}
                  <div style={{
                    ...s(role.id), color: T.text, lineHeight: 1.4,
                    whiteSpace: role.id === "body" ? "normal" : "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {role.sample}
                  </div>
                </div>
              );
            })}
          </Section>
        )}

        {/* ─── CONTEXT TAB ──────────────────────── */}
        {tab === "context" && (
          <Section title="IN CONTEXT">
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, padding: 32, maxWidth: 800,
            }}>
              {/* Breadcrumb */}
              <div style={{ ...s("breadcrumb"), color: T.textMuted, marginBottom: 12 }}>
                SYSTEM / OVERVIEW
              </div>

              {/* Display */}
              <div style={{ ...s("display"), color: T.text, marginBottom: 4 }}>
                System_Overview
              </div>

              {/* Body subtitle */}
              <div style={{ ...s("body"), color: T.textMuted, marginBottom: 28 }}>
                Incident-first / real-time state
              </div>

              {/* Triage card */}
              <div style={{
                background: T.bg, border: `1px solid ${T.border}`, padding: 20, marginBottom: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ ...s("label"), color: T.textMuted }}>TRAFFIC</span>
                  <span style={{ ...s("link"), color: T.blue }}>TRAFFIC →</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...s("metric"), color: T.text }}>2,847</span>
                  <span style={{ ...s("metricUnit"), color: T.textMuted }}>RPS</span>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  <span style={{ ...s("data"), color: T.textMuted }}>42 ACTIVE SOURCES</span>
                  <span style={{ ...s("data"), color: T.textMuted }}>3% ERRORS</span>
                </div>
              </div>

              {/* Heading */}
              <div style={{ ...s("heading"), color: T.text, marginBottom: 16 }}>
                Incident Feed
              </div>

              {/* Incident row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ ...s("timestamp"), color: T.textMuted }}>11:19:35</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.red }} />
                <span style={{ ...s("data"), color: T.text }}>SHELL COMMAND</span>
                <span style={{
                  ...s("tag"), color: T.red,
                  padding: "2px 8px", border: `1px solid ${T.red}40`,
                }}>CRITICAL</span>
                <span style={{ ...s("data"), color: T.textMuted, marginLeft: "auto" }}>
                  /api/orders · 198.51.100.12
                </span>
              </div>

              {/* Second row */}
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
              }}>
                <span style={{ ...s("timestamp"), color: T.textMuted }}>11:19:33</span>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.amber }} />
                <span style={{ ...s("data"), color: T.text }}>HONEYPOT HIT</span>
                <span style={{
                  ...s("tag"), color: T.amber,
                  padding: "2px 8px", border: `1px solid ${T.amber}40`,
                }}>WARNING</span>
                <span style={{ ...s("data"), color: T.textMuted, marginLeft: "auto" }}>
                  /dashboard/stats · 10.0.0.5
                </span>
              </div>

              {/* Subhead */}
              <div style={{ ...s("subhead"), color: T.textMuted, marginTop: 24, marginBottom: 8 }}>
                Defenses
              </div>

              {/* Body text */}
              <div style={{ ...s("body"), color: T.textMuted, lineHeight: 1.6, maxWidth: 500 }}>
                No high-risk entities recorded yet. The deception layer is monitoring 13 active honeypots across the cluster perimeter.
              </div>

              {/* Code block */}
              <div style={{
                marginTop: 20, padding: 14, background: T.bg, border: `1px solid ${T.border}`,
              }}>
                <div style={{ ...s("code"), color: T.textMuted }}>
                  $ crucible run --scenario breach.yaml --target chimera:8080
                </div>
              </div>
            </div>

            {/* Sidebar fragment */}
            <div style={{
              background: "#0a0e18", border: `1px solid ${T.border}`,
              padding: "16px 0", marginTop: 20, width: 220,
            }}>
              <div style={{ ...s("label"), color: T.textMuted, padding: "0 18px", marginBottom: 8 }}>
                OBSERVE
              </div>
              {["Traffic", "Timeline", "Attackers"].map((item, i) => (
                <div key={item} style={{
                  ...(i === 0 ? s("navActive") : s("nav")),
                  color: i === 0 ? T.text : T.textMuted,
                  padding: "6px 18px",
                  background: i === 0 ? `${T.blue}08` : "transparent",
                  borderLeft: i === 0 ? `2px solid ${T.blue}` : "2px solid transparent",
                }}>{item}</div>
              ))}
              <div style={{ ...s("label"), color: T.textMuted, padding: "14px 18px 8px" }}>
                DEFEND
              </div>
              {["Defense", "Deception"].map(item => (
                <div key={item} style={{
                  ...s("nav"), color: T.textMuted, padding: "6px 18px",
                  borderLeft: "2px solid transparent",
                }}>{item}</div>
              ))}
            </div>
          </Section>
        )}

        {/* ─── AXIS MAP TAB ─────────────────────── */}
        {tab === "axis map" && (
          <Section title="AXIS DISTRIBUTION">
            <div style={{ ...s("body"), color: T.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
              How each axis is distributed across roles. The CASL gradient is the brand voice — warmest on human-facing text, clinical on machine output.
            </div>

            {/* CASL gradient */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...s("data"), fontSize: 11, color: T.magenta, marginBottom: 12 }}>
                CASL (Casual) Distribution
              </div>
              {[...roles].sort((a, b) => {
                const aVal = parseAxes(type[a.id].fvs).CASL;
                const bVal = parseAxes(type[b.id].fvs).CASL;
                return bVal - aVal;
              }).map(role => {
                const casl = parseAxes(type[role.id].fvs).CASL;
                return (
                  <div key={role.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "4px 0",
                  }}>
                    <span style={{ ...s("code"), fontSize: 10, color: T.textDim, width: 90, textAlign: "right" }}>
                      {role.label}
                    </span>
                    <div style={{ width: 200, height: 6, background: T.border }}>
                      <div style={{
                        width: `${casl * 100}%`, height: "100%",
                        background: T.magenta, opacity: 0.3 + casl * 0.7,
                      }} />
                    </div>
                    <span style={{ ...s("code"), fontSize: 10, color: T.magenta }}>{casl}</span>
                    <span style={{
                      ...s(role.id), fontSize: Math.min(type[role.id].size, 14), color: T.text,
                    }}>Sample</span>
                  </div>
                );
              })}
            </div>

            {/* MONO gradient */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ ...s("data"), fontSize: 11, color: T.amber, marginBottom: 12 }}>
                MONO (Monospace) Distribution
              </div>
              {[...roles].sort((a, b) => {
                const aVal = parseAxes(type[a.id].fvs).MONO;
                const bVal = parseAxes(type[b.id].fvs).MONO;
                return bVal - aVal;
              }).map(role => {
                const mono = parseAxes(type[role.id].fvs).MONO;
                return (
                  <div key={role.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "4px 0",
                  }}>
                    <span style={{ ...s("code"), fontSize: 10, color: T.textDim, width: 90, textAlign: "right" }}>
                      {role.label}
                    </span>
                    <div style={{ width: 200, height: 6, background: T.border }}>
                      <div style={{
                        width: `${mono * 100}%`, height: "100%",
                        background: T.amber, opacity: 0.3 + mono * 0.7,
                      }} />
                    </div>
                    <span style={{ ...s("code"), fontSize: 10, color: T.amber }}>{mono}</span>
                    <span style={{
                      ...s(role.id), fontSize: Math.min(type[role.id].size, 14), color: T.text,
                    }}>Sample</span>
                  </div>
                );
              })}
            </div>

            {/* Slant gradient */}
            <div>
              <div style={{ ...s("data"), fontSize: 11, color: T.green, marginBottom: 12 }}>
                slnt (Slant) Distribution
              </div>
              {[...roles].sort((a, b) => {
                const aVal = parseAxes(type[a.id].fvs).slnt;
                const bVal = parseAxes(type[b.id].fvs).slnt;
                return aVal - bVal;
              }).map(role => {
                const slnt = parseAxes(type[role.id].fvs).slnt;
                return (
                  <div key={role.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "4px 0",
                  }}>
                    <span style={{ ...s("code"), fontSize: 10, color: T.textDim, width: 90, textAlign: "right" }}>
                      {role.label}
                    </span>
                    <div style={{ width: 200, height: 6, background: T.border }}>
                      <div style={{
                        width: `${(Math.abs(slnt) / 15) * 100}%`, height: "100%",
                        background: T.green, opacity: 0.3 + (Math.abs(slnt) / 15) * 0.7,
                      }} />
                    </div>
                    <span style={{ ...s("code"), fontSize: 10, color: T.green }}>{slnt}</span>
                    <span style={{
                      ...s(role.id), fontSize: Math.min(type[role.id].size, 14), color: T.text,
                    }}>Sample</span>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 48, paddingTop: 20, borderTop: `1px solid ${T.border}`,
          display: "flex", justifyContent: "space-between",
        }}>
          <span style={{ ...s("code"), fontSize: 10, color: T.textDim }}>
            Recursive · Stephen Nixon · recursive.design
          </span>
          <span style={{ ...s("code"), fontSize: 10, color: T.textDim }}>
            Apparatus Design System · 2026
          </span>
        </div>
      </div>
    </>
  );
}
