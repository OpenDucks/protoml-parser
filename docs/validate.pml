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
- `-trustRegistry=...` adds extra author trust lookup sources for validation
- `-trustRegistry=...` is repeatable, so you can combine multiple author or mixed registries
- package-only registries are allowed during validation; they simply contribute no author trust entries if `authors` is missing
- author-only registries are allowed during validation even when they publish no macro packages
- in `validate`, local registry directories and registry JSON files are used directly
- remote registry URLs are not fetched during synchronous validation and are reported only by the dedicated trust/verify workflow
- if the target file sits inside a project with `protoml.macros.json`, validation auto-discovers the nearest configured project registries even without `-trustRegistry=...`

Practical registry split:

- if macro packages come from one registry and trusted authors from another, pass both with separate `-trustRegistry=...` flags when they are not already listed in the nearest project config
- project registries stored in the nearest `protoml.macros.json` are included automatically by the trust analyzer unless that behavior is explicitly disabled in code
- validation merges all configured trust sources for author lookup and then checks used macros plus imported `.pml` files against that combined view

Unsigned but otherwise harmless macros are treated as `unknown`, not as immediate failures.

It is recommended to wrap the file path in double quotes.

=examples:
protoparser validate "Meeting.pml"
protoparser -v validate "Meeting.pml"
protoparser validate "./project/Meeting.pml" -trust=strict
protoparser validate "Meeting.pml" -trust=strict -trustRegistry="./my-registry"
protoparser validate "Meeting.pml" -trust=strict -trustRegistry="./authors-registry" -trustRegistry="./macro-registry"
protoparser tags "_tags.pml" validate
