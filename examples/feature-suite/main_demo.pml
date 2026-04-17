@macro badge "{{macro_dir}}/badge.pml"
@macro warn_box "{{macro_dir}}/warn_box.pml"
@macro quote "{{macro_dir}}/quote.pml"
@macro meeting_summary "{{macro_dir}}/summary/meeting_summary.pml"
@macro timeline_start "{{macro_dir}}/timeline/timeline_start.pml"
@macro timeline_entry "{{macro_dir}}/timeline/timeline_entry.pml"
@macro timeline_end "{{macro_dir}}/timeline/timeline_end.pml"
@macro image "{{macro_dir}}/image.pml"

@import imported "imported_section.pml" pml
@import snippet "snippet.html" html

@tags_import "_workflow_tags.pml"

@protocol "Feature Suite - {{date}}"
@date:18.04.2026
@location:Berlin Lab

@participants
=pt1:Alex Demo,alex,alex@example.com
=pt2:Sam Parser,sam,sam@example.com

@tags
=important:Locally overridden important tag
=custom:Custom local tag

@subjects
=0:Feature suite walkthrough
=1:Import handling
=2:Shared tag analysis

@tasks
-[ ] Review import chain @ptp=pt1 =1 @tag=important
-[x] Verify shared tags @ptp=pt2 =2 @tag=review
-[ ] Capture open questions @ptp=pt1 =0 @tag=followup
-[ ] Document demo scenario @ptp=pt2 =0 @tag=custom

@notes
- Main demo uses -b imports -b-, shared tags and macros together.
- The local `important` tag overrides the imported label inside this document.

@meeting "Feature Walkthrough"
# Main Demo
## Participants
@@e=pt1, @@e=pt2
## Topic
@@e=0
@@macro=badge:text=demo
@@macro=warn_box:title=Watch imports carefully
@@macro=quote:text=This file is meant to exercise multiple ProtoML features at once.;author=ProtoML demo

## Imported HTML
@@import=snippet

## Imported ProtoML
@@output=imported

## Timeline
@@macro=timeline_start:x=x
@@macro=timeline_entry:time=09:00;event=Kickoff;person=@@e=pt1
@@macro=timeline_entry:time=09:30;event=Import review;person=@@e=pt2
@@macro=timeline_end:x=x

## Summary
@@macro=meeting_summary:rating=5;notes=Feature suite completed successfully with imports, tags and macros.
@@macro=image:src=https://placehold.co/480x240
