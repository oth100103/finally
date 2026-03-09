# Review: Changes Since Last Commit

## Scope
Compared working tree against `HEAD` (`14550e1`) for:
- `.claude/settings.json` (modified)
- `README.md` (modified)
- `planning/PLAN.md` (modified)
- `.claude/origina_settings.json` (new)
- `.claude/settings.local.json` (new)

## Findings (Ordered by Severity)

### 1. High: `Stop` hook can recursively invoke itself
- Files: `.claude/settings.json:3`, `.claude/settings.json:5`, `.claude/settings.json:9`
- `Stop` hook uses an empty matcher and runs `codex exec "Review changes since last commit and write results to planning/REVIEW.md"`.
- With `matcher: ""`, every stop event matches. If the spawned `codex exec` also emits `Stop`, this can repeatedly retrigger.
- Risk: runaway executions, repeated file rewrites, and unnecessary compute usage.
- Recommendation: restrict matcher scope and/or move review execution to an explicit manual command.

### 2. Medium: Active settings dropped plugin configuration
- Files: `.claude/settings.json:1`, `.claude/origina_settings.json:2`
- `enabledPlugins` was replaced by `hooks` in active settings; plugin settings now only exist in the backup file.
- Risk: plugin-dependent workflows can silently break.
- Recommendation: merge `hooks` into the active settings while preserving `enabledPlugins`.

### 3. Medium: Local permissions allow unrestricted `codex exec` commands
- File: `.claude/settings.local.json:4`
- Allow rule is `Bash(codex exec:*)`, which permits any `codex exec` command payload.
- Risk: larger-than-necessary command surface if hook behavior misfires.
- Recommendation: narrow allowlist to only the exact command pattern required.

### 4. Low: Market data ticker scope is internally inconsistent
- Files: `planning/PLAN.md:159`, `planning/PLAN.md:168`, `planning/PLAN.md:175`
- Plan alternates between:
  - watchlist-only polling,
  - union of watchlist + positions,
  - and “equivalent to watchlist” wording for single-user mode.
- Risk: implementers may produce different behavior for pricing held-but-not-watched symbols.
- Recommendation: define one canonical ticker-universe rule and use it consistently.

### 5. Low: Trade API response is ambiguous for full liquidation
- Files: `planning/PLAN.md:204`, `planning/PLAN.md:248`
- Plan says position rows are deleted on full sell, but trade endpoint still documents a `position` field without nullability semantics.
- Risk: frontend/backend response mismatch on fully closed positions.
- Recommendation: specify whether `position` becomes `null` (or define an alternate response shape) when quantity reaches zero.

### 6. Low: README removed executable quick-start path
- File: `README.md:26`
- Quick-start commands were replaced with status text.
- Risk: new contributors lack a direct run path from README.
- Recommendation: keep a minimal “run now” section (Docker or local) even while project remains in progress.

## Residual Risk / Test Gaps
- No runtime checks were executed for the new hook behavior.
- Hook behavior should be validated once in an isolated run to ensure no recursive trigger loop.
