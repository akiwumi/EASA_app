---
name: "clone-website"
description: "Use when the user wants to reverse-engineer a live website and rebuild a faithful clone using the bundled Next.js template and inspection workflow."
---

# Clone Website

Use this skill when the user wants to clone or closely recreate an existing website.

This installed skill bundles a reusable website-cloning template adapted from:
- `https://github.com/Mood-Global-Services/How-to-Clone-Website---Claude-Skills`

## What is included

- `template/` - Next.js starter project for the cloned site
- `template/TARGET.md` - optional scope and fidelity settings
- `template/AGENTS.md` - project-specific implementation guidance
- `template/docs/research/INSPECTION_GUIDE.md` - structured inspection checklist

## Workflow

1. Confirm or infer the target URL and desired scope.
2. Review `template/TARGET.md` if the user wants to constrain pages, fidelity, or post-clone customizations.
3. Use the bundled inspection guide to capture layout, typography, spacing, colors, assets, and interaction behavior.
4. Build the target inside the bundled template or copy the template into a new project workspace if the user wants a separate repo.
5. Preserve the source site's visual language before making stylistic improvements.

## Notes

- This repository was not packaged as a native Codex skill, so this installer wraps its template and docs into a local Codex skill folder.
- If the user wants to run the template directly, use the files under `template/`.
- Prefer Codex browser tooling or available browser plugins for inspection.
