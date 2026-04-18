# Macro Registry Suite

This example shows the local external macro pack groundwork.

Included:

- `registry/`
  - `protoml.registry.json`
  - `packs/base-kit/`
  - `packs/contract-kit/`
- `project/`
  - `protoml.macros.json`
  - `.protoml/macro-packs/`
  - `.protoml/macro-packs/macros.index.pml`

`contract-kit` depends on `base-kit`.
The dependency does not name another registry, so it is resolved from the same registry during `macro_install sync`.

Useful commands:

```bash
protoparser macro_install init_registry "./examples/macro-registry-suite/registry"
protoparser macro_install init_pack "legal-pack" "./examples/macro-registry-suite/registry"
```

Inside `examples/macro-registry-suite/project`:

```bash
protoparser macro_install list_registries
protoparser macro_install list
protoparser macro_install info contract-kit
protoparser macro_install sync
```

Use the generated import index in a document:

```plaintext
@macros_import ".protoml/macro-packs/macros.index.pml"
```
