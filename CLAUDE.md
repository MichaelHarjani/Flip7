# flip7-app

Production build of Flip7 — multiplayer web version of the card game by Eric Olsen / The Op Games. Built via a manager-worker autonomous coding loop.

**This project is Ruby on Rails 8**, not TypeScript. The parent `/Users/michael/Projects/CLAUDE.md` says "TypeScript primary" — override that here. Use Ruby 3.3+, Rails 8+, and the gems listed in `app_spec.txt` §2.1.

## Roles

**You (the manager)**: the Claude Code conversation open in this folder. You maintain `features.json`, pick dispatchable work, spawn worker sub-agents via the Agent tool, and integrate their results.

**Workers**: sub-agents spawned by the manager via the Agent tool. Each worker takes ONE feature, implements it, commits, and returns a summary.

## Sources of truth

- `app_spec.txt` — high-level project description (tech stack, goals, phases)
- `features.json` — the work queue (schema below)
- `docs/data_model.md` — database schemas (expanded from spec §3)
- `docs/achievements.md` — achievement list + seed data (expanded from spec §4)
- `docs/game_engine.md` — game engine interface + bot AI (from spec §6, §13)
- `docs/realtime.md` — Action Cable channels + Sidekiq jobs (from spec §7, §11)
- `docs/frontend.md` — Hotwire/Stimulus/Tailwind patterns (from spec §9)

Workers get the feature description + only the relevant docs, not the whole spec. The manager picks what to include.

## `features.json` schema

```json
[
  {
    "id": "be-user-model",
    "slug": "be-user-model",
    "title": "User data model",
    "description": "Full spec including acceptance criteria and constraints.",
    "related_files": [
      "db/migrate/001_create_users.rb",
      "app/models/user.rb",
      "spec/models/user_spec.rb"
    ],
    "related_docs": ["docs/data_model.md"],
    "prerequisites": [],
    "status": "pending",
    "notes": ""
  }
]
```

Field rules:

- `id` — stable, unique, kebab-case. Never renamed.
- `slug` — used for branch names (`feature/<slug>`). Defaults to `id`.
- `title` — short human label.
- `description` — full spec the worker reads. Include acceptance criteria.
- `related_files` — every file the feature will read or write. Used for no-overlap scheduling.
- `related_docs` — doc files from `docs/` the worker should read as reference. Optional.
- `prerequisites` — array of feature ids that must be `"done"` before this can start.
- `status` — `pending` | `in_progress` | `done` | `blocked` | `failed`.
- `notes` — free text; manager or workers may append.

## Manager scheduling algorithm

On each dispatch cycle:

1. Read `features.json`.
2. `in_flight_files = union(f.related_files for f where status == "in_progress")`
3. `done_ids = {f.id for f where status == "done"}`
4. `dispatchable = [f for f where f.status == "pending" AND all(p in done_ids for p in f.prerequisites) AND f.related_files ∩ in_flight_files == ∅]`
5. If empty and nothing in flight → stop, report to user.
6. Pick top item (first in dispatchable list — the author orders features by priority).
7. Set `f.status = "in_progress"`, write `features.json`, commit.
8. Spawn Agent worker with prompt template below.
9. When worker returns:
   - Success → set `f.status = "done"`, append summary to `f.notes`, commit.
   - Failure → set `f.status = "failed"`, append error, leave for review.
10. Go to step 1.

Parallelism: default 1 (serial) for now. Bump to 2–3 once the pattern is validated and git worktree isolation is confirmed working.

## Worker prompt template

```
You are a worker sub-agent in an autonomous coding loop for flip7-app
(a Ruby on Rails 8 build of the Flip7 card game).

Project root: /Users/michael/Projects/flip7-app
Your working directory is this project root.

Implement EXACTLY ONE feature and commit it. Do not modify features.json.

Feature: {id}
Title: {title}
Description:
{description}

Related files (only touch these unless importing forces otherwise):
{related_files}

Reference docs (read for context):
- app_spec.txt (always)
{related_docs bullet list}

Stack reminder: Rails 8, Ruby 3.3+, PostgreSQL, Redis, Hotwire (Turbo+Stimulus),
Tailwind + DaisyUI, Devise + OmniAuth (Google), Sidekiq, AASM, Phlex.

Steps:
1. Read app_spec.txt (sections §1 game rules and §2 architecture always,
   plus whatever §N is relevant to this feature).
2. Read each file in related_docs.
3. Read each related_file that already exists.
4. Implement the feature per the description. Match existing project
   conventions (RSpec alongside source, snake_case, strong params, etc.).
5. Verify:
   - If specs exist for this feature: run `bundle exec rspec <file>` and
     confirm they pass.
   - For DB changes: run `bin/rails db:migrate` and confirm success.
   - For controllers/views: run `bundle exec rspec spec/requests/<file>` or
     add a minimal test.
   - Otherwise: run `bin/rails runner "puts 'ok'"` to confirm boot.
6. Commit on `main` (serial mode) with message
   `feat({slug}): {title}`. Include all touched files.
7. Return a JSON object:
   {
     "success": true|false,
     "touched_files": [...],
     "verification": "rspec: 5/5" | "migrate: ok" | "boot: ok",
     "summary": "one-sentence description of what you did",
     "errors": "only if success:false — include enough detail to debug"
   }

Rules:
- Never modify features.json (manager owns it).
- Never create new features.
- If the description is wrong or impossible, set success:false and
  explain in errors. Do NOT fix the spec — that's the manager's call.
- If you must touch files outside related_files, list them in touched_files
  and explain why in summary.
- NEVER modify files in /Users/michael/job/career-ops, /Users/michael/Projects/flip7,
  /Users/michael/Projects/flip7-simulations, or /Users/michael/Projects/create-ops.
```

## First-run checklist

If `features.json` is `[]`:

1. Read `app_spec.txt`.
2. Generate `features.json` from §15 Development Phases, decomposed into ~25–35 features covering scaffolding, core data model, game engine, auth, solo mode, achievements, casual multiplayer, ranked duels, social, and polish.
3. Propose to user before committing (in an autonomous run, just commit with a note — user reviews in the morning).
4. Start the dispatch loop.

## Rules

- Only the manager modifies `features.json`.
- Workers commit on `main` in serial mode; no parallelism until worktree isolation is validated.
- Two features touching the same file cannot run in parallel (enforced by scheduler).
- NEVER modify files in `/Users/michael/job/career-ops`, `/Users/michael/Projects/flip7`, `/Users/michael/Projects/flip7-simulations`, or `/Users/michael/Projects/create-ops`.

(Parent `/Users/michael/Projects/CLAUDE.md` says TypeScript default — **OVERRIDDEN HERE**. This project is Ruby on Rails. Parent's autonomous-dev workflow and progress reporting still apply.)
