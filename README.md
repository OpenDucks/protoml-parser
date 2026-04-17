# ProtoML

ProtoML is a lightweight markup language for structured meeting documents. It is designed for meeting notes, tasks, reusable snippets, shared tags, and export to HTML, PDF, and JSON.

This repository contains:

- the parser
- the HTML and PDF renderers
- the CLI tools
- the Electron viewer
- bundled macros

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

ProtoML supports shared tags and content imports.

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

## Macros

Macros are external ProtoML files with a `=name:` and `=template:` section.

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
- JavaScript is not sanitized, so untrusted macro files should not be used

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
protoparser validate "test.pml"
protoparser macros "test.pml"
protoparser scaffold meeting "./demo"
protoparser init "./project"
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

With `-v`, validation also reports what was detected in the file, such as meta keys, present blocks, counts, imports, tag imports, and macros.

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

### CLI options

| Flag | Description |
| ---- | ----------- |
| `-v`, `-vv`, `-vvv` | Set verbosity level |
| `-output=<filename>` | Set output base name without extension |
| `-theme=<name>` | Set HTML or PDF theme |
| `-strict` | Fail on unresolved references or missing imports |
| `--help` | Show CLI help |
| `--version` | Show version and build number |
| `--listMacros <dir>` | List macros in a directory |
| `--macroHelp <file>` | Show docs for a macro file |
| `--listMacrosJson <dir>` | Output macro metadata as JSON |
| `--listDocs` | List bundled documentation topics |
| `--docs <name>` | Show a documentation topic from `docs/` |

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

### Web parser

The browser demo lives in `web/`.

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
