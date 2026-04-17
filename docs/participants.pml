@help
=name:participants
=docs:
Defines a list of participants for the document.

Each participant uses an ID via `=ptX:Name[,alias,email]`, and can be referenced later using `@ptp=ptX` or `@@e=ptX`.

=examples:
@participants
=pt1:John Doe,jdoe,jdoe@example.com
=pt2:Jane Doe
