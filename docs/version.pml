@help
=name:version
=docs:
`@version:...` defines the version of the current document.

It is useful for contracts, policies, RCA documents, and any ProtoML file that may be revised over time.

The value can be referenced inside `@meeting` via `@@ref=meta:version`.

=examples:
@version:1.0
