@help
=name:bundle
=docs:
`protoparser bundle "<file.pml>"` writes a bundled `.pml` file where imported ProtoML and HTML content has been expanded into a single document.

This is useful for archival, handoff, review, and storing a self-contained ProtoML snapshot without external content imports.

The bundled output keeps the ProtoML structure:

- merged metadata
- merged `@participants`, `@subjects`, `@tags`, `@signatures`, and `@approvals`
- merged `@references` and `@attachments`
- the `@meeting` block with `@@import` and `@@output` expanded

The default output name is based on the input file, for example `test-bundle.pml`.

=examples:
protoparser bundle "test.pml"
protoparser bundle "meeting.pml" -output=meeting-archive
