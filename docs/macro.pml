@help
=name:macro
=docs:
The `@macro` command imports a named macro file from a specified path, making it available for inline use with `@@macro=name:param=value`.

This is the external-file counterpart to inline `@new_macro` definitions inside a normal `.pml` document.

A macro file must begin with `@new_macro`, include a `=name:` declaration, and define a `=template:` block. Templates can contain `{{variable}}` placeholders that are replaced when the macro is called.

Macros are especially useful for reusable rendered components such as warnings, callouts, badges, cards, layout helpers, and injected logic such as buttons or dynamic fields.

If you only want to change the overall document look, prefer a renderer theme instead of a macro.

Templates can include JavaScript and HTML, which are only rendered in the `html` export. JavaScript is not stripped or sanitized.

Paths should be wrapped in double quotes. This is strongly recommended when using `{{macro_dir}}`, because some shells may otherwise interpret characters before ProtoML receives the path.

⚠️ **Security Notice**: JavaScript and external URLs in macros downgrade trust immediately. Plain HTML alone is not a trust failure, but still means the macro is HTML-capable and should be reviewed.

=examples:
@macro warningBox "macros/warning.pml"
@macro image "{{macro_dir}}/image.pml"
@@macro=warningBox:title=Alert;text=Something went wrong.

A valid macro file might look like this:

@new_macro
=name:warningBox
=docs:
Displays a warning box with a title and description.

=template:
<div class="warn-box">
  <strong>{{title}}</strong><br>
  {{text}}
</div>

You can also include JavaScript:

@new_macro
=name:speak
=docs:
Reads the text aloud using the browser's SpeechSynthesis API.

=template:
<button onclick="speechSynthesis.speak(new SpeechSynthesisUtterance('{{text}}'))">
  🔊 Speak
</button>

Then use it like:

@@macro=speak:text=This will be spoken by your browser.
