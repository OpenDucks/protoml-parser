# Feature Suite

This folder contains a compact ProtoML demo set that exercises the main parser features in one place.

Included files:

- `_priority_tags.pml`
- `_workflow_tags.pml`
- `main_demo.pml`
- `imported_section.pml`
- `snippet.html`

Suggested commands:

```bash
protoparser examples/feature-suite/main_demo.pml html
protoparser tags examples/feature-suite/_workflow_tags.pml statistics
protoparser analyze examples/feature-suite/main_demo.pml statistics
```

These two commands are enough to test the complete setup:

- `main_demo.pml` loads the imported `.pml`, the imported `.html`, shared tags, and macros
- the statistics command can also be run against `_priority_tags.pml` because the shared tag files are connected via `@tags_import`
- the analyze command shows the general cross-reference tree and local vs resolved stats for the main `.pml`

What this set covers:

- `@protocol`
- `@meeting`
- `@participants`
- `@subjects`
- `@tasks`
- `@notes`
- `@tags`
- `@tags_import`
- `@tag_sources`
- `@title` in tag files
- local tag overrides
- nested shared tag files
- `@import ... html`
- `@import ... pml`
- `@@import` and `@@output`
- macro registration and usage
- inline references with `@@e=...`
- inline formatting
