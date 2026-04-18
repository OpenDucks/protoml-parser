@help
=name:macro_dir
=docs:
`{{macro_dir}}` is a placeholder for the built-in macros directory.

It can be used in CLI commands and in `@macro` declarations.

It should generally be wrapped in double quotes when used as part of a path. This helps avoid broken paths and shell-side interpretation before ProtoML resolves the placeholder.

Trust clarification:

- using `{{macro_dir}}` does not by itself make a macro trusted
- ProtoML resolves the placeholder to the real built-in macro directory and then checks whether the referenced file matches the shipped built-in hash manifest
- only known bundled built-in macros can become `trusted` without detached signatures, and only when they do not trigger hard risk flags such as JavaScript or external URLs
- extra or modified files inside that directory are not automatically trusted

Typical outcomes:

- `trusted`: bundled built-in macro, hash matches, no hard risk flag
- `untrusted`: bundled built-in macro with JavaScript or external URLs, or a modified built-in macro
- `unknown`: normal local macro outside the built-in trust flow and without signature-based trust

=examples:
@macro image "{{macro_dir}}/image.pml"
protoparser --listMacros "{{macro_dir}}"
