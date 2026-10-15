# Decisions

## 2026-10-11 - How rtl-mode decides direction and what counts as a quote
**Decision:** A line's direction comes from its Hebrew vs Latin letter count outside quotes, code spans and links; a tie goes RTL. Only `"…"` and `“…”` count as quotes; a `"` between two Hebrew letters is gershayim (צה"ל), not a quote. In an English line the RTL embedding goes inside the quotation marks, so the marks themselves stay in the English flow. Hebrew runs in an English line take their trailing `.,;:!?…` but not brackets.
**Context:** First build of the mod, from the spec in the request.
**Rejected alternatives:** Treating `'…'` as quotes: English apostrophes (don't) and Hebrew geresh (ג'ירפה) would pair up wrongly. Including `)` in trailing punctuation: it would split from its `(`.

## 2026-10-11 - Where the on/off mode lives
**Decision:** `$.store` (key `isOn`) is the saved value across sessions; `$.state` mirrors it for the session so the band and every message redraw the moment it flips. `/rtl` toggles what this session shows.
**Context:** `$.store` alone does not redraw anything; `$.state` alone is lost when the session ends.

## 2026-10-11 - Permanent home and install method
**Decision:** The mod lives in `/Users/nganeglus/dev/rtl-mode` and is installed at user scope as `rtl-mode@rtl-mode-local`, from a marketplace file in the same folder (`.claude-plugin/marketplace.json`, source `./`). Claude Code reads the plugin from this folder itself, so edits here take effect in the next session or after `/reload-plugins`.
**Context:** The first build lived in a per-session mods folder that goes away with the session. Active projects moved off Google Drive to `~/dev` after Drive sync froze dev tools (see PROJECTS_GUIDE), so a mod loaded at every session start belongs on the local disk.
**Rejected alternatives:** `SaaS Dev` on Google Drive (sync can stall or leave files online-only, and this is read at every session start). `CLAUDE_CODE_PLUGIN_DIRS` in settings (meant for development, not an install).

## 2026-10-16 - Other machines install from GitHub
**Decision:** The folder is published as the private repo `nganeglus/rtl-mode`; other machines (the PC) install with `claude plugin marketplace add nganeglus/rtl-mode` and `claude plugin install rtl-mode@rtl-mode-local`. The Mac keeps reading the plugin from `~/dev/rtl-mode`.
**Context:** The user wanted the mod in every conversation on the PC too, and sessions that run on the PC don't see the Mac's install.
**Rejected alternatives:** A one-time copy through Google Drive: every later change would have to be copied by hand.

## 2026-10-16 - No version number in plugin.json
**Decision:** Removed `"version"` from `plugin.json`, so machines that install from GitHub get every pushed commit through `claude plugin update`.
**Context:** With a fixed version, Claude Code keeps the cached copy until the string changes, so pushes would never reach the PC. The Mac reads the folder in place and is unaffected.
**Rejected alternatives:** Bumping the version on every change: easy to forget.
