@help
=name:signatures
=docs:
`@signatures` defines reusable signature entries for contracts, approvals, protocols, and onboarding documents.

Each signature entry uses:

`=id:name,role,date,note`

The entries can be referenced with `@@signature=id` or via `@@ref=signatures:id:field`.

=examples:
@signatures
=lead:Jane Doe,Project Lead,18.04.2026,Signed digitally
