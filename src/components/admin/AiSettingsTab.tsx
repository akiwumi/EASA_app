"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff, RotateCcw, Lock, KeyRound } from "lucide-react";

const PROVIDERS: Record<string, { label: string; suggestedModels: string[] }> = {
  openai: {
    label: "OpenAI",
    suggestedModels: ["gpt-5.2", "gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"],
  },
  anthropic: {
    label: "Anthropic",
    suggestedModels: ["claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5"],
  },
  groq: {
    label: "Groq",
    suggestedModels: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  },
  google: {
    label: "Google Gemini",
    suggestedModels: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
};

export default function AiSettingsTab() {
  const [provider, setProvider] = useState("openai");
  const [model, setModel] = useState("gpt-4o");
  const [usingAppDefault, setUsingAppDefault] = useState(true);
  // Custom key UI — only shown when admin explicitly opens the override panel
  const [showOverridePanel, setShowOverridePanel] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.config) {
          setProvider(json.config.provider ?? "openai");
          setModel(json.config.model ?? "gpt-4o");
        }
        // api_key is never returned by the server — only whether a custom key is active
        setUsingAppDefault(json.usingAppDefault ?? true);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleProviderChange(p: string) {
    setProvider(p);
    setModel(PROVIDERS[p]?.suggestedModels[0] ?? "");
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const body: Record<string, string> = { provider, model };
    if (showOverridePanel && customKey.trim()) {
      body.apiKey = customKey.trim();
    }
    const res = await fetch("/api/admin/ai-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) {
      const savedCustomKey = showOverridePanel && customKey.trim();
      setUsingAppDefault(!savedCustomKey);
      if (savedCustomKey) {
        setCustomKey("");
        setShowOverridePanel(false);
        setShowKey(false);
      }
      setMsg({ text: "Settings saved.", ok: true });
    } else {
      setMsg({ text: json.error ?? "Save failed.", ok: false });
    }
    setSaving(false);
  }

  async function revertToAppDefault() {
    setClearing(true);
    setMsg(null);
    const res = await fetch("/api/admin/ai-settings", { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      setUsingAppDefault(true);
      setShowOverridePanel(false);
      setCustomKey("");
      setShowKey(false);
      setMsg({ text: "Reverted to app default key.", ok: true });
    } else {
      setMsg({ text: json.error ?? "Failed to revert.", ok: false });
    }
    setClearing(false);
  }

  const suggestedModels = PROVIDERS[provider]?.suggestedModels ?? [];
  const modelSuggestionsId = `${provider}-model-suggestions`;

  return (
    <div className="space-y-6">
      <div className="easa-card p-6 max-w-lg">
        <h2 className="mb-1 text-sm font-semibold">AI provider</h2>
        <p className="mb-5 text-xs text-[var(--easa-color-text-muted)]">
          Configure the AI model used for RSS analysis and regulation mapping.
          All schools are provisioned with a built-in OpenAI key — no setup required.
        </p>

        {loading ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : (
          <div className="space-y-4">

            {/* Key status banner */}
            {usingAppDefault ? (
              <div className="flex items-center gap-2.5 rounded-md border border-[var(--easa-color-accent-green)]/30 bg-[var(--easa-color-accent-green)]/10 px-3 py-2.5">
                <Lock size={13} className="shrink-0 text-[var(--easa-color-accent-green)]" strokeWidth={2} />
                <div>
                  <p className="text-xs font-medium text-[var(--easa-color-accent-green)]">App key active</p>
                  <p className="text-[11px] text-[var(--easa-color-accent-green)]/80">
                    Managed by the platform — not visible to schools or admins.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-md border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] px-3 py-2.5">
                <KeyRound size={13} className="shrink-0 text-[var(--easa-color-text-secondary)]" strokeWidth={2} />
                <div className="flex-1">
                  <p className="text-xs font-medium text-[var(--easa-color-text-primary)]">Custom key active</p>
                  <p className="text-[11px] text-[var(--easa-color-text-muted)]">
                    Your own {PROVIDERS[provider]?.label ?? "provider"} key is in use. The key value is not shown.
                  </p>
                </div>
                <button
                  className="shrink-0 text-xs text-[var(--easa-color-text-muted)] underline hover:text-[var(--easa-color-accent-pink)] transition"
                  disabled={clearing}
                  onClick={revertToAppDefault}
                >
                  {clearing ? "Removing…" : "Remove"}
                </button>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">
                Provider
              </label>
              <select
                className="easa-input w-full"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {Object.entries(PROVIDERS).map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">
                Model
              </label>
              <input
                className="easa-input w-full"
                value={model}
                list={modelSuggestionsId}
                placeholder="Enter a model ID"
                onChange={(e) => setModel(e.target.value)}
              />
              <datalist id={modelSuggestionsId}>
                {suggestedModels.map((suggestedModel) => (
                  <option key={suggestedModel} value={suggestedModel}>
                    {suggestedModel}
                  </option>
                ))}
              </datalist>
              <p className="mt-1.5 text-xs text-[var(--easa-color-text-muted)]">
                Any valid {PROVIDERS[provider]?.label ?? "provider"} model ID is allowed.
              </p>
            </div>

            {/* Custom key override — only revealed on explicit action */}
            {usingAppDefault && (
              <div>
                {!showOverridePanel ? (
                  <button
                    type="button"
                    className="text-xs text-[var(--easa-color-text-muted)] underline hover:text-[var(--easa-color-text-secondary)] transition"
                    onClick={() => setShowOverridePanel(true)}
                  >
                    Use your own API key instead
                  </button>
                ) : (
                  <div className="space-y-2 rounded-md border border-[var(--easa-color-border)] bg-[var(--easa-color-surface-2)] p-3">
                    <p className="text-xs font-medium text-[var(--easa-color-text-secondary)]">Custom API key</p>
                    <div className="relative">
                      <input
                        className="easa-input w-full pr-10 font-mono text-xs"
                        type={showKey ? "text" : "password"}
                        placeholder={`${PROVIDERS[provider]?.label ?? "Provider"} API key`}
                        value={customKey}
                        autoComplete="off"
                        onChange={(e) => setCustomKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
                        onClick={() => setShowKey((v) => !v)}
                      >
                        {showKey ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-[var(--easa-color-text-muted)]">
                      Your key will be stored securely and will not be shown again after saving.
                    </p>
                    <button
                      type="button"
                      className="text-xs text-[var(--easa-color-text-muted)] underline hover:text-[var(--easa-color-text-secondary)] transition"
                      onClick={() => { setShowOverridePanel(false); setCustomKey(""); setShowKey(false); }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                className="easa-btn primary flex items-center gap-2"
                disabled={saving}
                onClick={save}
              >
                <Save size={15} strokeWidth={1.75} />
                {saving ? "Saving…" : "Save settings"}
              </button>

              {!usingAppDefault && (
                <button
                  className="easa-btn flex items-center gap-2 text-xs"
                  disabled={clearing}
                  onClick={revertToAppDefault}
                >
                  <RotateCcw size={13} strokeWidth={1.75} />
                  {clearing ? "Reverting…" : "Use app default"}
                </button>
              )}
            </div>

            {msg && (
              <p className={`text-sm ${msg.ok ? "text-[var(--easa-color-accent-green)]" : "text-[var(--easa-color-accent-pink)]"}`}>
                {msg.text}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="easa-card p-4 max-w-lg">
        <p className="text-xs text-[var(--easa-color-text-muted)]">
          <strong className="text-[var(--easa-color-text-secondary)]">Note:</strong> After changing the provider,
          redeploy your Supabase Edge Functions so they pick up the new configuration from the database.
        </p>
      </div>
    </div>
  );
}
