@help
=name:protoml-listMacros
=docs:
Lists all available macro files in a given directory. The command recursively searches for `.pml` macro definitions and prints their `=name:` and the first line of `=docs:`.

Supports the `{{macro_dir}}` placeholder to reference internal macros.

The directory path should generally be wrapped in double quotes, especially when using `{{macro_dir}}`.

=examples:
protoparser --listMacros "{{macro_dir}}"
protoparser --listMacros "./macros"
