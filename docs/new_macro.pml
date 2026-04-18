@help
=name:new_macro
=docs:
Defines a new macro that can be used with `@@macro=...`.

`@new_macro` can be used in a standalone macro file or directly inside a normal `.pml` document.
Inline document macros are useful when a macro only belongs to that one document and should not be maintained as a separate file.

Templates can use `{{variable}}` syntax to inject values from the invocation.

⚠️ Macros rendered in HTML may include JS, which is treated as untrusted by the trust checker. Plain HTML alone is only a capability flag and does not automatically fail trust checks.

=examples:
Inline in a normal document:

@new_macro
=name:inline_warning
=template:
<div class="warn-box"><strong>{{title}}</strong><br>{{text}}</div>
@end_macro

@@macro=inline_warning:title=Alert;text=Something happened

Standalone macro file:

@new_macro
=name:warning
=docs:
Displays a warning box with a title and description.
=template:
<div class="warn-box"><strong>{{title}}</strong><br>{{text}}</div>

Use that external file in a document like this:

@macro warning "./macros/warning.pml"
@@macro=warning:title=Alert;text=Something happened
