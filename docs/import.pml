@help
=name:import
=docs:
`@import name "file" type` registers external content for later output inside the `@meeting` block.

Supported types are `html` and `pml`.

Paths should be wrapped in double quotes. This is especially recommended when paths contain spaces.

=examples:
@import snippet "snippet.html" html
@import appendix "appendix.pml" pml
