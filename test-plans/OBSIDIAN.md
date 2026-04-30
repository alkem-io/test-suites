# Authoring test plans in Obsidian

The `test-plans/content/` directory IS a valid [Obsidian](https://obsidian.md/) vault. You can author feature libraries and release plans in Obsidian's rich editor while the CLI, dashboard, and publish workflow keep working exactly as before — same markdown files on disk, same git flow.

## One-time setup

1. **Install Obsidian** (free for personal use). Download at <https://obsidian.md/download>.
2. **Open the vault**: *Open folder as vault* → pick `<repo>/test-plans/content/`.
3. **Configure settings to match the parser's expectations** (Obsidian defaults are fine for most; two worth setting explicitly):

   | Setting | Recommended value | Why |
   |---|---|---|
   | *Files and links* → **Use [[Wikilinks]]** | **OFF** | Our parser ignores wikilinks; standard markdown links (`[text](url)`) render on the dashboard too. |
   | *Files and links* → **New link format** | **Relative path** | Keeps committed links stable regardless of where the vault is mounted. |
   | *Editor* → **Strict line breaks** | **OFF** (default) | Markdown rendering on GitHub and the dashboard expects soft line breaks. |
   | *Editor* → **Auto pair brackets / markdown** | Taste | No parser impact either way. |

4. **Enable the core "Properties" plugin**: it gives you a sidebar to edit the YAML front-matter of each feature library (feature / slug). It does NOT touch the fenced per-case ```yaml blocks — those stay in the body.

## Suggested community plugins (optional)

These make authoring much faster but are not required for the CLI to work:

- **Dataview** — query cases across all feature libraries:
  ```dataview
  TABLE priority, state, automation
  FROM "features"
  WHERE contains(file.name, "communications")
  ```
- **Templater** — one-click templates for a new case or release plan (template files can live outside the vault in `test-plans/content/_templates/` — prefix with underscore so the parser's glob skips them).
- **Linter** — enforces consistent markdown formatting on save. Safe to enable; our parsers accept `-` / `*` / `+` bullets and the standard YAML style.
- **Advanced Tables** — easier editing of the outcome tables in release plans.

## Authoring workflow

### Adding a case to a feature library

1. Open the relevant `features/<domain>.md` file.
2. Scroll to the end; add a new `## TC-XXXX — <title>` heading with the next unused ID.
3. Below the heading, open a new fenced ```yaml block with the metadata (`priority`, `type`, `state`, `automation`, optional `owner`, optional `links`).
4. Add the `### Steps` and `### Expected` subsections with the narrative.
5. *(Optional)* Use Obsidian's *Outline* sidebar to confirm the heading structure.

### Running validate/scan/build from the IDE

Obsidian doesn't run commands. Switch to a terminal:

```bash
pnpm run test-plans:validate
pnpm run test-plans:scan
pnpm run test-plans:build
```

Preview `test-plans/dist/` in a browser. Git commit on your normal cadence.

### Recording a manual outcome for a release

1. Open `releases/R<N>.md` in Obsidian.
2. Scroll to the `## Outcomes` section.
3. Add a new `### TC-XXXX — <passed|failed|blocked>` heading.
4. Add the required bullets: `- executed: YYYY-MM-DD` and `- by: <you>`.

## What Obsidian won't touch

- The **fenced ```yaml blocks** inside case sections — Obsidian treats them as code blocks and leaves them alone.
- The **`## TC-XXXX — ...` heading structure** — Obsidian renders them as section headings but doesn't re-format them.
- The **narrative markdown** inside `### Steps` / `### Expected` — plain markdown, no transformation.

## What Obsidian *may* change (and why the parser tolerates it)

- **Bullet markers**: may normalize `-` to `*` (or vice-versa) depending on Linter plugin settings. Our parsers accept `-`, `*`, and `+`.
- **Top-level front-matter key order**: Obsidian's Properties view may re-order YAML keys. Our parsers key by name, not position.
- **Trailing newlines**: Obsidian may add/trim the final newline. Our parsers are whitespace-tolerant.

## Per-user `.obsidian/` directory

When you open the vault, Obsidian creates `test-plans/content/.obsidian/` with your personal settings, hotkeys, workspace layout, and plugin data. This directory is **gitignored** at the repo root — it's per-user and should never be committed.

If you want to share a team Obsidian config (e.g. a common plugin set), do so via a separate template repo and document the import steps here; don't commit the live `.obsidian/` from a contributor's machine.
