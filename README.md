# ProtoML

ProtoML is a lightweight markup language for structured meeting documents. It is designed for meeting notes, tasks, reusable snippets, shared tags, and export to HTML, PDF, and JSON.

This repository contains:

- the parser
- the HTML and PDF renderers
- the CLI tools
- the Electron viewer
- bundled macros

## Documentation

ProtoML now has two documentation layers:

- orienting CHM guide pages in `docs/chm/html_docs/`
- topic-by-topic built-in help in `docs/*.pml` for `protoparser --docs <topic>`

Recommended reading order for new users:

1. [Documentation Index](docs/chm/toc.html)
2. [Quick Start](docs/chm/html_docs/02_quick_start.html)
3. [ProtoML Concepts](docs/chm/html_docs/06_concepts.html)
4. [Authoring Guide](docs/chm/html_docs/07_authoring_guide.html)
5. [Macros Guide](docs/chm/html_docs/04_macros_guide.html)
6. [CLI Reference](docs/chm/html_docs/03_cli_workflows.html)
7. [Own Macro Registry Guide](docs/chm/html_docs/08_macro_registry_guide.html)
8. [Macro Security And Trust Model](docs/chm/html_docs/13_macro_security_trust_model.html)
9. [Validation And Analysis Workflows](docs/chm/html_docs/14_validation_and_analysis_workflows.html)

## Installation

From source:

```bash
git clone https://github.com/ente/protoml-parser.git
cd protoml-parser
npm install -g .
```

From npm:

```bash
npm install -g protoml-parser
```

Requires Node 18.

## Release Structure

Typical ProtoML releases are structured into three deliverables:

1. Source code
   The repository itself for development, npm publishing, local builds, and contribution.

2. Windows and Linux executables
   Standalone CLI builds for users who want to run ProtoML without a local Node.js setup.

3. Native Windows CHM help
   A compiled `docs/chm/protoml-help.chm` help file for offline Windows-native documentation.

During release preparation, the distributable artifacts are collected in `dist/`.
That directory is intended to contain the Windows and Linux executables, a copied `protoml-help.chm`, and a `SHA256SUMS.txt` checksum file for the release set.
The checksum file also records the UTC generation timestamp.

## Path Recommendation

It is recommended to wrap file and directory paths in double quotes whenever they are passed to ProtoML commands or used in ProtoML import and macro declarations.

This is especially important for:

- paths that contain spaces
- paths that use `{{macro_dir}}`
- shells that may interpret braces or special characters before ProtoML sees them

Recommended examples:

```bash
protoparser "test.pml" html
protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
```

```plaintext
@macro image "{{macro_dir}}/image.pml"
@import snippet "snippet.html" html
@tags_import "_tags.pml"
```

## Quick Start

Example file:

```plaintext
@tags_import "_tags.pml"
@protocol "Project Protocol - {{date}}"

@date:24.05.2025

@participants
=pt1:John Doe,jdoe,jdoe@example.com
=pt2:Jane Doe,jane,jane@example.com

@subjects
=0:Project status
=1:Next steps

@tasks
-[ ] Prepare release notes @ptp=pt1 =1 @tag=important
-[x] Review parser output @ptp=pt2 =0 @tag=1

@notes
- HTML export works -b very well -b-

@meeting "Minutes"
# Weekly Sync
## Participants
@@e=pt1, @@e=pt2
## Topic
@@e=0
```

Render it:

```bash
protoparser "test.pml" html
```

Open it in the viewer:

```bash
protoviewer "test.pml"
```

Try the complete feature suite:

```bash
protoparser "examples/feature-suite/main_demo.pml" html
protoparser tags "examples/feature-suite/_workflow_tags.pml" statistics
```

`main_demo.pml` loads the imported `.pml`, the imported `.html`, shared tag files, and macros.
The tag statistics command can be run against either shared tag file in the feature suite because the tag files are cross-referenced via `@tags_import`.

For a guided step-by-step walkthrough, see [docs/chm/html_docs/02_quick_start.html](docs/chm/html_docs/02_quick_start.html).

