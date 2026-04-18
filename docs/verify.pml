@help
=name:verify
=docs:
`protoparser verify <macro|pml> <file>` verifies the detached signature for a macro or a ProtoML document.

Verification happens in two layers:

- cryptographic verification of the sidecar signature
- optional author trust lookup against one or more trust registries

Without a registry source, ProtoML can still verify whether the file matches its signature.
With `-trustRegistry=...`, it can also classify the author as `trusted`, `untrusted`, or `unknown`.

For bundled built-in macros, trust can also come from the built-in hash manifest even when no detached signature exists.
`verify` still reports detached-signature state explicitly, so a built-in macro may be trusted by origin while still showing a missing signature sidecar.

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
protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"
protoparser verify pml "./meetings/board.pml" -trustRegistry="https://example.org/protoml.registry.json"
protoparser verify macro "./shared/warn_box.pml"
