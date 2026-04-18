@help
=name:participants_import
=docs:
The `@participants_import` command includes an external `.pml` participant definition file into the current ProtoML document.

Participants imported this way can be reused in task assignments via `@ptp=id` and in references such as `@@ref=participants:id:name`.

The external file should start with `@participants` and contain `=id:Name[,alias,email]` entries.

Typical workflow:

- create a shared `participants.pml` file with an `@participants` block
- import that file into the meeting document with `@participants_import "..."`
- reuse the imported IDs in tasks, `@@e=...`, and `@@ref=participants:...`

The import path should be wrapped in double quotes.

=examples:
Shared file `participants.pml`:

@participants
=lead:Jane Doe,jdoe,jdoe@example.com
=ops:Max Mustermann,mmustermann,max@example.com

Main meeting file:

@participants_import "participants.pml"
@protocol "Weekly Sync - {{date}}"

@tasks
-[ ] Prepare release notes @ptp=lead
-[ ] Check deployment logs @ptp=ops

@meeting "Minutes"
# Weekly Sync
Responsible: @@e=lead
Lead mail: @@ref=participants:lead:email
