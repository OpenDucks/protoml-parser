# CHANGELOG.md

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
