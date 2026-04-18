@help
=name:protoml-help
=docs:
Displays detailed documentation for a specific help module located in the `/docs` directory.

The module should be a `.pml` file starting with `@help`, and contain fields such as `=name:`, `=docs:` and optionally `=examples:`.

For the broader guided documentation path, use the generated CHM contents page in `docs/chm/toc.html` or `protoparser chm` on Windows.

=examples:
protoparser --docs meeting
protoparser --docs protoml-parser
protoparser --docs protoml-chm