## Concepts

ProtoML is built around a few core ideas:

- block-based structure with commands such as `@participants` or `@meeting`
- small inline reference syntax such as `@@e=pt1`
- reusable external content via `@import`
- reusable external templates via `@macro`
- shared task classification via `@tags` and `@tags_import`

## Syntax Overview

### Meta fields

Meta fields use `@key:value`.

Examples:

```plaintext
@date:24.05.2025
@location:Berlin
```

Special meta and directive commands:

- `@author:...` sets the document author
- `@version:...` sets the document version
- `@status:...` sets the document lifecycle status such as `draft`, `review`, or `approved`
- `@record_id:...` sets a stable record or document identifier
- `@confidentiality:...` sets a confidentiality level such as `public`, `internal`, or `confidential`
- `@effective_date:...` sets the date from which the document is intended to apply
- `@valid_until:...` sets an optional end date for validity
- `@review_date:...` sets the next review date for the document
- `@protocol "..."` sets the HTML `<title>` and top page heading
- `@meeting "..."` starts the `@meeting` block and sets the meeting section heading
- `@title "..."` is used by shared tag files for tag analysis output
- `@meta=key:value` sets additional custom metadata entries

`@protocol "..."` supports placeholders such as `{{date}}`.
All `@key:value` meta fields are stored in the same metadata object. `@meta=key:value` is mainly intended for custom keys; built-in keys should prefer their direct form for clarity.

Example:

```plaintext
@author:Jane Doe
@version:1.0
@status:review
@record_id:PROTO-2026-001
@confidentiality:internal
@effective_date:24.05.2025
@valid_until:31.12.2025
@review_date:01.09.2025
@protocol "Protocol - {{date}}"
@meta=department:Platform
@meeting "Minutes"
```

### Core blocks

Supported blocks:

- `@participants`
- `@subjects`
- `@tasks`
- `@notes`
- `@meeting`
- `@tags`
- `@tag_sources`
- `@signatures`
- `@approvals`
- `@references`
- `@attachments`

Example:

```plaintext
@participants
=pt1:John Doe,jdoe,jdoe@example.com

@subjects
=0:Project status

@tags
=important:Critical, high priority
```

### Declarations

Declarations use `=id:value`. Their meaning depends on the current block.

- in `@participants`: `=id:name,alias,email`
- in `@subjects`: `=id:text`
- in `@tags`: `=id:label`

Examples:

```plaintext
=pt1:John Doe,jdoe,jdoe@example.com
=0:Project status
=important:Critical, high priority
```

### Tasks

Tasks use `-[ ]` for open items and `-[x]` for completed items.

Supported task metadata:

- `@ptp=id` assigns the task to a participant
- `=subjectId` links the task to a subject
- `@tag=id` assigns a tag

Example:

```plaintext
@tasks
-[ ] Prepare release notes @ptp=pt1 =1 @tag=important
-[x] Review parser output @ptp=pt2 =0 @tag=1
```

### Meeting content

The `@meeting` block is freeform content with lightweight formatting and inline commands.

Supported inside `@meeting`:

- headings: `#`, `##`, `###`
- inline references: `@@e=id`
- structured references: `@@ref=group:id[:field]`
- table of contents: `@@toc`
- signatures: `@@signature=id`
- approvals: `@@approval=id`
- macros: `@@macro=name:param=value`
- content imports: `@@import=name` and `@@output=name`
- inline styling:
  - `-b text -b-`
  - `-i text -i-`
  - `-a=url label -a-`

Example:

```plaintext
@meeting "Weekly Notes"
@@toc
# Weekly Sync
## Participants
@@e=pt1, @@e=pt2
## Topic
@@e=0
Author: @@ref=meta:author
Reviewer mail: @@ref=participants:pt2:email
@@macro=badge:text=review
```

### Inline references

`@@e=id` resolves values from:

- `@subjects`
- `@participants`
- `@tags`

Examples:

```plaintext
@@e=pt1
@@e=0
@@e=important
```

