@new_macro
=name:image
=template:
<img src="{{src}}" alt="Image" style="max-width: 100%; height: auto;">
=docs:
The `@image` command embeds an image into the document. It supports both local file paths and remote URLs as it simply renders an `<img>` tag in the output.
Example usage:
@@macro=image:src=assets/logo.png
@@macro=image:src=https://example.com/image.jpg