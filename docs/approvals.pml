@help
=name:approvals
=docs:
`@approvals` defines reusable approval entries for contracts, reviews, onboarding flows, and RCA documents.

Each approval entry uses:

`=id:label,status,by,date,notes`

The entries can be referenced with `@@approval=id` or via `@@ref=approvals:id:field`.

=examples:
@approvals
=security:Security Review,approved,Jane Doe,18.04.2026,Reviewed and accepted
