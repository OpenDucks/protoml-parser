@help
=name:validate
=docs:
`protoparser validate <pml_file>` validates a ProtoML document without rendering it.

The command checks for missing files, unresolved references in strict mode, duplicate IDs in common blocks, and invalid imports or macro files.
With `-v`, it also prints a compact overview of detected metadata, blocks, imports, tag imports, and registered macros.
`-vv` adds deeper detail lists, and `-vvv` shows the most verbose diagnostic output for the command.

It is recommended to wrap the file path in double quotes.

=examples:
protoparser validate "Meeting.pml"
protoparser -v validate "Meeting.pml"
protoparser tags "_tags.pml" validate
