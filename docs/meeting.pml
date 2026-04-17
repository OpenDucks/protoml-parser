@help
=name:meeting
=docs:
The `@meeting` block is used to structure and document meetings within a ProtoML file.

It is useful for meeting protocols, agendas, discussion points, and decisions, especially when combined with `@participants`, `@subjects`, `@tasks`, and `@notes`.

You can use `@@e=...` to insert previously defined entries such as subjects, participants, or tags, and `@@macro=...` to embed macros directly into the meeting content.

The layout typically follows lightweight Markdown-style syntax such as `#`, `##`, and plain text lines.

`@meeting` can also be written as `@meeting "Custom Title"` to set the rendered meeting section title.

=examples:
@meeting "Minutes"
# Meeting Title: @@e=0
## Participants
@@e=pt1 , @@e=pt2
## Topics
@@macro=myMacro:title=IMPORTANT;text=@@e=1
