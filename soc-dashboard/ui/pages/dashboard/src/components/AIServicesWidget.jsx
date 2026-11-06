import React, { useMemo } from "react";

const AI_SERVICE_META = {
  openai:      { label: "OpenAI / ChatGPT",   color: "#10a37f", short: "GPT" },
  anthropic:   { label: "Anthropic / Claude", color: "#d97757", short: "CLA" },
  google:      { label: "Google Gemini",      color: "#4285f4", short: "GEM" },
  mscopilot:   { label: "Microsoft Copilot",  color: "#0078d4", short: "COP" },
  ghcopilot:   { label: "GitHub Copilot",     color: "#58a6ff", short: "GHC" },
  perplexity:  { label: "Perplexity",         color: "#20808d", short: "PPX" },
  mistral:     { label: "Mistral",            color: "#ff7000", short: "MIS" },
  cohere:      { label: "Cohere",             color: "#39594d", short: "COH" },
  huggingface: { label: "Hugging Face",       color: "#ffcc4d", short: "HF" },
  replicate:   { label: "Replicate",          color: "#ea4c89", short: "REP" },
  stability:   { label: "Stability AI",       color: "#7c3aed", short: "STB" },
  midjourney:  { label: "Midjourney",         color: "#7f5cff", short: "MJ" },
  runway:      { label: "Runway",             color: "#f433ab", short: "RW" },
  character:   { label: "Character.AI",       color: "#a855f7", short: "CAI" },
  poe:         { label: "Poe",                color: "#7c3aed", short: "POE" },
  deepseek:    { label: "DeepSeek",           color: "#2563eb", short: "DSK" },
  xai:         { label: "xAI / Grok",         color: "#e5e7eb", short: "GRK" },
  meta:        { label: "Meta AI",            color: "#0866ff", short: "MTA" },
  elevenlabs:  { label: "ElevenLabs",         color: "#f87171", short: "11L" },
};

export const AI_SERVICE_PATTERNS = [
  { key: "openai",      patterns: ["openai.com", "chatgpt.com", "oaistatic.com", "oaiusercontent.com"] },
  { key: "anthropic",   patterns: ["anthropic.com", "claude.ai"] },
  { key: "google",      patterns: ["gemini.google.com", "generativelanguage.googleapis.com", "bard.google.com", "ai.google.dev"] },
  { key: "mscopilot",   patterns: ["copilot.microsoft.com", "bing.com/chat", "copilot.cloud.microsoft"] },
  { key: "ghcopilot",   patterns: ["githubcopilot.com", "copilot.github.com", "api.githubcopilot.com"] },
  { key: "perplexity",  patterns: ["perplexity.ai"] },
  { key: "mistral",     patterns: ["mistral.ai", "chat.mistral.ai"] },
  { key: "cohere",      patterns: ["cohere.ai", "cohere.com"] },
  { key: "huggingface", patterns: ["huggingface.co", "hf.co"] },
  { key: "replicate",   patterns: ["replicate.com", "replicate.delivery"] },
  { key: "stability",   patterns: ["stability.ai", "stablediffusionweb.com"] },
  { key: "midjourney",  patterns: ["midjourney.com"] },
  { key: "runway",      patterns: ["runwayml.com"] },
  { key: "character",   patterns: ["character.ai"] },
  { key: "poe",         patterns: ["poe.com"] },
  { key: "deepseek",    patterns: ["deepseek.com"] },
  { key: "xai",         patterns: ["x.ai", "grok.com"] },
  { key: "meta",        patterns: ["meta.ai"] },
  { key: "elevenlabs",  patterns: ["elevenlabs.io"] },
];

export function AIServicesWidget({ services = [] }) {
  const { rows, totalRequests, totalServices } = useMemo(() => {
    const sorted = [...services].sort((a, b) => (b.count || 0) - (a.count || 0));
    const total = sorted.reduce((s, r) => s + (r.count || 0), 0);
    const max = sorted[0]?.count || 1;
    const enriched = sorted.map(s => ({
      ...s,
      meta: AI_SERVICE_META[s.key] || { label: s.key, color: "#64748b", short: "?" },
      pct: total > 0 ? (s.count / total * 100) : 0,
      barPct: max > 0 ? (s.count / max * 100) : 0,
    }));
    return {
      rows: enriched.slice(0, 10),
      totalRequests: total,
      totalServices: sorted.filter(s => (s.count || 0) > 0).length,
    };
  }, [services]);

  const empty = rows.length === 0 || totalRequests === 0;

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "4px 2px",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "0 4px",
        fontSize: 11,
        color: "#94a3b8",
      }}>
        <div>
          <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
            {totalServices}
          </span>
          <span style={{ marginLeft: 4 }}>services active</span>
        </div>
        <div>
          <span style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 600 }}>
            {totalRequests.toLocaleString()}
          </span>
          <span style={{ marginLeft: 4 }}>DNS requests</span>
        </div>
      </div>

      {empty ? (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#64748b",
          fontSize: 12,
          fontStyle: "italic",
        }}>
          No AI service DNS activity in time range
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          overflow: "auto",
          padding: "0 4px",
        }}>
          {rows.map((row, i) => (
            <div key={row.key} style={{
              display: "grid",
              gridTemplateColumns: "20px 28px 1fr auto",
              alignItems: "center",
              gap: 8,
              padding: "4px 6px",
              borderRadius: 4,
              background: i === 0 ? "rgba(255,255,255,0.03)" : "transparent",
            }}>
              <div style={{
                fontSize: 10,
                color: "#64748b",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}>
                #{i + 1}
              </div>
              <div style={{
                width: 28,
                height: 20,
                borderRadius: 3,
                background: row.meta.color,
                color: "#0b1120",
                fontSize: 9,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                letterSpacing: 0.3,
              }}>
                {row.meta.short}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 2,
                }}>
                  <span style={{
                    color: "#e2e8f0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {row.meta.label}
                  </span>
                  <span style={{ color: "#64748b", marginLeft: 6 }}>
                    {row.pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{
                  height: 4,
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${row.barPct}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${row.meta.color}aa, ${row.meta.color})`,
                    borderRadius: 2,
                    transition: "width 400ms ease",
                  }} />
                </div>
              </div>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#e2e8f0",
                fontVariantNumeric: "tabular-nums",
                minWidth: 44,
                textAlign: "right",
              }}>
                {(row.count || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AIServicesWidget;