Structured references with `@@ref=...` can resolve specific fields:

```plaintext
@@ref=meta:author
@@ref=participants:pt1:email
@@ref=signatures:lead:role
@@ref=approvals:security:status
```

## Imports

ProtoML supports shared participants, shared tags, macro registration imports, and content imports.

### Participant imports

`@participants_import "file.pml"` loads participants from another ProtoML file.

Example:

```plaintext
@participants_import "_participants.pml"
```

Example shared participant file:

```plaintext
@participants
=lead:John Doe,jdoe,jdoe@example.com
=review:Jane Doe
```

Rules:

- imported participants are merged into the current document
- local participants override imported participants with the same ID
- imported participants can be reused in `@tasks` via `@ptp=id`
- imported participants can be referenced with `@@ref=participants:id:field`

### Tag imports

`@tags_import "file.pml"` loads tags from another ProtoML file.

Example:

```plaintext
@tags_import "_tags.pml"
```

Example shared tag file:

```plaintext
@tags
=0:Important
=1:Normal
=2:Minor
```

Rules:

- imported tags are merged into the current document
- local tags override imported tags with the same ID
- imported tags can be used in `@tasks` via `@tag=id`

### Tag source analysis

Shared tag files can also define `@tag_sources` for cross-file statistics.

Example:

```plaintext
@title "Shared Project Tags"

@tags
=important:Critical, high priority
=1:Normal

@tag_sources
- "meetings/week1.pml"
- "meetings/week2.pml"
```

Rules:

- `@tag_sources` is intended for imported tag files such as `_tags.pml`
- `@tag_sources` is ignored during normal document rendering
- `@title "..."` is only relevant for tag analysis output
- without `@title`, the report title falls back to the tag file name

### Content imports

`@import name "file" type` registers a file for later output inside `@meeting`.

Examples:

```plaintext
@import legal "snippet.html" html
@import appendix "appendix.pml" pml
```

Use them inside `@meeting`:

```plaintext
@@import=legal
@@output=appendix
```

Supported content import types:

- `html`: inserts the file contents directly
- `pml`: parses the file and inserts its resolved `@meeting` block

For `pml` imports:

- `meta`, `participants`, `subjects`, `tags`, `macros`, and `imports` are merged into the main AST
- the imported `@meeting` content is inserted where `@@import=...` or `@@output=...` appears

### Which `@...` commands are importable?

Commands currently intended for reuse across files are:

- `@import ...` for named content reuse inside `@meeting`
- `@tags_import ...` for shared task tags
- `@participants_import ...` for shared participant lists
- `@macros_import ...` for shared macro registrations
- `@macro ...` for registering external macro files

Notes:

- `@new_macro` is not imported directly into another document
- `@new_macro` can now also be written inline in a normal `.pml` file
- instead, a `.pml` file that starts with `@new_macro` is referenced through `@macro ...`
- there is no separate `@participant` command; participants are declared inside the `@participants` block

## Macros

Macros can be defined in external ProtoML files or inline inside a normal `.pml` document via `@new_macro`.

Register a macro:

```plaintext
@macro myMacro "macros/myMacro.pml"
```

Use it inside `@meeting`:

```plaintext
@@macro=myMacro:title=Alert;text=Something happened
```

Example macro file:

```plaintext
@new_macro
=name:myMacro
=template:
<div class="warn-box"><strong>{{title}}</strong><br>{{text}}</div>
```

Builtin macros can be referenced with `{{macro_dir}}`.

Example:

```plaintext
@macro image "{{macro_dir}}/image.pml"
```

Notes:

- macros are primarily intended for HTML rendering
- macro templates may contain HTML and JavaScript
- plain HTML alone is not an automatic trust failure
- JavaScript and external URLs are treated as untrusted by the trust checker
- detached signatures are stored in `*.sig.json` sidecar files

## Signatures And Approvals

ProtoML supports reusable signature and approval entries.

Signature entries:

```plaintext
@signatures
=lead:Jane Doe,Project Lead,18.04.2026,Signed digitally
```

