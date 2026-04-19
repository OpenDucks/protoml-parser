@help
=name:macro_registry
=docs:
An external ProtoML macro registry can be hosted as a simple static JSON file.

This kind of registry is a package index for external macros and pack metadata.
It is not the same thing as `protoparser register "<dir>" ...`, which reports on document collections.

A registry may be used in three ways:

- as a macro package catalog with `packages`
- as an author trust directory with `authors`
- as a mixed registry that provides both

This makes decentralized registries possible:

- a public GitHub Pages site
- an internal company web server
- a local file share
- a mounted network path such as an NFS or SMB share
- any static host that can publish JSON and package files

Recommended minimal registry structure:

```json
{
  "version": 1,
  "authors": [
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
  ],
  "packages": [
    {
      "name": "legal-pack",
      "version": "1.2.0",
      "description": "Contract and signature macros",
      "author": "Alice",
      "trust": "trusted",
      "manifest": "packs/legal-pack/protoml-pack.json",
      "source": "packs/legal-pack"
    }
  ]
}
```

Recommended macro pack structure:

```text
legal-pack/
  manifest.json
  macros/
    clause_box.pml
    signature_panel.pml
  themes/
    legal.css
  README.md
```

Recommended pack manifest:

```json
{
  "name": "legal-pack",
  "version": "1.2.0",
  "author": "Example Org",
  "trust": "unknown",
  "description": "Contract and signature helpers",
  "macros": [
    "macros/clause_box.pml",
    "macros/signature_panel.pml"
  ],
  "themes": [
    "themes/legal.css"
  ],
  "keywords": ["legal", "contracts", "signatures"],
  "protoml": ">=1.3.0"
}
```

Recommended project definition file:

```json
{
  "version": 1,
  "registries": [
    "https://example.org/protoml/registry.json"
  ],
  "packages": [
    {
      "name": "legal-pack",
      "version": "1.2.0"
    }
  ]
}
```

Recommended local install target:

`.protoml/macro-packs/`

That keeps the repository clean while still making the project reproducible through a single definition file.

Macro pack dependencies can be declared in `protoml-pack.json`.
During `protoparser macro_install sync`, dependencies are resolved automatically.
If a dependency entry omits a registry, the current registry is assumed.

Trust guidance:

- the registry `authors` list is the preferred place for author trust classification
- package-level `trust` is descriptive metadata for discovery and review workflows
- cryptographic signatures are stored as detached `*.sig.json` files next to macros or documents
- `protoparser trust` and `protoparser verify` can use the same registry for author trust lookup
- the nearest project `protoml.macros.json` can wire listed registries into `trust`, `verify`, and `validate` automatically
- `-trustRegistry=...` is the flag that adds extra registry sources on top of that behavior; it is not a separate command
- the flag accepts a registry directory, a direct registry JSON path, or an HTTP/HTTPS registry URL
- the flag is repeatable, so multiple registries can be combined in one command
- bundled built-in macros can also resolve to `trusted` without detached signatures when they match the shipped built-in hash manifest and do not trigger hard risk flags
- if built-in macros should be treated as `trusted` by the exact same author-signature workflow as external macros, they still need detached signatures and a matching trusted author entry in a documented trust registry
- package-level `trust` does not by itself decide runtime trust classification for a macro; author trust, signature status, hard risk flags, and built-in origin checks do
- a registry with only `authors` is valid for trust lookup even when it publishes no packages
- a registry with only `packages` is valid for install/search workflows even when it publishes no authors
- commands that resolve author trust simply ignore registries that do not provide matching `authors` entries

Remote registry workflow:

Admin side:

- host `protoml.registry.json` on a stable HTTP or HTTPS URL
- publish pack files on reachable URLs and keep `manifest` and `source` paths valid
- optionally publish an `authors` list with trust levels and public keys
- document whether the registry is reviewed, internal, public, or experimental
- a simple static web server is enough; no dedicated registry backend is required
- common company setups are an internal Apache/Nginx site, an intranet static host, or an artifact/file server that exposes plain files

User side:

- add the registry with `protoparser macro_install add_registry "https://example.org/protoml.registry.json"` when it should be part of the project
- or search it ad hoc with `protoparser macro_install search "legal" "https://example.org/protoml.registry.json"`
- add the registry to the nearest project `protoml.macros.json` when `trust`, `verify`, or `validate` should pick it up automatically for files in that project
- use `-trustRegistry=...` with `trust`, `verify`, or `validate -trust=...` if the remote registry should also act as an extra author trust source outside the stored project config
- review the registry owner before treating the registry as trusted
- prefer `trust` or `verify` when you need remote URL registries to be actively fetched
- if authors and packages are split across different registries, pass each source separately or store both in the project registry list

Local company registry workflow:

Admin side:

