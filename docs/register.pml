@help
=name:register
=docs:
`protoparser register "<dir>" <format>` scans a directory recursively and builds a governance-oriented register for document-like `.pml` files.

Supported formats are `statistics`, `json`, `html`, and `pdf`.

This `register` command is a document portfolio report for governance-style `.pml` collections.
It is not related to macro package registries, `macro_install add_registry`, or `protoml.registry.json`.

The register is intended for document portfolios such as meetings, contracts, onboarding files, compliance material, and internal records.
It highlights:

- missing governance metadata such as `record_id`, `author`, `version`, or `status`
- expired documents via `@valid_until`
- documents due for review via `@review_date`
- documents with open tasks
- status distributions across the directory

For governance-sensitive `.pml` files, ProtoML also supports detached file signatures through:

- `protoparser sign pml "./file.pml" ...`
- `protoparser verify pml "./file.pml" ...`
- `protoparser trust "./file.pml" -trustRegistry=...`

That signature workflow is complementary to directory-level register reports.

Use it on document directories rather than broad repository roots when possible.

=examples:
protoparser register "meetings" statistics
protoparser register "contracts" html
protoparser -v register "examples/feature-suite" statistics
