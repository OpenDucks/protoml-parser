@help
=name:protoml-listMacrosJson
=docs:
Outputs all macros in a specified directory as a structured JSON list.

Each entry includes the macro's name, documentation, path, and template (if available).

Useful for frontends, dashboards, or live editors.

The directory path should generally be wrapped in double quotes, especially when using `{{macro_dir}}`.

=examples:
protoparser --listMacrosJson "{{macro_dir}}"
