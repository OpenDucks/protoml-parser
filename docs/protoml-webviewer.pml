@help
=name:protoml-webviewer
=docs:
`protoparser viewer` opens the independent browser-based ProtoML viewer.

It can open the viewer in the default browser or as a standalone Electron window.
The standalone window is also available directly as `protowebviewer` or `protoml-webviewer`.

It is an authoring and rendering workbench for editing, previewing, and checking `.pml` files.
It is not the counterpart to CHM help itself, because the Windows CHM is the bundled Help/Docs experience.

When a `.pml` file path is passed, the browser viewer loads that file content into the editor on startup.

=examples:
protoparser viewer
protoparser viewer browser "./meeting.pml"
protoparser viewer app "./meeting.pml"
protowebviewer "./meeting.pml"