Approval entries:

```plaintext
@approvals
=security:Security Review,approved,Jane Doe,18.04.2026,Reviewed and accepted
```

Use them inside `@meeting`:

```plaintext
@@signature=lead
@@approval=security
```

They can also be referenced field-by-field with `@@ref=signatures:...` and `@@ref=approvals:...`.

## References And Attachments

ProtoML also supports lightweight reference and attachment sections.

References:

```plaintext
@references
- ProtoML README|https://github.com/Ente/protoml-parser
```

Attachments:

```plaintext
@attachments
- Demo graph|main-demo-graph.mmd
```

These blocks are rendered as their own sections in HTML output.

## Tags

Tags define reusable task categories. They can be declared locally with `@tags` or shared across documents with `@tags_import`.

Typical uses:

- priority labels such as `important`, `normal`, `minor`
- workflow labels such as `blocked`, `review`, `followup`
- domain labels such as `frontend`, `backend`, `ops`

In normal document rendering:

- tasks can reference tags via `@tag=id`
- the HTML renderer computes per-tag statistics and renders a `Tags` section
- tasks receive tag-based CSS classes such as `task-tag-important`

Computed statistics include:

- `total`
- `open`
- `done`

Example:

```plaintext
@tags
=important:Critical, high priority

@tasks
-[ ] Prepare release notes @tag=important
```

### Cross-file tag statistics

Shared tag files can also act as analysis entry points across multiple meeting files.

CLI command:

```bash
protoparser tags "_tags.pml" statistics
```

Available analysis formats:

- `statistics`
- `json`
- `html`
- `pdf`

Examples:

```bash
protoparser tags "_tags.pml" statistics
protoparser tags "_tags.pml" json
protoparser tags "_tags.pml" html
protoparser tags "_tags.pml" pdf
```

The tag analysis command:

- reads the tag file
- evaluates its `@tag_sources`
- parses the referenced meeting files
- groups the result by tag file, source file, and matching tasks
- resolves tag IDs against the effective tag set of the analyzed tag file, including nested `@tags_import` files
- keeps local source tag overrides visible in task entries when a source document redefines an imported tag ID

Each matching task can include:

- task text
- tag ID and label
- open or done state
- assigned participant
- subject

If the tag file defines `@title`, that title is used in text, JSON, HTML, and PDF tag reports.

## Feature Suite

The repository includes a complete demo and test set in `examples/feature-suite/`.

Included files:

- 2 shared tag files
- 2 `.pml` files
- 1 imported `.html` file

The suite exercises:

- `@author`
- `@version`
- `@meta=key:value`
- local tags
- shared tags
- nested `@tags_import`
- local tag overrides
- `@@ref`
- `@@toc`
- `@@signature`
- `@@approval`
- `@import ... html`
- `@import ... pml`
- macros
- inline references
- tag statistics

Recommended test commands:

```bash
protoparser "examples/feature-suite/main_demo.pml" html
protoparser tags "examples/feature-suite/_workflow_tags.pml" statistics
protoparser analyze "examples/feature-suite/main_demo.pml" statistics
```

Because the shared tag files reference each other through imports, the statistics command can also be run against the other tag file in the same folder.

## CLI

Basic usage:

```bash
protoparser [options] <filename> <format>
protoparser [options] <filename> <format> <output_dir>
protoparser tags <tags_file> <format>
```

Common examples:

```bash
protoparser "test.pml" html
protoparser "test.pml" html "./html"
protoparser "test.pml" json
protoparser "test.pml" markdown
protoparser "test.pml" text
protoparser -output=notes "test.pml" pdf
protoparser tags "_tags.pml" statistics
protoparser tags "_tags.pml" validate
protoparser tags "_tags.pml" html
protoparser analyze "test.pml" statistics
protoparser analyze "test.pml" graph
protoparser analyze "test.pml" html
protoparser register "examples/feature-suite" statistics
protoparser bundle "test.pml"
protoparser macro_install init
protoparser macro_install init_registry "./my-registry"
protoparser macro_install init_pack "legal-pack" "./my-registry"
protoparser macro_install add_registry "./my-registry"
protoparser macro_install install "legal-pack"
protoparser validate "test.pml"
protoparser macros "test.pml"
protoparser scaffold meeting "./demo"
protoparser init "./project"
protoparser chm
protoparser chm path
protoparser chm download
protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
protoparser --listMacrosJson "{{macro_dir}}"
protoparser --listDocs
protoparser --docs meeting
```

