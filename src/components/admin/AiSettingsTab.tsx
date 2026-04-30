"use client";

import { useEffect, useState } from "react";
import { Save, Eye, EyeOff } from "lucide-react";

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
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ai-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.config) {
          setProvider(json.config.provider ?? "openai");
          setModel(json.config.model ?? "gpt-4o");
          setApiKey(json.config.api_key ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // When provider changes, reset model to first option
  function handleProviderChange(p: string) {
    setProvider(p);
    setModel(PROVIDERS[p]?.suggestedModels[0] ?? "");
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/ai-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, apiKey: apiKey || undefined }),
    });
    const json = await res.json();
    setMsg(res.ok ? { text: "Settings saved.", ok: true } : { text: json.error ?? "Save failed.", ok: false });
    setSaving(false);
  }

  const suggestedModels = PROVIDERS[provider]?.suggestedModels ?? [];
  const modelSuggestionsId = `${provider}-model-suggestions`;

  return (
    <div className="space-y-6">
      <div className="easa-card p-6 max-w-lg">
        <h2 className="mb-1 text-sm font-semibold">AI provider</h2>
        <p className="mb-5 text-xs text-[var(--easa-color-text-muted)]">
          The provider and model used by the Edge Functions for RSS analysis and regulation mapping.
          Your API key is stored securely and only accessible to admins.
        </p>

        {loading ? (
          <p className="text-sm text-[var(--easa-color-text-muted)]">Loading…</p>
        ) : (
          <div className="space-y-4">
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
                Any valid {PROVIDERS[provider]?.label ?? "provider"} model ID is allowed. Suggested models appear as
                you type.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--easa-color-text-secondary)]">
                API key
              </label>
              <div className="relative">
                <input
                  className="easa-input w-full pr-10 font-mono text-xs"
                  type={showKey ? "text" : "password"}
                  placeholder={`${PROVIDERS[provider]?.label ?? "Provider"} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--easa-color-text-muted)] hover:text-[var(--easa-color-text-primary)]"
                  onClick={() => setShowKey((v) => !v)}
                >
                  {showKey ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[var(--easa-color-text-muted)]">
                Leave blank to keep the existing key.
              </p>
            </div>

            <button
              className="easa-btn primary flex items-center gap-2"
              disabled={saving}
              onClick={save}
            >
              <Save size={15} strokeWidth={1.75} />
              {saving ? "Saving…" : "Save settings"}
            </button>

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
