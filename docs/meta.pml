@help
=name:meta
=docs:
`@meta=key:value` defines additional metadata entries beyond the built-in meta keys such as `@date`, `@author`, `@version`, `@status`, `@record_id`, or `@review_date`.

These values are stored in the same document metadata object and can be referenced via `@@ref=meta:key`.
For built-in keys, the direct form such as `@author:...` or `@status:...` is recommended for clarity.

=examples:
@meta=department:Platform Engineering
@meta=doc_type:RCA
