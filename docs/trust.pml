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

Use `-trustRegistry=...` to point to a local registry directory, a registry JSON file, or a remote registry URL.

How to read common trust results:

- a bundled `{{macro_dir}}` macro can be `trusted` without a detached signature if it is one of the known shipped built-ins and has no hard risk flag
- a bundled built-in macro can still be `untrusted` when it contains JavaScript or external URLs
- a normal local macro outside the built-in set is usually `unknown` until you sign it and optionally classify its author through a registry
- an imported `.pml` file can also stay `unknown` if it has no signature-based trust information

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
protoparser trust "Meeting.pml" -trustRegistry="./my-registry"
protoparser -vv trust "Meeting.pml" -trustRegistry="https://example.org/protoml.registry.json"
