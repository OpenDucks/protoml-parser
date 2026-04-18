@help
=name:graph
=docs:
`protoparser analyze <pml_file> graph` outputs a Mermaid-compatible graph with built-in styling for `.pml` imports and `@tags_import` relationships.

This is useful for understanding document structure and shared tag dependencies.
The generated `.mmd` file is Mermaid source, so it should be opened in Mermaid-capable software such as the Mermaid Live Editor if you want to inspect or edit it directly.
When `-output=...` is used, ProtoML now also writes a companion HTML preview next to the `.mmd` file for direct browser visualization.

The graph can be adjusted with:

- `-graphView=compact`
- `-graphView=full`
- `-graphView=imports`
- `-graphView=tags`
- `-graphDirection=TD|LR|RL|BT`

It is recommended to wrap the file path and output path in double quotes.

=examples:
protoparser analyze "Meeting.pml" graph
protoparser analyze "Meeting.pml" graph -graphView=full -graphDirection=LR
protoparser analyze "Meeting.pml" graph -output="meeting-graph"
