@help
=name:markdown
=docs:
The `markdown` renderer exports a `.pml` document as a readable Markdown-oriented text file.

It is intended for lightweight sharing, diffs, version review, and plain documentation workflows.
Structured sections such as metadata, participants, subjects, tags, tasks, notes, references, attachments, and the resolved `@meeting` content are rendered into Markdown.

HTML-heavy macro output is reduced into readable text where possible. JavaScript and CSS blocks are stripped from the Markdown export.
The output file extension is `.md`.

=examples:
protoparser "Meeting.pml" markdown
protoparser "Meeting.pml" markdown "./markdown"
