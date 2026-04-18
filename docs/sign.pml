@help
=name:sign
=docs:
`protoparser sign <macro|pml> <file> <private_key.pem> <author> [key_id]` creates a detached RSA-SHA256 signature file next to the target.

Examples:

- `warning.pml` becomes `warning.pml.sig.json`
- `Meeting.pml` becomes `Meeting.pml.sig.json`

The sidecar contains:

- file hash
- author name
- optional key ID
- public key
- signature payload

This keeps ProtoML source files clean and avoids adding extra inline signature syntax to the language itself.

Registry-backed workflow:

1. create or reuse an RSA private key
2. sign the macro file
3. publish the matching public key in the registry `authors` section
4. run `verify` or `trust` with `-trustRegistry=...`

Detached sidecar workflow outside a registry:

Author side:

- create or reuse an RSA private key
- run `protoparser sign macro ...`
- distribute both the macro file and the generated `*.sig.json` sidecar together
- distribute the public key to users through a documented channel

User side:

- keep the macro file and its matching `*.sig.json` file together
- run `protoparser verify macro ...` to verify the detached signature cryptographically
- if no trust registry is available, treat the macro as manually verified content rather than registry-trusted content

If you want built-in macros to participate in the same trust model as external macros, they should also ship with detached `*.sig.json` files and a matching trusted author entry in a documented trust registry.
Built-in bundled macros can also be trusted without a detached sidecar when they match the shipped built-in hash manifest and do not trigger hard risk flags, but that origin-based trust only applies to the known bundled files.

=examples:
Full signing and verification flow:

protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main

Registry author entry:

{
  "name": "Alice",
  "trust": "trusted",
  "keys": [
    {
      "id": "alice-main",
      "public_key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
    }
  ]
}

Verification:

protoparser verify macro "./macros/warn_box.pml" -trustRegistry="./my-registry"
protoparser trust "Meeting.pml" -trustRegistry="./my-registry"

Detached sidecar example without a registry:

Author:
protoparser sign macro "./shared/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main

Distribute together:
- ./shared/warn_box.pml
- ./shared/warn_box.pml.sig.json

User:
protoparser verify macro "./shared/warn_box.pml"

Short examples:

protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser sign pml "./meetings/board.pml" "./keys/alice-private.pem" "Alice" alice-main
