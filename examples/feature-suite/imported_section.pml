@macro badge "{{macro_dir}}/badge.pml"
@macro quote "{{macro_dir}}/quote.pml"
@macro progress_bar "{{macro_dir}}/progress_bar.pml"

@tags_import "_priority_tags.pml"

@date:18.04.2026

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
@@macro=badge:text=imported
@@macro=quote:text=Imported ProtoML sections keep their own meeting body.;author=Casey Example
@@macro=progress_bar:label=Imported section readiness;percent=55;color=#ff8c00
