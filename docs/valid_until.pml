@help
=name:valid_until
=docs:
`@valid_until:...` defines an optional end date for the validity of the current document.

It is useful for contracts, temporary approvals, policies, and review-bound documentation.
The value can be referenced via `@@ref=meta:valid_until`.

=examples:
@valid_until:31.12.2026
