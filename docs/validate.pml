@help
=name:validate
=docs:
`protoparser validate <pml_file>` validates a ProtoML document without rendering it.

The command checks for missing files, unresolved references in strict mode, duplicate IDs in common blocks, invalid imports or macro files, and trust issues for used macros or imported ProtoML files.
With `-v`, it also prints a compact overview of detected metadata, blocks, imports, tag imports, and registered macros.
`-vv` adds deeper detail lists, and `-vvv` shows the most verbose diagnostic output for the command.

Trust behavior:

- `-trust=warn` keeps rendering-style behavior and reports untrusted macros as warnings
- `-trust=strict` upgrades trust violations to errors
- `-trustRegistry=...` adds local or remote author trust sources

Unsigned but otherwise harmless macros are treated as `unknown`, not as immediate failures.

It is recommended to wrap the file path in double quotes.

=examples:
protoparser validate "Meeting.pml"
protoparser -v validate "Meeting.pml"
protoparser validate "Meeting.pml" -trust=strict -trustRegistry="./my-registry"
protoparser tags "_tags.pml" validate
