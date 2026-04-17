@help
=name:macro_dir
=docs:
`{{macro_dir}}` is a placeholder for the built-in macros directory.

It can be used in CLI commands and in `@macro` declarations.

It should generally be wrapped in double quotes when used as part of a path. This helps avoid broken paths and shell-side interpretation before ProtoML resolves the placeholder.

=examples:
@macro image "{{macro_dir}}/image.pml"
protoparser --listMacros "{{macro_dir}}"
