@help
=name:protoml-chm
=docs:
`protoparser chm` opens the ProtoML help viewer with the generated Help/Docs content.

The default app mode opens a native Electron help window with the generated HTML reference pages and integrated contents tree.
This works independently of Windows CHM support and avoids separate documentation maintenance.

`protoparser chm browser` opens the same help content in the system browser.
`protoparser chm path` prints the generated HTML help viewer path.

For Windows-native compiled help there is still a separate compiled CHM flow:

- `protoparser chm compiled`
- `protoparser chm compiled_path`
- `protoparser chm download`

=examples:
protoparser chm
protoparser chm browser
protoparser chm path
protoparser chm compiled
protoparser chm compiled_path
protoparser chm download
