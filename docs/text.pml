@help
=name:text
=docs:
The `text` renderer exports a `.pml` document as a plain text report.

It is useful for terminal inspection, quick sharing, logging, and environments where HTML or PDF output is unnecessary.
Structured sections such as metadata, participants, subjects, tags, tasks, notes, references, attachments, and the resolved `@meeting` content are rendered into plain text.

HTML-heavy macro output is reduced into readable text where possible. JavaScript and CSS blocks are stripped from the text export.
The output file extension is `.txt`.

=examples:
protoparser "Meeting.pml" text
protoparser "Meeting.pml" text "./text"
