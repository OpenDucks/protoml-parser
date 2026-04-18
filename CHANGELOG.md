# CHANGELOG.md

## v1.4.2

- Clarified CHM and built-in docs so `register` is no longer confused with macro registries and `macro_install ..._registry` workflows.
- Added built-in macro trust-by-origin for shipped bundled macros: known macros from the built-in macro directory can resolve to `trusted` without detached signatures when their shipped hash matches and they do not trigger hard risk flags.
- Prevented accidental trust escalation for modified or extra files in the built-in macro directory by checking real file origin plus a built-in hash manifest instead of trusting `{{macro_dir}}` usage alone.
- Kept JavaScript and external URL risk flags authoritative, so risky built-in macros still resolve to `untrusted`.
- Updated `trust`, `verify`, `sign`, `macro_dir`, and macro registry documentation to explain the new built-in trust behavior and common trust outcomes.
- Expanded the CHM/HTML guides with more workflow-oriented trust guidance, including when to use built-ins, unsigned local macros, or signed registry-delivered macro packs.
- Fixed `sign` and `verify` subcommands so macro paths using `{{macro_dir}}` resolve correctly there as well.

## v1.4.1

- Added a full orienting CHM/HTML documentation layer with documentation index, quick start, concepts, authoring guide, macros guide, CLI reference, viewer guide, outputs guide, examples cookbook, reference map, registry guide, trust guide, and generated topic reference pages in `docs/chm/html_docs/`.
- Added cross-platform help access with `protoparser chm`, `protoparser chm browser`, `protoparser chm path`, `protoparser chm compiled`, `protoparser chm compiled_path`, and `protoparser chm download`.
- Added an integrated HTML help viewer with TOC so the generated help can be used independently of native Windows CHM support and without duplicate documentation maintenance.
- Added built-in help topics for the help viewer and trust/signature workflow, including `protoparser --docs protoml-chm`, `trust`, `sign`, and `verify`.
- Added inline `@new_macro` support directly inside normal `.pml` documents, with optional `@end_macro` support and validation for invalid inline macro definitions.
- Added `@participants_import` so reusable participant lists can be shared across documents similarly to shared tags.
- Added project-local macro registry improvements including `macro_install search`, registry-aware package discovery, and sync fallback to the latest available registry version when a pinned version no longer exists.
- Added Windows `.pml` file association support via `protoparser associate` so `.pml` files can open in the ProtoML viewer instead of unrelated tools.
- Added graph export improvements so `protoparser analyze "<file>" graph -output=...` now writes both Mermaid source (`.mmd`) and a browser-ready HTML preview.
- Fixed HTML/PDF theme handling so document themes and explicit viewer themes work again consistently in standalone output, `protoviewer`, and the browser workbench.
- Added metadata hiding support via `-hideMeta` and `@hide_meta:true` for HTML, Markdown, Text, and PDF output.
- Added a lightweight trust and signing workflow for macros and `.pml` files:
  - `protoparser trust <pml_file>`
  - `protoparser sign <macro|pml> <file> <private_key.pem> <author> [key_id]`
  - `protoparser verify <macro|pml> <file>`
  - detached `*.sig.json` sidecar signatures
  - registry-based author trust lookup via `-trustRegistry=...`
  - validation and render-time trust enforcement via `-trust=warn|strict|off`
- Extended macro registry documentation and trust documentation to cover author trust, detached signatures, remote registries, and the roles of registry admins versus registry users.
- Updated `README.md`, built-in docs, and CHM project notes to match the new documentation/help structure and trust model.
- Documented an archived HTML Help Workshop installer link for users who want to compile the CHM locally on Windows.
- Updated `SHA256SUMS.txt` generation so the file records its UTC generation timestamp.

## v1.4.0

- Added `protoparser macro_install ...` groundwork for project-local external macro packs.
- Added local macro project definition support with `protoml.macros.json`.
- Added local macro registry support with `protoml.registry.json`.
- Added macro pack manifests via `protoml-pack.json`.
- Added local pack scaffolding, registry add/update/remove utilities, and project sync.
- Added dependency resolution for packs within the same registry by default.
- Added generated `.protoml/macro-packs/macros.index.pml` plus `@macros_import` support for project-local macro imports.
- Added macro registry documentation in `docs/` and CHM help.
- Added `examples/macro-registry-suite/` as a local registry and sync example.
- Reworked CHM generation to include grouped guide pages and a broad reference generated from `docs/*.pml`.

## v1.3.1

