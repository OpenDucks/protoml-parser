@help
=name:macros_import
=docs:
`@macros_import "file.pml"` loads a generated or hand-written ProtoML file that contains `@macro ...` declarations.

This is mainly intended for project-local external macro pack workflows.
After `protoparser macro_install sync`, a generated import file is written to:

`.protoml/macro-packs/macros.index.pml`

Use it in a document like this:

`@macros_import ".protoml/macro-packs/macros.index.pml"`

The imported file is read before normal macro loading.
Its macro declarations are merged into the current document.
Local `@macro ...` declarations in the document still win over imported ones with the same name.

=examples:
@macros_import ".protoml/macro-packs/macros.index.pml"

@meeting "Macro Demo"
@@macro=contract-kit_sample:title=Demo;text=Loaded through the generated macro index
