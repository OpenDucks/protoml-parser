@macro badge "{{macro_dir}}/badge.pml"
@macro quote "{{macro_dir}}/quote.pml"
@macro progress_bar "{{macro_dir}}/progress_bar.pml"

@tags_import "_workflow_tags.pml"

@date:18.04.2026
@author:Casey Example
@status:draft
@record_id:IMPORTED-SEC-18
@meta=import_scope:Imported Section

@participants
=pt3:Casey Example,casey,casey@example.com

@tags
=blocked:Locally blocked in imported section

@subjects
=20:Imported section status

@tasks
-[ ] Confirm API response mapping @ptp=pt3 =20 @tag=review
-[ ] Wait for vendor feedback @ptp=pt3 =20 @tag=blocked

@notes
- Imported section contains -i independent -i- tasks and metadata.

@meeting "Imported Section"
## Imported Topic
@@e=20
Imported author: @@ref=meta:author
Imported status: @@ref=meta:status
Imported owner mail: @@ref=participants:pt3:email
@@macro=badge:text=imported
@@macro=quote:text=Imported ProtoML sections keep their own meeting body.;author=Casey Example
@@macro=progress_bar:label=Imported section readiness;percent=55;color=#ff8c00
