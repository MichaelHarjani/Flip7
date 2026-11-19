# flip7-app

Multiplayer web implementation of [Flip7](https://www.theop.games/products/flip-7) — the push-your-luck card game by Eric Olsen / The Op Games.

**Stack**: Ruby on Rails 8, PostgreSQL, Redis, Hotwire (Turbo + Stimulus), Tailwind CSS + DaisyUI, Devise + OmniAuth, Action Cable, Sidekiq.

**Deployment**: Railway. Domain: `flip7.michaelharjani.com`.

## Game modes

- **Solo** — you vs 1–9 named bots (conservative / balanced / aggressive).
- **Pass & Play** — up to 8 people sharing one device, optionally plus bots.
- **Casual** — online room with a 4-letter code; the host starts; live updates.
- **Ranked duel** — Elo matchmaking (unlocks after 5 casual games).

## This app is the merge of three earlier builds

`flip7-app` is the base. Brought in from the earlier projects (which were
left untouched):

- **`flip7`** (first Rails build): round/game lifecycle (rounds now end and
  games finish), the game-board UI (cards, round summary with auto-advance,
  game-over stats, keyboard shortcuts, animations), live multiplayer
  updates, pass-and-play mode, deck carry-over between rounds, rotating
  dealer, and smarter bot decisions.
- **`f7`** (second build): tie-break rule, multi-deck scaling formula, bot
  names, and the 262-item acceptance checklist in
  `docs/acceptance_checklist.json` (pass flags reset — re-verify against
  this app).

The rules as implemented are in `app_spec.txt` §1 (official rules plus four
marked house rules).

## Local development

```bash
bundle install
bin/rails db:prepare
bin/dev            # web + tailwind watcher
bundle exec rspec
```

Needs PostgreSQL and Redis (or Valkey) running locally.

## How this project is built

This is being built via a **manager-worker autonomous coding loop**. See `CLAUDE.md` for the recipe.

- `app_spec.txt` — the spec
- `docs/` — expanded reference docs (data model, achievements, game engine, real-time layer, frontend)
- `features.json` — the work queue; each entry is a testable feature with `status`, `prerequisites`, `related_files`
- Workers pick unclaimed features, implement them, commit, and return a summary. The manager (the Claude Code conversation in this folder) dispatches and merges.

## Related repos (DO NOT MODIFY from this project)

- `/Users/michael/Projects/flip7` — the first Rails build (merged in; reference only)
- `/Users/michael/Projects/f7` — the second Rails build (merged in; reference only)
- `/Users/michael/Projects/flip7-simulations` — the Python simulation engine and strategy experiments (to be ported in Phase 7)
- `/Users/michael/Projects/create-ops` — the autonomous-coding-loop template this project was bootstrapped from
- `/Users/michael/job/career-ops` — unrelated AI job search system