### Output behavior

`-output=<filename>` sets the output base name explicitly.

The third positional argument can be used as an output directory:

```bash
protoparser "test.pml" html "./html"
```

This writes `html/test.html`.

If a document uses `@import ... html` or `@import ... pml` and no explicit output path is given, the renderer automatically writes into a format subdirectory such as `html/test.html` to avoid cluttering the source directory.

### PML analysis

General cross-reference analysis for `.pml` files is available via:

```bash
protoparser analyze "<pml_file>" statistics
protoparser analyze "<pml_file>" json
protoparser analyze "<pml_file>" html
protoparser analyze "<pml_file>" pdf
protoparser analyze "<pml_file>" graph
```

The analysis includes:

- local document stats
- resolved document stats after imports and tag merging
- content imports for `.pml` and `.html`
- nested `@tags_import` references
- registered macros
- recursive reference trees across imported `.pml` files

For `graph` output, the view can be adjusted via CLI:

```bash
protoparser analyze "test.pml" graph -graphView=compact
protoparser analyze "test.pml" graph -graphView=full -graphDirection=LR
protoparser analyze "test.pml" graph -output=test-graph
```

Supported graph views:

- `compact`
- `full`
- `imports`
- `tags`

If `-output=...` is set for `graph`, the Mermaid-compatible graph output is written as a `.mmd` file instead of being printed to stdout.
The `.mmd` file is Mermaid source, so open it in Mermaid-capable software such as the Mermaid Live Editor if you want to inspect or edit it directly.
When `-output=...` is used, ProtoML also writes a companion `.html` preview next to the `.mmd` file for direct browser visualization.

### Register

Governance-style register reports across many `.pml` files are available via:

```bash
protoparser register "<dir>" statistics
protoparser register "<dir>" json
protoparser register "<dir>" html
protoparser register "<dir>" pdf
```

The register is intended for document directories such as meetings, contracts, onboarding collections, or compliance folders.
It highlights:

- missing `record_id`, `author`, `version`, or `status`
- documents past `valid_until`
- documents due for review based on `review_date`
- documents with open tasks
- status distribution across the directory

Use it on document directories rather than entire repository roots when possible.

### Bundle

Bundled archive output for a single `.pml` file is available via:

```bash
protoparser bundle "<pml_file>"
```

This writes a self-contained `.pml` file where imported ProtoML and HTML content has been expanded into a single document.
The default output name is based on the input file, for example:

```bash
protoparser bundle "test.pml"
```

This writes `test-bundle.pml`.

### External macro packs

Project-local external macro pack workflows are available via:

```bash
protoparser macro_install init
protoparser macro_install init_registry "./my-registry"
protoparser macro_install init_pack "legal-pack" "./my-registry"
protoparser macro_install add_registry "./my-registry"
protoparser macro_install install "legal-pack"
protoparser macro_install search "legal-pack"
protoparser macro_install list
protoparser macro_install info "legal-pack"
protoparser macro_install remove "legal-pack"
```

This creates and uses:

- `protoml.macros.json` as the project definition file
- `.protoml/macro-packs/` as the local install directory
- `.protoml/macro-packs/macros.index.pml` as the generated macro import index
- `protoml.registry.json` as a local registry file
- `protoml-pack.json` as a pack manifest

Dependencies declared in `protoml-pack.json` are resolved during `macro_install sync`.
If a dependency does not specify a registry explicitly, the current registry is used.
If a requested package version is no longer available in the registry, `macro_install sync` falls back to the newest available registry version and updates the project package entry to match.

