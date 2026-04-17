@help
=name:ref
=docs:
`@@ref=...` resolves structured references inside the `@meeting` block.

Unlike `@@e=...`, it can resolve specific fields from structured entries.

Supported reference forms include:

- `@@ref=meta:author`
- `@@ref=meta:version`
- `@@ref=participants:pt1:name`
- `@@ref=participants:pt1:email`
- `@@ref=subjects:0`
- `@@ref=tags:important`
- `@@ref=signatures:lead:role`
- `@@ref=approvals:security:status`

=examples:
Author: @@ref=meta:author
Reviewer mail: @@ref=participants:pt2:email
Approval status: @@ref=approvals:security:status
