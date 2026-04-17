@help
=name:protoml-parser
=docs:
`protoml-parser` (alias `protoparser`) is the main CLI tool used to parse `.pml` (ProtoML) files and convert them into structured output formats such as HTML, JSON, PDF, Markdown, or plain text.

It supports external macro loading, tag files, participant assignments, dynamic echoing with `@@e=`, macro usage within the `@meeting` block, governance-style register reports, and bundled archive output.

It is the recommended way to build machine-parseable exports of structured notes, tasks, and protocols.

It is recommended to wrap file and directory paths in double quotes, especially when using `{{macro_dir}}`.

=examples:
protoparser "Meeting.pml" html
protoparser "Meeting.pml" markdown
protoparser "Meeting.pml" text
protoparser register "meetings" statistics
protoparser bundle "Meeting.pml"
protoparser -vv -output=summary "Meeting.pml" json
