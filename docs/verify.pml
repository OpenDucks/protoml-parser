@help
=name:verify
=docs:
`protoparser verify <macro|pml> <file>` verifies the detached signature for a macro or a ProtoML document.

Verification happens in two layers:

- cryptographic verification of the sidecar signature
- optional author trust lookup against one or more trust registries

Without a registry source, ProtoML can still verify whether the file matches its signature.
With `-trustRegistry=...`, it can also classify the author as `trusted`, `untrusted`, or `unknown`.
`-trustRegistry=...` is a lookup flag, not a separate subcommand.
You can point it at a registry directory, a registry JSON file, or an HTTP/HTTPS registry URL.
The flag is repeatable, so you can provide more than one registry source.
If the target file sits inside a project with `protoml.macros.json`, ProtoML also auto-discovers the nearest configured project registries and uses them even without the flag.

For bundled built-in macros, trust can also come from the built-in hash manifest even when no detached signature exists.
`verify` still reports detached-signature state explicitly, so a built-in macro may be trusted by origin while still showing a missing signature sidecar.

How to read verification results precisely:

- signature validity and author trust are related but separate
- a valid signature with no matching registry author usually stays `unknown`
- a valid signature plus an author marked `trusted` can elevate external content to `trusted`
- an author marked `untrusted` downgrades the result to `untrusted`
- hard risk flags are still authoritative in the full trust workflow, so verification alone is not the whole policy story for macros
- package-only registries are harmless during verification because author trust lookup only consumes the registry `authors` list
- author-only registries are also valid trust sources even when they do not publish any macro packages

Detached sidecar workflow outside a registry:

Author side:

- sign the macro or document and distribute the `*.sig.json` file together with the original file
- give users the public key through a separate documented channel

User side:

- verify the file with `protoparser verify ...`
- use the result as cryptographic integrity/authorship evidence
- if there is no trust registry, the result proves the file matches the signature, but it does not elevate the author to `trusted`

=examples:
protoparser verify macro "./macros/warn_box.pml"
protoparser verify pml "./governance/board.pml"
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./authors-registry" -trustRegistry="./package-registry"
protoparser verify pml "./meetings/board.pml" -trustRegistry="https://example.org/protoml.registry.json"
protoparser verify macro "./shared/warn_box.pml"
