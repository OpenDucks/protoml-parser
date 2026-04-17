@help
=name:protoml-macroHelp
=docs:
Displays detailed help information about a specific macro definition.

This includes the macro's name, documentation text (`=docs:`) and optionally its `=template:` if included.

The macro file path should generally be wrapped in double quotes, especially when using `{{macro_dir}}`.

=examples:
protoparser --macroHelp "{{macro_dir}}/finance/f_entry.pml"
