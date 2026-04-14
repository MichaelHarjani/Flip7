# flip7-app

Multiplayer web implementation of [Flip7](https://www.theop.games/products/flip-7) — the push-your-luck card game by Eric Olsen / The Op Games.

**Stack**: Ruby on Rails 8, PostgreSQL, Redis, Hotwire (Turbo + Stimulus), Tailwind CSS + DaisyUI, Devise + OmniAuth, Action Cable, Sidekiq.

**Deployment**: Railway. Domain: `flip7.michaelharjani.com`.

## How this project is built

This is being built via a **manager-worker autonomous coding loop**. See `CLAUDE.md` for the recipe.

- `app_spec.txt` — the spec
- `docs/` — expanded reference docs (data model, achievements, game engine, real-time layer, frontend)
- `features.json` — the work queue; each entry is a testable feature with `status`, `prerequisites`, `related_files`
- Workers pick unclaimed features, implement them, commit, and return a summary. The manager (the Claude Code conversation in this folder) dispatches and merges.

## Related repos (DO NOT MODIFY from this project)

- `/Users/michael/Projects/flip7` — a previous Rails scaffold (reference only)
- `/Users/michael/Projects/flip7-simulations` — the TypeScript simulation engine (to be ported in Phase 7)
- `/Users/michael/Projects/create-ops` — the autonomous-coding-loop template this project was bootstrapped from
- `/Users/michael/job/career-ops` — unrelated AI job search system
