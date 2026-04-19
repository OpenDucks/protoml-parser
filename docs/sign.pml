@help
=name:sign
=docs:
`protoparser sign <macro|pml> <file> <private_key.pem> <author> [key_id]` creates a detached RSA-SHA256 signature file next to the target.

This works for both:

- macro files used in rendering workflows
- normal `.pml` files used in governance, approval, release, policy, and record workflows

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
2. export the matching public key in PEM format
3. sign the macro file or the governance `.pml` file
4. publish the matching public key in the registry `authors` section
5. run `verify` or `trust`, either through the nearest project `protoml.macros.json` or with explicit `-trustRegistry=...`

Key bootstrap with OpenSSL:

Create a private key at a chosen export path:

`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "./keys/jane-director-private.pem"`

Export the matching public key at a chosen path:

`openssl rsa -pubout -in "./keys/jane-director-private.pem" -out "./keys/jane-director-public.pem"`

Typical governance bootstrap:

- keep the private key only with the signer, for example `./keys/jane-director-private.pem`
- export the public key to a distributable path, for example `./keys/jane-director-public.pem`
- copy the public key contents into the registry `authors[].keys[].public_key` field
- keep a stable `key_id` such as `board-chair-2026` so users can match signatures to rotated keys later

Detached sidecar workflow outside a registry:

Author side:

- create or reuse an RSA private key
- export the matching public key PEM if users should be able to verify the file without a registry
- run `protoparser sign macro ...` or `protoparser sign pml ...`
- distribute both the signed file and the generated `*.sig.json` sidecar together
- distribute the public key to users through a documented channel

User side:

- keep the signed file and its matching `*.sig.json` file together
- run `protoparser verify macro ...` or `protoparser verify pml ...` to verify the detached signature cryptographically
- if no trust registry is available, treat the result as manually verified content rather than registry-trusted content

Governance note:

- signing a normal `.pml` file is useful for controlled documents such as procedures, approvals, release checklists, policy texts, onboarding records, and reviewable internal records
- the detached sidecar proves integrity and authorship of the document file itself; it does not replace `@signatures` or `@approvals` blocks inside the ProtoML content

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
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "./keys/alice-private.pem"
openssl rsa -pubout -in "./keys/alice-private.pem" -out "./keys/alice-public.pem"
protoparser sign macro "./shared/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main

Distribute together:
- ./shared/warn_box.pml
- ./shared/warn_box.pml.sig.json
- ./keys/alice-public.pem

User:
protoparser verify macro "./shared/warn_box.pml"

Short examples:

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "./keys/alice-private.pem"
openssl rsa -pubout -in "./keys/alice-private.pem" -out "./keys/alice-public.pem"
protoparser sign macro "./macros/warn_box.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser sign pml "./meetings/board.pml" "./keys/alice-private.pem" "Alice" alice-main
protoparser verify pml "./meetings/board.pml" -trustRegistry="./authors-registry"