Use the generated index in a document with:

```plaintext
@macros_import ".protoml/macro-packs/macros.index.pml"
```

The generated index works as a single project-local macro entry point and contains `@macro ...` declarations for all installed pack macros.

### Validation

Document validation is available via:

```bash
protoparser validate "<pml_file>"
protoparser tags "<tags_file>" validate
```

The validation commands check for:

- missing import files
- missing macro files
- unresolved references in strict mode
- duplicate IDs in common blocks
- missing tag source files
- untrusted used macros or imported `.pml` files

With `-v`, validation also reports what was detected in the file, such as meta keys, present blocks, counts, imports, tag imports, and macros.

Dedicated trust inspection is available via:

```bash
protoparser trust "test.pml"
protoparser verify "./governance/release-approval.pml"
protoparser validate "test.pml" -trust=strict -trustRegistry="./authors-registry" -trustRegistry="./macro-registry"
protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser sign pml "./governance/release-approval.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"
```

The trust model is intentionally lightweight:

- `trusted`: either a known bundled built-in macro whose hash matches the shipped built-in manifest and has no hard risk flag, or content with a valid signature by a registry author marked `trusted`
- `unknown`: not `untrusted`, but also not eligible for `trusted`; typical cases are unsigned content or valid signatures without a matching trusted registry author
- `untrusted`: invalid signature, author marked `untrusted`, JavaScript, external URLs, modified built-in macros, or imported/used untrusted content

`-trustRegistry=...` is a flag for `trust`, `verify`, and `validate`, not a standalone subcommand.
It accepts a local registry directory, a direct registry JSON path, or an HTTP/HTTPS registry URL.
It is repeatable, so multiple registry sources can be merged in one command.
If a nearest `protoml.macros.json` exists next to the target file or in one of its parent directories, those project registries are auto-discovered even without the flag.
In practice it adds author/key lookup sources; it does not override hard risk flags and does not make unsigned content trusted.

### Macro usage

Macro usage inspection is available via:

```bash
protoparser macros "<pml_file>"
```

This lists:

- macros registered by the document
- macros actually used in the meeting content
- macro usage inside recursively imported `.pml` files

### Project scaffolding

The CLI also includes small bootstrap commands:

```bash
protoparser scaffold meeting "[target_dir]"
protoparser init "[target_dir]"
```

`scaffold meeting` creates a starter meeting file and `_tags.pml`.

`init` creates a small project structure with:

- `meetings/`
- `_tags.pml`
- `meetings/main.pml`

### Windows `.pml` association

On Windows you can associate `.pml` files with ProtoML so they stop opening in Process Monitor:

```bash
protoparser associate
```

This writes a per-user file association in `HKCU\Software\Classes` and opens `.pml` files with the ProtoML viewer workbench.

### CLI options

| Flag | Description |
| ---- | ----------- |
| `-v`, `-vv`, `-vvv` | Set verbosity level |
| `-output=<filename>` | Set output base name without extension |
| `-theme=<name>` | Set HTML or PDF theme |
| `-hideMeta` | Hide metadata sections in rendered HTML, Markdown, Text, and PDF output |
| `-strict` | Fail on unresolved references or missing imports |
| `--help` | Show CLI help |
| `--version` | Show version and build number |
| `--listMacros <dir>` | List macros in a directory |
| `--macroHelp <file>` | Show docs for a macro file |
| `--listMacrosJson <dir>` | Output macro metadata as JSON |
| `--listDocs` | List bundled documentation topics |
| `--docs <name>` | Show a documentation topic from `docs/` |

### CHM help

ProtoML help is available independently of Windows CHM support via the generated HTML help viewer:

```bash
protoparser chm
```

Useful variants:

```bash
protoparser chm browser
protoparser chm path
protoparser chm compiled
protoparser chm compiled_path
protoparser chm download
```

Behavior:

