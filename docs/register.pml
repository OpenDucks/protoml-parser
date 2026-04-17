@help
=name:register
=docs:
`protoparser register "<dir>" <format>` scans a directory recursively and builds a governance-oriented register for document-like `.pml` files.

Supported formats are `statistics`, `json`, `html`, and `pdf`.

The register is intended for document portfolios such as meetings, contracts, onboarding files, compliance material, and internal records.
It highlights:

- missing governance metadata such as `record_id`, `author`, `version`, or `status`
- expired documents via `@valid_until`
- documents due for review via `@review_date`
- documents with open tasks
- status distributions across the directory

Use it on document directories rather than broad repository roots when possible.

=examples:
protoparser register "meetings" statistics
protoparser register "contracts" html
protoparser -v register "examples/feature-suite" statistics