- keep the registry in a shared directory such as `Z:\protoml-registry\` on Windows or `/mnt/protoml-registry/` on Linux
- store `protoml.registry.json` at the registry root
- keep pack folders and manifests under that root
- publish updates through the normal internal review or file-share process used by the team

User side:

- add the registry directly with `protoparser macro_install add_registry "Z:\\protoml-registry"` or `protoparser macro_install add_registry "/mnt/protoml-registry"`
- add the same path to the nearest project `protoml.macros.json` when the shared directory should be auto-discovered as an author trust source
- use `-trustRegistry=...` when you want to add that source ad hoc without changing project config
- this is often the simplest option for internal-only teams that do not need HTTP hosting

Current local workflow:

- create a registry with `protoparser macro_install init_registry`
- create packs with `protoparser macro_install init_pack`
- add or update registry entries with `protoparser macro_install registry_add`
- add the registry to a project with `protoparser macro_install add_registry`
- install declared packs with `protoparser macro_install sync`

Recommended trust-aware workflow:

1. Use bundled `{{macro_dir}}` macros first when the shipped set already covers the need.
2. Create a custom pack only when you need behavior or presentation that is not already covered.
3. Sign the custom macro files in the pack before treating them as production-ready.
4. Publish the signing authors in the registry `authors` list.
5. Install the pack in the project and verify it with `trust`, `verify`, or `validate -trust=...`.
6. Treat JavaScript and external URLs as explicit review points, even for registry-delivered macros.

Split-registry workflow:

1. keep package delivery in one registry if that fits your release process
2. keep trusted authors in a separate reviewed registry if that fits your security process
3. add both registries where needed
4. keep every relevant registry in the nearest project `protoml.macros.json`, or repeat `-trustRegistry=...` for ad hoc trust-oriented commands
5. expect install/search to care about `packages`, and trust/verify/validate to care about `authors`

How to choose between built-ins and registries:

- use `{{macro_dir}}` for shipped built-in macros with the simplest trust story
- use a registry when you need your own reusable pack catalog across projects or teams
- use detached signatures plus a registry when your custom macros should resolve to `trusted`
- use unsigned local macros only for ad hoc or experimental work where `unknown` is acceptable

Complete signed registry flow:

1. create the registry and the pack
2. create or edit the macro file inside the pack
3. sign the macro file with `protoparser sign macro ...`
4. add the signing author's public key to the registry `authors` list
5. add the pack to the registry index
6. consume the registry from a project
7. verify the macro or the full document through project auto-discovery or with explicit `-trustRegistry=...`

Detached sidecar workflow outside a registry:

Author side:

- sign the macro file with `protoparser sign macro ...`
- keep the generated `*.sig.json` file next to the macro
- distribute the macro, the sidecar, and the public key together

User side:

- keep the macro and `*.sig.json` file together
- run `protoparser verify macro ...`
- if there is no registry author entry, treat the macro as cryptographically verified but not registry-trusted

=examples:
End-to-end signed macro registry example:

protoparser macro_install init_registry "./my-registry"
protoparser macro_install init_pack "legal-pack" "./my-registry"

Edit:
"./my-registry/packs/legal-pack/macros/legal_pack_sample.pml"

Sign the macro:
protoparser sign macro "./my-registry/packs/legal-pack/macros/legal_pack_sample.pml" "./keys/alice-private.pem" "Alice" alice-main

Add author key to `./my-registry/protoml.registry.json`:

{
  "version": 1,
  "name": "my-registry",
  "authors": [
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
  ],
  "packages": []
}

protoparser macro_install registry_add "./my-registry" "./my-registry/packs/legal-pack"
protoparser macro_install add_registry "./my-registry"
protoparser macro_install add_package "legal-pack" 1.0.0
protoparser macro_install sync

Use in a meeting:

@macros_import ".protoml/macro-packs/macros.index.pml"
@meeting "Minutes"
@@macro=legal_pack_sample:title=Hello;text=Signed macro

Verify against the registry:
protoparser trust "./project/Meeting.pml"
protoparser trust "Meeting.pml" -trustRegistry="./my-registry"
protoparser verify macro "./my-registry/packs/legal-pack/macros/legal_pack_sample.pml" -trustRegistry="./my-registry"

Split registry example:
protoparser verify pml "./meetings/board.pml" -trustRegistry="./authors-registry" -trustRegistry="./macro-registry"

Company registry examples:
protoparser macro_install add_registry "https://intra.example.local/protoml/protoml.registry.json"
protoparser macro_install add_registry "Z:\\protoml-registry"
protoparser validate "./governance/release-checklist.pml" -trust=strict -trustRegistry="https://intra.example.local/protoml/protoml.registry.json"
protoparser validate "./governance/release-checklist.pml" -trust=strict -trustRegistry="Z:\\protoml-registry"
