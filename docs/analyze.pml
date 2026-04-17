@help
=name:analyze
=docs:
`protoparser analyze <pml_file> <format>` performs general cross-reference analysis for `.pml` files.

It can report local stats, resolved stats, imported `.pml` and `.html` files, tag imports, macros, and recursive reference trees.

Supported formats are `statistics`, `json`, `html`, `pdf`, and `graph`.

It is recommended to wrap the file path in double quotes.

=examples:
protoparser analyze "Meeting.pml" statistics
protoparser analyze "Meeting.pml" graph
