# CHANGELOG.md

## v1.1.2

- Added `image` macro for embedding images. Supports local and remote images. Example usage:
  - `@@macro=image:src=assets/logo.png`
  - `@@macro=image:src=https://example.com/image.jpg`
- Fixed an issue with comments being incorrectly or unintentionally parsed as content. Comments are now properly ignored or filtered during parsing.

## v1.1.1

- Fixed an issue with the `--docs` command where it would not display documentation correctly.

## v1.1.0

- Added `protoviewer` (`protoml-viewer`) command to view computed `.pml` files.
- Added builtin macros, you can access them like this
- Added macro help `protoparser help {path_to_macro}`
- Added command to list all macros in path `protoparser --listMacros <path>` or with builtin macros `protoparser --listMacros {{macro_dir}}` and `protoparser --macroHelp <file_path>`
- Added enhanced help command for internal commands and more accessed via `protoparser --listDocs` and `protoparser --docs <name>`

## prior v1.0.6

There was no CHANGELOG.md file before v1.0.6.