- Added `markdown` and `text` renderers for readability-focused exports of `.pml` documents.
- Added built-in docs entries for `markdown` and `text`.
- Improved Markdown and text rendering so meeting content keeps headings, links, TOCs, and readable macro output while stripping embedded CSS and JavaScript.
- Changed the default output extensions for `markdown` to `.md` and `text` to `.txt`.
- Added built-in meta keys `@status`, `@record_id`, `@confidentiality`, `@effective_date`, `@valid_until`, and `@review_date`.
- Extended local imported `.pml` meta preservation for fixed meta keys referenced via `@@ref=meta:...`.
- Added validation warnings for duplicate meta keys and for ambiguous use of built-in meta keys through `@meta=...`.
- Fixed field inconsistencies between `@signatures` / `@approvals` parsing and Markdown/Text rendering.
- Added `protoparser register <dir> statistics|json|html|pdf` as a governance-style document register with status summary, missing metadata checks, review/expiry hints, and open-task visibility across document directories.
- Added `protoparser bundle <pml_file>` to write a bundled, import-expanded `.pml` archive file.
- Added built-in docs entries for `register` and `bundle`.
- Finished the native Windows HTML Help setup in `docs/chm/`, including generated topic pages, TOC, index, project file, and working CHM compilation via `npm run build:chm`.
- Added `protoparser analyze <pml_file> graph` for Mermaid-style import and tag-import graphs.
- Added support for saving `protoparser analyze <pml_file> graph` output directly as a `.mmd` file via `-output=...`.
- Improved the graph output styling and labels for better readability.
- Added `@author`, `@version`, and flexible `@meta=key:value` metadata support.
- Added `@@ref=...` for structured references such as metadata, participant fields, signatures, and approvals.
- Added `@@toc` for automatic table of contents generation inside the `@meeting` block.
- Added `@signatures` with `@@signature=id` and `@approvals` with `@@approval=id`.
- Added `@references` and `@attachments` blocks for linked supporting context in rendered output.
- Added `protoparser validate <pml_file>` and `protoparser tags <tags_file> validate` for basic document and shared tag validation.
- Added `protoparser macros <pml_file>` to inspect registered and used macros across imported `.pml` files.
- Added `protoparser scaffold meeting [target_dir]` and `protoparser init [target_dir]` for bootstrapping starter ProtoML files and project structures.
- Added missing built-in docs entries for newer commands and syntax such as `protocol`, `title`, `import`, `output`, `tag_sources`, `analyze`, `validate`, `macros`, `scaffold`, `init`, `macro_dir`, and `graph`.

## v1.3.0

- Added support for `@title "..."` in shared `@tags_import` files so tag statistics outputs (`statistics`, `json`, `html`, `pdf`) can use a custom report title instead of the file path.
- Added full tag statistics support for `@tag_sources` with structured outputs via:
  - `protoparser tags <tags_file> statistics`
  - `protoparser tags <tags_file> json`
  - `protoparser tags <tags_file> html`
  - `protoparser tags <tags_file> pdf`
- Added support for cross-file tag statistics using multiple shared tag files with nested `@tags_import` references.
- Updated tag statistics so local tag overrides inside referenced source `.pml` files are preserved and shown in the task entries.
- Added general `.pml` cross-reference analysis via `protoparser analyze <pml_file> <format>` with local stats, resolved stats, content imports, tag imports and recursive reference trees.
- Added output directory support via `protoparser <file> <format> <output_dir>` e.g. `protoparser test.pml html ./html`
- Added automatic output subdirectories for documents that use `@import ... html` or `@import ... pml` so rendered files are written to folders like `html/test.html` instead of cluttering the source directory.
- Added a complete example and feature test set under `examples/feature-suite/` including:
  - 2 shared tag files
  - 2 `.pml` files
  - 1 imported `.html` file
  - macro usage, imports, tags, nested tag analysis and local tag overrides
- Updated `README.md` to document the new tag analysis, output handling and example usage.

## v1.2.0

- Added full parser support for `@tags` and `@tags_import`, including external tag merging and task tag resolution
- Added `@protocol "..."` to customize the HTML document title and top page heading, with placeholder support such as `{{date}}`
- Added `@meeting "..."` as a shorthand to set a custom rendered meeting section title while still opening the `@meeting` block
- Added support for `@import` command to include external `.pml` or `.html` files into the current file. Example usage:
  - Import file: `@import reference "fileName" type` e.g. `@import header "header.pml" pml`
  - Output contents: `@@import=header` or `@@output=header`
- When using the `@import` command, the imported `.pml` content will be merged into the current file and processed as if it were part of the original file. This allows for modularization and reuse of common components across multiple files.
- Added support for `@protocol` and `@meeting` commands to allow customization.
  - Example usage:
    - `@protocol "Custom Protocol Title {{date}}"` to set a custom title for the protocol document, with support for placeholders like `{{date}}` which will be replaced with the current date.
    - `@meeting "Custom Meeting Title"` to set a custom title for the meeting section while still opening the `@meeting` block for content.
- Fixed an issue with the `@macro` loading command and the `--listMacros` command that could not properly process the `{{macro_dir}}` placeholder for loading macros from the default macro directory.

## v1.1.2

- Added `image` macro for embedding images. Supports local and remote images. Example usage:
  - `@@macro=image:src=assets/logo.png`
  - `@@macro=image:src=https://example.com/image.jpg`
- Fixed an issue with comments being incorrectly or unintentionally parsed as content. Comments are now properly ignored or filtered during parsing.

## v1.1.1

- Fixed an issue with the `--docs` command where it would not display documentation correctly.

## v1.1.0

- Added `protoviewer` (`protoml-viewer`) command to view computed `.pml` files.
- Added builtin macros, you can access them like this
- Added macro help `protoparser help {path_to_macro}`
- Added command to list all macros in path `protoparser --listMacros <path>` or with builtin macros `protoparser --listMacros {{macro_dir}}` and `protoparser --macroHelp <file_path>`
- Added enhanced help command for internal commands and more accessed via `protoparser --listDocs` and `protoparser --docs <name>`

## prior v1.0.6

There was no CHANGELOG.md file before v1.0.6.
## v1.3.2

- added `protoparser macro_install ...` groundwork for project-local external macro packs
- added local macro project definition support with `protoml.macros.json`
- added local macro registry support with `protoml.registry.json`
- added macro pack manifests via `protoml-pack.json`
- added local pack scaffolding, registry add/update/remove utilities, and project sync
- added dependency resolution for packs within the same registry by default
- added macro registry documentation in `docs/` and CHM help
- added `examples/macro-registry-suite/` as a local registry and sync example
