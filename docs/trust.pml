@help
=name:trust
=docs:
`protoparser trust <pml_file>` evaluates the trust state of a ProtoML document and all macros actually used inside it.

The trust model is intentionally lightweight:

- risk flags are detected statically
- signatures are stored in detached sidecar files like `file.pml.sig.json`
- author trust is resolved from one or more registry sources

To avoid unnecessary overhead, ProtoML distinguishes between:

- `trusted`: valid signature by a trusted author and no dangerous macro flags
- `unknown`: no signature or no trusted registry author match, but also no hard risk violation
- `untrusted`: invalid signature, author marked untrusted, script usage, external URLs, or imported untrusted content

Important clarification:

- plain HTML in a macro is only a capability flag, not an automatic trust failure
- JavaScript and external URLs are the hard downgrade conditions
- unsigned content is `unknown`, not automatically `trusted`
- bundled built-in macros from the shipped macro directory can still resolve to `trusted` without a detached sidecar if they match the built-in hash manifest and have no hard risk flags
- extra or modified files inside that directory are not automatically trusted just because they live next to bundled macros

If a nearest project `protoml.macros.json` exists next to the target file or in one of its parent directories, `trust`, `verify`, and `validate` automatically use its configured `registries` entries.

`-trustRegistry=...` is a trust lookup flag, not its own subcommand.
You pass it to `trust`, `verify`, or `validate` when those commands should consult extra registry sources beyond the discovered project configuration.

Accepted source forms:

- a local registry directory containing `protoml.registry.json`
- a direct path to a registry JSON file
- an HTTP or HTTPS registry URL

The flag is repeatable, so you can combine multiple registry sources:

- one registry that only publishes trusted authors
- one registry that mainly publishes macro packages
- one internal reviewed registry plus one external discovery registry

What the flag actually does:

- it adds author/key lookup sources on top of detached signature verification
- it does not override hard risk flags such as JavaScript or external URLs
- it does not make unsigned files automatically `trusted`
- it does not make package metadata authoritative; the `authors` list is the relevant trust input
- all provided registry sources are merged for author lookup; the first matching author/key pair decides the reported match
- registries with no `authors` section simply contribute no author trust data

Command behavior:

- `trust` loads local and remote registry sources and evaluates the full document tree
- `verify` loads local and remote registry sources and reports signature plus author trust for a single file
- `validate` uses synchronous trust analysis during validation; local registry directories/files work there, but remote URLs are skipped rather than fetched
- when the target file lives inside a project with `protoml.macros.json`, all three commands auto-discover those configured registries from the nearest project config file
- repeated `-trustRegistry=...` flags are supported on all three commands

Fully specified macro trust classification:

- `trusted`: no hard risk flag, not a modified built-in, and either
  - the macro is a known bundled built-in whose file hash matches the shipped built-in manifest, or
  - the detached signature is valid and the matching registry author is marked `trusted`
- `unknown`: not `untrusted`, but also not eligible for `trusted`
  - typical cases are unsigned files, valid signatures whose author is not listed in any registry, or authors explicitly classified as `unknown`
- `untrusted`: any of the following is enough
  - contains JavaScript
  - contains external URLs
  - detached signature is invalid
  - signing author is marked `untrusted`
  - bundled built-in macro file was modified and no longer matches the shipped hash

Fully specified document (`.pml`) trust classification:

- `trusted`: detached signature is valid, the matching registry author is `trusted`, and the document does not use any `untrusted` macros or import any `untrusted` `.pml` files
- `unknown`: not `untrusted`, but also not signature-plus-registry-`trusted`
  - typical cases are unsigned documents, valid signatures without a matching trusted registry author, or documents that only use `unknown` dependencies
- `untrusted`: any of the following is enough
  - uses an `untrusted` macro
  - imports an `untrusted` `.pml` file
  - detached signature is invalid
  - signing author is marked `untrusted`

How to read common trust results:

- a bundled `{{macro_dir}}` macro can be `trusted` without a detached signature if it is one of the known shipped built-ins and has no hard risk flag
- a bundled built-in macro can still be `untrusted` when it contains JavaScript or external URLs
- a normal local macro outside the built-in set is usually `unknown` until you sign it and optionally classify its author through a registry
- an imported `.pml` file can also stay `unknown` if it has no signature-based trust information
- a signed governance `.pml` file can become `trusted` through the same author-registry workflow as a macro file

Recommended workflow choices:

1. Use built-in bundled macros through `{{macro_dir}}` when you want low-friction trusted defaults.
2. Use your own unsigned local macros when experimentation matters more than formal trust, and expect `unknown`.
3. Sign custom macros and add trusted authors to a registry when you want custom macros to resolve to `trusted`.
4. Review any macro with JavaScript or external URLs manually, even when it is bundled or signed.

Detached sidecar workflow outside a registry:

Author side:

- sign the macro or `.pml` file so a `*.sig.json` file is created next to it
- distribute the file and the sidecar together

User side:

- use `verify` to check the detached signature
- use `trust` when you also have a registry that can classify the signing author
- without a registry, signed content can still be verified, but it usually remains `unknown` instead of `trusted`

=examples:
protoparser trust "Meeting.pml"
protoparser verify "./macros/warn_box.pml"
protoparser trust "Meeting.pml" -trustRegistry="./my-registry"
protoparser -vv trust "Meeting.pml" -trustRegistry="https://example.org/protoml.registry.json"
