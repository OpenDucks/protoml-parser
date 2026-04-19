@help
=name:macro_install
=docs:
`macro_install` is the parent command group for project-local external macro package and registry workflows.

This command family is intended for macro installation outside the repository itself.
The goal is to keep external macro packs in a project path such as `.protoml/macro-packs/` while allowing a project to declare and reproduce its required macro dependencies.

These registries are macro package catalogs for install, sync, search, and trust lookup workflows.
They are separate from `protoparser register "<dir>" ...`, which creates governance reports for document directories.

The same registry file may also contain an `authors` section for trust lookup, but `macro_install` itself primarily cares about package-oriented fields such as `packages`, `manifest`, and `source`.
It is also valid to keep package registries and author registries separate.

Implemented command shape:

`protoparser macro_install sync`
Reads a project definition file such as `protoml.macros.json` and installs all declared macro packs into the local project macro path.
It also generates a macro import index at `.protoml/macro-packs/macros.index.pml`.
If a requested version is no longer present in the registry, sync falls back to the newest available registry version and updates the project package entry to that resolved version.

`protoparser macro_install add_registry "https://example.org/protoml/registry.json"`
Registers an external macro registry source.
Local file paths and local registry directories are supported for sync.
Remote registry URLs can already be stored in the project definition for future use.

Typical company variants:

- an internal static web URL such as `https://intra.example.local/protoml/protoml.registry.json`
- a shared local path such as `Z:\protoml-registry` or `/mnt/protoml-registry`

`protoparser macro_install list_registries`
Lists configured registry sources.

`protoparser macro_install remove_registry "https://example.org/protoml/registry.json"`
Removes a configured registry source.

`protoparser macro_install install "legal-pack"`
Adds a named macro pack to the project definition and synchronizes the local install directory.

`protoparser macro_install remove "legal-pack"`
Removes an installed macro pack from the local project path.

`protoparser macro_install list`
Lists installed macro packs for the current project.

`protoparser macro_install info "legal-pack"`
Shows manifest and source details for an installed macro pack.

`protoparser macro_install search "legal"`
Searches package entries across configured registries.
You can also pass a registry source explicitly, including a local path or remote registry URL, even if that registry is not configured in the current project.

`protoparser macro_install init`
Creates a `protoml.macros.json` project definition file plus `.protoml/` support files.

`protoparser macro_install init_registry "./my-registry"`
Creates a local registry with `protoml.registry.json` and a `packs/` directory.

`protoparser macro_install init_pack "legal-pack" "./my-registry"`
Creates a pack scaffold with `protoml-pack.json`, `macros/`, `themes/`, and a sample macro.
If the target already contains a registry, the pack is added to that registry automatically.

`protoparser macro_install registry_add "./my-registry" "./my-registry/packs/legal-pack"`
Adds or updates a pack entry in a registry file.

`protoparser macro_install registry_remove "./my-registry" "legal-pack"`
Removes a pack entry from a registry file.

Dependencies declared in `protoml-pack.json` are resolved during `sync`.
If a dependency does not declare a registry explicitly, the current registry is used.

The generated import index can be used directly in a ProtoML document:

`@macros_import ".protoml/macro-packs/macros.index.pml"`

=examples:
protoparser macro_install init
protoparser macro_install init_registry "./my-registry"
protoparser macro_install init_pack "legal-pack" "./my-registry"
protoparser macro_install sync
protoparser macro_install add_registry "./my-registry"
protoparser macro_install install "legal-pack"
protoparser macro_install remove "legal-pack"
protoparser macro_install list
protoparser macro_install search "legal-pack"
protoparser macro_install search "legal-pack" "./my-registry"
protoparser macro_install search "legal-pack" "https://example.org/protoml/registry.json"

@macros_import ".protoml/macro-packs/macros.index.pml"
