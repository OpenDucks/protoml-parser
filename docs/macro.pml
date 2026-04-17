@help
=name:macro
=docs:
The `@macro` command imports a named macro file from a specified path, making it available for inline use with `@@macro=name:param=value`.

A macro file must begin with `@new_macro`, include a `=name:` declaration, and define a `=template:` block. Templates can contain `{{variable}}` placeholders that are replaced when the macro is called.

Macros are especially useful for reusable content blocks, warnings, callouts, layout helpers, and injected logic such as buttons or dynamic fields.

Templates can include JavaScript and HTML, which are only rendered in the `html` export. JavaScript is not stripped or sanitized.

Paths should be wrapped in double quotes. This is strongly recommended when using `{{macro_dir}}`, because some shells may otherwise interpret characters before ProtoML receives the path.

⚠️ **Security Notice**: Embedded JS in macros is powerful but potentially dangerous (e.g. XSS). Do not use untrusted macro files.

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
