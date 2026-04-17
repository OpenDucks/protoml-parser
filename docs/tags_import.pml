@help
=name:tags_import
=docs:
The `@tags_import` command includes an external `.pml` tag definition file (e.g., `tags.pml`) into the current ProtoML document.

Tags imported this way can be referenced in the `@tasks` section via `@tag=id`.

The external file should start with `@tags` and contain `=id:Description` pairs.

The import path should be wrapped in double quotes.

=examples:
@tags_import "tags.pml"