- `protoparser chm` opens the integrated Electron help viewer with TOC and generated HTML docs
- `protoparser chm browser` opens the same help viewer in the system browser
- `protoparser chm path` prints the generated HTML help viewer path
- `protoparser chm compiled` opens the native `.chm` file on Windows if available
- `protoparser chm compiled_path` prints the resolved compiled CHM path
- `protoparser chm download` downloads the compiled CHM asset without opening it

Verbosity levels for text-based CLI commands such as `validate`, `tags ... statistics`, `analyze ... statistics`, `register ... statistics`, and `macros`:

- `-v` adds a compact structural overview
- `-vv` adds detailed lists such as macros, imported files, and nested sections
- `-vvv` adds the most verbose diagnostic detail available for that command

### Macro path placeholder

The CLI and macro loader support `{{macro_dir}}` for the built-in macro directory.

Examples:

```bash
protoparser --listMacros "{{macro_dir}}"
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
```

```plaintext
@macro image "{{macro_dir}}/image.pml"
```

## Output Formats

Supported render formats:

- `json`
- `html`
- `pdf`
- `markdown`
- `text`

Notes:

- if no format is passed, the CLI currently defaults to `json`
- if no explicit output name is passed, the input filename without extension is used
- the `json` renderer outputs the current AST
- the `markdown` and `text` renderers create readability-focused exports and strip embedded CSS and JavaScript from macro-heavy meeting content
- `markdown` is written as `.md`
- `text` is written as `.txt`
- HTML and PDF themes can be selected with `-theme=<name>` or via document meta such as `@theme:dark`
- rendered metadata can be hidden with `-hideMeta` or document meta such as `@hide_meta:true`

Common AST fields:

- `meta`
- `participants`
- `subjects`
- `tags`
- `tasks`
- `notes`
- `meeting`
- `tag_stats`

## Viewer and Web Parser

### protoviewer

`protoviewer` opens a rendered ProtoML document in the bundled Electron viewer.

```bash
protoviewer test.pml
protoviewer test.pml dark
```

### Independent viewer

The browser-based viewer can be opened via:

```bash
protoparser viewer
protoparser viewer browser "./test.pml"
protoparser viewer app "./test.pml"
protowebviewer "./test.pml"
```

Use `protoparser viewer` when you want the browser and app workbench for authoring, rendering, and lightweight checks, while CHM remains the bundled Help/Docs experience on Windows.

### Web parser

The independent browser viewer lives in `web/`.

Open:

```plaintext
web/index.html
```

Build the browser bundle:

```bash
npm run build:web
```

Start a local development server:

```bash
npm run dev
```

The browser viewer supports:

- editing ProtoML directly in the browser
- loading local `.pml` files
- drag and drop
- in-browser preview
- exporting the rendered HTML

## Development

```bash
git clone https://github.com/ente/protoml-parser.git
cd protoml-parser
npm install
```

Useful commands:

```bash
npm run build:web
npm run build:chm:project
npm run build:chm
npm run dev
npm run build:exe
```

### Native Windows Help

The repository includes a native Windows HTML Help project in `docs/chm/`.

If you just want to use the help locally on Windows, run:

```bash
protoparser chm
```

If you want to compile the CHM on your own machine, you need Microsoft HTML Help Workshop installed first.
An archived installer is still available here:

```text
https://web.archive.org/web/20160201063255/http://download.microsoft.com/download/0/A/9/0A939EF6-E31C-430F-A3DF-DFAE7960D564/htmlhelp.exe
```

Use:

```bash
npm run build:chm:project
```

to regenerate the CHM project files and topic HTML pages, and:

```bash
npm run build:chm
```

to compile `docs/chm/protoml-help.chm` with Microsoft HTML Help Workshop on Windows.

To use the local version globally:

```bash
npm uninstall -g protoml-parser
npm install -g .
```

## Scope

ProtoML is not:

- a programming language
- a general-purpose template engine
- full Markdown
- a runtime with loops or arbitrary execution

ProtoML is:

- a readable format for structured meeting documents
- a lightweight task and note format with references
- a modular document format with imports and macros
- a good fit for HTML views, viewers, and structured export pipelines
