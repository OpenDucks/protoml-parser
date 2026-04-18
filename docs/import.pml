@help
=name:import
=docs:
`@import name "file" type` registers external content for later output inside the `@meeting` block.

Supported types are `html` and `pml`.

Related import-style commands:

- `@import ...` for reusable content blocks
- `@tags_import ...` for reusable task tags
- `@participants_import ...` for reusable participant lists
- `@macros_import ...` for reusable macro registrations

Commands such as `@new_macro` are not imported directly into documents.
Instead, a file that starts with `@new_macro` is referenced through `@macro ...`.

Paths should be wrapped in double quotes. This is especially recommended when paths contain spaces.

=examples:
@import snippet "snippet.html" html
@import appendix "appendix.pml" pml
