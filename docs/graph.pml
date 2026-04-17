@help
=name:graph
=docs:
`protoparser analyze <pml_file> graph` outputs a Mermaid-compatible graph with built-in styling for `.pml` imports and `@tags_import` relationships.

This is useful for understanding document structure and shared tag dependencies.

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
