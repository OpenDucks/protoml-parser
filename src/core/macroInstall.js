const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const PROJECT_FILE = "protoml.macros.json";
const PROJECT_META_DIR = ".protoml";
const LOCK_FILE = path.join(PROJECT_META_DIR, "protoml.macros.lock.json");
const INSTALL_DIR = path.join(PROJECT_META_DIR, "macro-packs");
const INSTALL_INDEX_FILE = path.join(INSTALL_DIR, "index.json");
const IMPORT_INDEX_FILE = path.join(INSTALL_DIR, "macros.index.pml");
const REGISTRY_FILE = "protoml.registry.json";
const PACK_MANIFEST_FILE = "protoml-pack.json";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function extractMacroName(filePath) {
  if (!fs.existsSync(filePath)) {
    return path.basename(filePath, path.extname(filePath));
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const match = raw.match(/^=name:(.+)$/m);
  return match ? match[1].trim() : path.basename(filePath, path.extname(filePath));
}

function normalizeSlashes(input) {
  return String(input || "").replace(/\\/g, "/");
}

function relativePath(fromDir, targetPath) {
  return normalizeSlashes(path.relative(fromDir, targetPath) || ".");
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function toVersionParts(version) {
  return String(version || "")
    .split(/[.+-]/)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function compareVersions(a, b) {
  const left = toVersionParts(a);
  const right = toVersionParts(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const l = left[index] || 0;
    const r = right[index] || 0;
    if (l !== r) {
      return l - r;
    }
  }

  return String(a || "").localeCompare(String(b || ""));
}

function getProjectFile(projectRoot) {
  return path.join(projectRoot, PROJECT_FILE);
}

function getLockFile(projectRoot) {
  return path.join(projectRoot, LOCK_FILE);
}

function getInstallDir(projectRoot) {
  return path.join(projectRoot, INSTALL_DIR);
}

function getInstallIndexFile(projectRoot) {
  return path.join(projectRoot, INSTALL_INDEX_FILE);
}

function getImportIndexFile(projectRoot) {
  return path.join(projectRoot, IMPORT_INDEX_FILE);
}

function getRegistryFile(target) {
  const resolved = path.resolve(target);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, REGISTRY_FILE);
  }
  if (path.basename(resolved).toLowerCase() === REGISTRY_FILE.toLowerCase()) {
    return resolved;
  }
  return path.join(resolved, REGISTRY_FILE);
}

function loadProjectConfig(projectRoot) {
  const projectFile = getProjectFile(projectRoot);
  if (!fs.existsSync(projectFile)) {
    throw new Error(`Macro project file not found: ${projectFile}`);
  }
  const config = readJson(projectFile);
  if (!Array.isArray(config.registries)) config.registries = [];
  if (!Array.isArray(config.packages)) config.packages = [];
  return config;
}

function saveProjectConfig(projectRoot, config) {
  writeJson(getProjectFile(projectRoot), config);
}

function createEmptyProjectConfig() {
  return {
    version: 1,
    registries: [],
    packages: [],
  };
}

function createEmptyRegistry(name = "local-registry") {
  return {
    version: 1,
    name,
    packages: [],
    authors: [],
  };
}

function createPackManifest(name) {
  const macroFile = `${sanitizeName(name)}_sample.pml`;
  return {
    schema_version: 1,
    name,
    version: "1.0.0",
    description: `ProtoML macro pack: ${name}`,
    author: "",
    macros: [`macros/${macroFile}`],
    themes: [],
    dependencies: [],
    protoml: ">=1.3.0",
  };
}

function sanitizeName(name) {
  return String(name || "macro_pack")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "macro_pack";
}

function copyDirRecursive(sourceDir, targetDir) {
  ensureDir(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function ensureProjectPaths(projectRoot) {
  ensureDir(path.join(projectRoot, PROJECT_META_DIR));
  ensureDir(getInstallDir(projectRoot));
}

function initMacroProject(target = process.cwd()) {
  const projectRoot = path.resolve(target);
  ensureProjectPaths(projectRoot);

  const files = [];
  const projectFile = getProjectFile(projectRoot);
  const lockFile = getLockFile(projectRoot);
  const importIndexFile = getImportIndexFile(projectRoot);
  const readmeFile = path.join(projectRoot, PROJECT_META_DIR, "README.md");

  if (!fs.existsSync(projectFile)) {
    writeJson(projectFile, createEmptyProjectConfig());
    files.push(projectFile);
  }
  if (!fs.existsSync(lockFile)) {
    writeJson(lockFile, { version: 1, generated_at: null, packages: [] });
    files.push(lockFile);
  }
  writeIfMissing(
    readmeFile,
    `# ProtoML Macro Packs

This directory stores project-local external macro packs.

- Installed packs live in \`macro-packs/\`
- The project definition file is \`../${PROJECT_FILE}\`
- The lock file is \`${path.basename(lockFile)}\`
- The generated macro import index is \`macro-packs/${path.basename(importIndexFile)}\`
`
  );
  if (fs.existsSync(readmeFile)) {
    files.push(readmeFile);
  }

  return { projectRoot, files };
}

function initMacroRegistry(target = process.cwd()) {
  const registryRoot = path.resolve(target);
  ensureDir(registryRoot);
  ensureDir(path.join(registryRoot, "packs"));

  const registryFile = path.join(registryRoot, REGISTRY_FILE);
  const registryName = path.basename(registryRoot);
  const files = [];

  if (!fs.existsSync(registryFile)) {
    writeJson(registryFile, createEmptyRegistry(registryName));
    files.push(registryFile);
  }

  const readmeFile = path.join(registryRoot, "README.md");
  writeIfMissing(
    readmeFile,
    `# ProtoML Macro Registry

This directory is a local ProtoML macro registry.

- Registry file: \`${REGISTRY_FILE}\`
- Pack storage: \`packs/\`
- Each pack should contain a \`${PACK_MANIFEST_FILE}\`
`
  );
  if (fs.existsSync(readmeFile)) {
    files.push(readmeFile);
  }

  return { registryRoot, files };
}

function initMacroPack(name, target = process.cwd()) {
  if (!name) {
    throw new Error("No pack name provided.");
  }

  const baseDir = path.resolve(target);
  const registryFile = getRegistryFile(baseDir);
  const hasRegistry = fs.existsSync(registryFile);
  const packRoot = hasRegistry
    ? path.join(path.dirname(registryFile), "packs", sanitizeName(name))
    : path.join(baseDir, sanitizeName(name));

  ensureDir(packRoot);
  ensureDir(path.join(packRoot, "macros"));
  ensureDir(path.join(packRoot, "themes"));

  const manifest = createPackManifest(name);
  const manifestFile = path.join(packRoot, PACK_MANIFEST_FILE);
  const sampleMacroFile = path.join(packRoot, manifest.macros[0]);
  const readmeFile = path.join(packRoot, "README.md");

  if (!fs.existsSync(manifestFile)) {
    writeJson(manifestFile, manifest);
  }

  writeIfMissing(
    sampleMacroFile,
    `@new_macro
=name:${sanitizeName(name)}_sample
=template:
<div class="macro-pack-sample"><strong>{{title}}</strong><br>{{text}}</div>
=docs:
Sample macro created by \`protoparser macro_install init_pack\`.
`
  );

  writeIfMissing(
    readmeFile,
    `# ${name}

This is a ProtoML macro pack scaffold.

- Manifest: \`${PACK_MANIFEST_FILE}\`
- Macros: \`macros/\`
- Themes: \`themes/\`
`
  );

  if (hasRegistry) {
    upsertRegistryPack(path.dirname(registryFile), packRoot);
  }

  return { packRoot, files: [manifestFile, sampleMacroFile, readmeFile] };
}

function normalizeRegistrySource(value, baseDir) {
  if (typeof value === "string") {
    return {
      name: path.basename(value),
      source: value,
      local: !isUrl(value),
      resolvedSource: isUrl(value) ? value : path.resolve(baseDir, value),
    };
  }

  const source = value?.source || value?.path;
  if (!source) {
    throw new Error("Registry entry is missing a source.");
  }

  return {
    name: value.name || path.basename(source),
    source,
    local: !isUrl(source),
    resolvedSource: isUrl(source) ? source : path.resolve(baseDir, source),
  };
}

function resolveRegistryFileFromSource(normalizedSource) {
  if (!normalizedSource.local) {
    throw new Error(`Remote registry sources are not yet supported for sync: ${normalizedSource.source}`);
  }

  const sourcePath = normalizedSource.resolvedSource;
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Registry source not found: ${sourcePath}`);
  }

  if (fs.statSync(sourcePath).isDirectory()) {
    return path.join(sourcePath, REGISTRY_FILE);
  }

  return sourcePath;
}

function loadRegistryFromSource(normalizedSource) {
  const registryFile = resolveRegistryFileFromSource(normalizedSource);
  if (!fs.existsSync(registryFile)) {
    throw new Error(`Registry file not found: ${registryFile}`);
  }
  const registry = readJson(registryFile);
  if (!Array.isArray(registry.packages)) {
    registry.packages = [];
  }
  return {
    name: registry.name || normalizedSource.name,
    file: registryFile,
    dir: path.dirname(registryFile),
    source: normalizedSource.source,
    packages: registry.packages,
    raw: registry,
  };
}

function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https://") ? https : http;
    const request = client.get(url, (response) => {
      const statusCode = response.statusCode || 0;

      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        if (redirectCount >= 5) {
          reject(new Error(`Too many redirects while loading registry: ${url}`));
          return;
        }

        const nextUrl = new URL(response.headers.location, url).toString();
        response.resume();
        resolve(fetchJson(nextUrl, redirectCount + 1));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(new Error(`Registry request failed (${statusCode}): ${url}`));
        return;
      }

      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid registry JSON from ${url}: ${error.message}`));
        }
      });
    });

    request.on("error", (error) => {
      reject(new Error(`Failed to load registry ${url}: ${error.message}`));
    });
  });
}

async function loadRegistryFromSourceAsync(normalizedSource) {
  if (normalizedSource.local) {
    return loadRegistryFromSource(normalizedSource);
  }

  const registry = await fetchJson(normalizedSource.resolvedSource);
  if (!Array.isArray(registry.packages)) {
    registry.packages = [];
  }

  return {
    name: registry.name || normalizedSource.name,
    file: normalizedSource.resolvedSource,
    dir: normalizedSource.resolvedSource,
    source: normalizedSource.source,
    packages: registry.packages,
    raw: registry,
  };
}

function chooseRegistryCandidate(entries, requestedVersion = null) {
  if (!entries.length) {
    return null;
  }

  const sorted = [...entries].sort((left, right) =>
    compareVersions(left.entry.version, right.entry.version)
  );

  if (requestedVersion) {
    const exact = sorted.find((candidate) => candidate.entry.version === requestedVersion);
    if (exact) {
      return {
        ...exact,
        requestedVersion,
        resolvedVersion: exact.entry.version || null,
        usedVersionFallback: false,
      };
    }
  }

  const best = sorted[sorted.length - 1];
  return {
    ...best,
    requestedVersion,
    resolvedVersion: best.entry.version || null,
    usedVersionFallback: Boolean(requestedVersion && best.entry.version !== requestedVersion),
  };
}

function upsertRegistryPack(registryTarget, packDir) {
  const registryFile = getRegistryFile(registryTarget);
  if (!fs.existsSync(registryFile)) {
    throw new Error(`Registry file not found: ${registryFile}`);
  }

  const resolvedPackDir = path.resolve(packDir);
  const manifestFile = path.join(resolvedPackDir, PACK_MANIFEST_FILE);
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Pack manifest not found: ${manifestFile}`);
  }

  const manifest = readJson(manifestFile);
  const registry = readJson(registryFile);
  if (!Array.isArray(registry.packages)) {
    registry.packages = [];
  }

  const entry = {
    name: manifest.name,
    version: manifest.version,
    description: manifest.description || "",
    author: manifest.author || "",
    trust: manifest.trust || null,
    manifest: relativePath(path.dirname(registryFile), manifestFile),
    source: relativePath(path.dirname(registryFile), resolvedPackDir),
    dependencies: Array.isArray(manifest.dependencies) ? manifest.dependencies : [],
  };

  const index = registry.packages.findIndex((pkg) => pkg.name === entry.name);
  if (index >= 0) {
    registry.packages[index] = { ...registry.packages[index], ...entry };
  } else {
    registry.packages.push(entry);
  }

  writeJson(registryFile, registry);
  return { registryFile, entry };
}

function removeRegistryPack(registryTarget, packName) {
  const registryFile = getRegistryFile(registryTarget);
  if (!fs.existsSync(registryFile)) {
    throw new Error(`Registry file not found: ${registryFile}`);
  }

  const registry = readJson(registryFile);
  const before = Array.isArray(registry.packages) ? registry.packages.length : 0;
  registry.packages = (registry.packages || []).filter((pkg) => pkg.name !== packName);
  writeJson(registryFile, registry);
  return { registryFile, removed: before - registry.packages.length };
}

function addRegistryToProject(projectRoot, source) {
  const config = loadProjectConfig(projectRoot);
  const normalizedSource = isUrl(source)
    ? source
    : relativePath(projectRoot, path.resolve(projectRoot, source));

  if (!config.registries.some((entry) => (typeof entry === "string" ? entry : entry.source) === normalizedSource)) {
    config.registries.push(normalizedSource);
    saveProjectConfig(projectRoot, config);
  }
  return config;
}

function removeRegistryFromProject(projectRoot, source) {
  const config = loadProjectConfig(projectRoot);
  const normalizedCandidates = new Set([
    source,
    relativePath(projectRoot, path.resolve(projectRoot, source)),
  ]);
  config.registries = config.registries.filter((entry) => {
    const value = typeof entry === "string" ? entry : entry.source;
    return !normalizedCandidates.has(value);
  });
  saveProjectConfig(projectRoot, config);
  return config;
}

function addPackageToProject(projectRoot, name, version = null, registry = null) {
  const config = loadProjectConfig(projectRoot);
  const existing = config.packages.find((pkg) => pkg.name === name);
  const next = { name };
  if (version) next.version = version;
  if (registry) next.registry = registry;

  if (existing) {
    Object.assign(existing, next);
  } else {
    config.packages.push(next);
  }

  saveProjectConfig(projectRoot, config);
  return config;
}

function updatePackageInProject(projectRoot, name, version, registry = null) {
  if (!version) {
    throw new Error("No version provided for update_package.");
  }
  return addPackageToProject(projectRoot, name, version, registry);
}

function removePackageFromProject(projectRoot, name) {
  const config = loadProjectConfig(projectRoot);
  config.packages = config.packages.filter((pkg) => pkg.name !== name);
  saveProjectConfig(projectRoot, config);
  return config;
}

function uninstallPackageFromProject(projectRoot, name) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const config = removePackageFromProject(resolvedProjectRoot, name);
  const installPath = path.join(getInstallDir(resolvedProjectRoot), sanitizeName(name));
  if (fs.existsSync(installPath)) {
    fs.rmSync(installPath, { recursive: true, force: true });
  }

  const indexFile = getInstallIndexFile(resolvedProjectRoot);
  if (fs.existsSync(indexFile)) {
    const index = readJson(indexFile);
    index.packages = (index.packages || []).filter((pkg) => pkg.name !== name);
    writeJson(indexFile, index);
  }

  const lockFile = getLockFile(resolvedProjectRoot);
  if (fs.existsSync(lockFile)) {
    const lock = readJson(lockFile);
    lock.packages = (lock.packages || []).filter((pkg) => pkg.name !== name);
    writeJson(lockFile, lock);
  }

  const remaining = listInstalledMacroPacks(resolvedProjectRoot);
  if ((remaining.packages || []).length === 0) {
    const importIndexFile = getImportIndexFile(resolvedProjectRoot);
    if (fs.existsSync(importIndexFile)) {
      fs.unlinkSync(importIndexFile);
    }
  }

  return { config, installPath };
}

function resolvePackageEntry(request, registries) {
  if (request.source) {
    if (isUrl(request.source)) {
      throw new Error(`Remote package sources are not yet supported for sync: ${request.source}`);
    }

    const sourceDir = path.resolve(request.projectRoot, request.source);
    const manifestFile = path.join(sourceDir, PACK_MANIFEST_FILE);
    if (!fs.existsSync(manifestFile)) {
      throw new Error(`Pack manifest not found: ${manifestFile}`);
    }

    const manifest = readJson(manifestFile);
    return {
      name: manifest.name,
      version: manifest.version,
      sourceDir,
      manifest,
      registryName: null,
      registrySource: null,
      dependencies: manifest.dependencies || [],
    };
  }

  const candidates = [];
  for (const registry of registries) {
    if (request.registry && request.registry !== registry.name && request.registry !== registry.source) {
      continue;
    }
    for (const entry of registry.packages.filter((pkg) => pkg.name === request.name)) {
      candidates.push({ registry, entry });
    }
  }

  if (candidates.length === 0) {
    throw new Error(`Package not found in registries: ${request.name}`);
  }

  const candidatesByRegistry = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.registry.name}::${candidate.registry.source}`;
    if (!candidatesByRegistry.has(key)) {
      candidatesByRegistry.set(key, []);
    }
    candidatesByRegistry.get(key).push(candidate);
  }

  const registryMatches = [...candidatesByRegistry.values()]
    .map((entries) => chooseRegistryCandidate(entries, request.version))
    .filter(Boolean);

  if (registryMatches.length > 1 && !request.registry) {
    throw new Error(`Package is ambiguous across registries: ${request.name}`);
  }

  const match = registryMatches[0];
  const sourceDir = path.resolve(match.registry.dir, match.entry.source);
  const manifestFile = match.entry.manifest
    ? path.resolve(match.registry.dir, match.entry.manifest)
    : path.join(sourceDir, PACK_MANIFEST_FILE);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Package source directory not found: ${sourceDir}`);
  }
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Package manifest not found: ${manifestFile}`);
  }

  const manifest = readJson(manifestFile);
  return {
    name: manifest.name,
    version: manifest.version,
    sourceDir,
    manifest,
    registryName: match.registry.name,
    registrySource: match.registry.source,
    dependencies: manifest.dependencies || match.entry.dependencies || [],
    requestedVersion: request.version || null,
    usedVersionFallback: Boolean(match.usedVersionFallback),
  };
}

function normalizeDependency(dep, fallbackRegistry, projectRoot) {
  if (typeof dep === "string") {
    return { name: dep, registry: fallbackRegistry || null, projectRoot };
  }

  return {
    name: dep.name,
    version: dep.version || null,
    registry: dep.registry || fallbackRegistry || null,
    source: dep.source || null,
    projectRoot,
  };
}

function syncMacroProject(projectRoot = process.cwd()) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  ensureProjectPaths(resolvedProjectRoot);
  const config = loadProjectConfig(resolvedProjectRoot);
  const normalizedRegistries = config.registries.map((entry) =>
    normalizeRegistrySource(entry, resolvedProjectRoot)
  );
  const registries = normalizedRegistries.map(loadRegistryFromSource);

  const processed = new Map();
  const orderedPackages = [];
  let configChanged = false;

  function installRequest(request) {
    if (!request?.name && !request?.source) {
      return;
    }

    const resolved = resolvePackageEntry(
      { ...request, projectRoot: resolvedProjectRoot },
      registries
    );

    const key = `${resolved.name}@${resolved.version || "unknown"}`;
    if (processed.has(key)) {
      return;
    }

    processed.set(key, true);

    const targetDir = path.join(getInstallDir(resolvedProjectRoot), sanitizeName(resolved.name));
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    copyDirRecursive(resolved.sourceDir, targetDir);

    orderedPackages.push({
      name: resolved.name,
      version: resolved.version,
      requested_version: resolved.requestedVersion,
      used_version_fallback: resolved.usedVersionFallback,
      registry: resolved.registryName,
      registry_source: resolved.registrySource,
      source_dir: resolved.sourceDir,
      installed_path: targetDir,
      dependencies: resolved.dependencies || [],
    });

    for (const dep of resolved.dependencies || []) {
      installRequest(normalizeDependency(dep, resolved.registryName || resolved.registrySource, resolvedProjectRoot));
    }

    if (request.fromProject && !request.source) {
      const projectPackage = config.packages.find((pkg) => pkg.name === request.name);
      if (projectPackage && resolved.version && projectPackage.version !== resolved.version) {
        projectPackage.version = resolved.version;
        configChanged = true;
      }
    }
  }

  for (const request of config.packages) {
    installRequest({ ...request, projectRoot: resolvedProjectRoot, fromProject: true });
  }

  const lock = {
    version: 1,
    generated_at: new Date().toISOString(),
    packages: orderedPackages,
  };

  const installIndex = {
    version: 1,
    packages: orderedPackages.map((pkg) => ({
      name: pkg.name,
      version: pkg.version,
      registry: pkg.registry,
      installed_path: relativePath(resolvedProjectRoot, pkg.installed_path),
    })),
  };

  const importLines = [];
  importLines.push("// Generated by protoparser macro_install sync");
  importLines.push("// Use in PML with:");
  importLines.push('// @macros_import ".protoml/macro-packs/macros.index.pml"');
  for (const pkg of orderedPackages) {
    const manifest = readJson(path.join(pkg.installed_path, PACK_MANIFEST_FILE));
    for (const macroRef of manifest.macros || []) {
      const macroFullPath = path.join(pkg.installed_path, macroRef);
      const macroName = extractMacroName(macroFullPath);
      const macroRelativePath = relativePath(resolvedProjectRoot, macroFullPath);
      importLines.push(`@macro ${macroName} "${macroRelativePath}"`);
    }
  }

  writeJson(getLockFile(resolvedProjectRoot), lock);
  writeJson(getInstallIndexFile(resolvedProjectRoot), installIndex);
  fs.writeFileSync(getImportIndexFile(resolvedProjectRoot), importLines.join("\n") + "\n", "utf8");
  if (configChanged) {
    saveProjectConfig(resolvedProjectRoot, config);
  }

  return {
    projectRoot: resolvedProjectRoot,
    packages: orderedPackages,
    importIndexFile: getImportIndexFile(resolvedProjectRoot),
    registries: registries.map((registry) => ({
      name: registry.name,
      source: registry.source,
      file: registry.file,
    })),
  };
}

async function searchMacroRegistryPackages(projectRoot = process.cwd(), query = "", registrySource = null) {
  const resolvedProjectRoot = path.resolve(projectRoot);
  const sources = [];

  if (registrySource) {
    sources.push(normalizeRegistrySource(registrySource, resolvedProjectRoot));
  } else {
    const config = loadProjectConfig(resolvedProjectRoot);
    for (const entry of config.registries || []) {
      sources.push(normalizeRegistrySource(entry, resolvedProjectRoot));
    }
  }

  if (!sources.length) {
    throw new Error("No registry sources configured or provided for search.");
  }

  const registries = await Promise.all(sources.map((source) => loadRegistryFromSourceAsync(source)));
  const normalizedQuery = String(query || "").trim().toLowerCase();

  const results = [];
  for (const registry of registries) {
    for (const entry of registry.packages || []) {
      const haystack = [
        entry.name,
        entry.version,
        entry.description,
        ...(Array.isArray(entry.keywords) ? entry.keywords : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedQuery && !haystack.includes(normalizedQuery)) {
        continue;
      }

      results.push({
        registry: registry.name,
        registry_source: registry.source,
        name: entry.name,
        version: entry.version || null,
        author: entry.author || "",
        trust: entry.trust || null,
        description: entry.description || "",
        manifest: entry.manifest || null,
        source: entry.source || null,
      });
    }
  }

  results.sort((left, right) => {
    const nameOrder = String(left.name || "").localeCompare(String(right.name || ""));
    if (nameOrder !== 0) return nameOrder;
    return compareVersions(left.version, right.version);
  });

  return {
    projectRoot: resolvedProjectRoot,
    query,
    registries: registries.map((registry) => ({
      name: registry.name,
      source: registry.source,
      file: registry.file,
    })),
    packages: results,
  };
}

function listInstalledMacroPacks(projectRoot = process.cwd()) {
  const installIndexFile = getInstallIndexFile(path.resolve(projectRoot));
  if (!fs.existsSync(installIndexFile)) {
    return { packages: [] };
  }
  return readJson(installIndexFile);
}

function getInstalledMacroInfo(projectRoot = process.cwd(), name) {
  const packDir = path.join(getInstallDir(path.resolve(projectRoot)), sanitizeName(name));
  const manifestFile = path.join(packDir, PACK_MANIFEST_FILE);
  if (!fs.existsSync(manifestFile)) {
    throw new Error(`Installed pack not found: ${name}`);
  }
  return {
    packDir,
    manifest: readJson(manifestFile),
  };
}

function formatMacroInstallResult(label, lines) {
  return `${label}\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

module.exports = {
  PROJECT_FILE,
  REGISTRY_FILE,
  PACK_MANIFEST_FILE,
  loadProjectConfig,
  initMacroProject,
  initMacroRegistry,
  initMacroPack,
  upsertRegistryPack,
  removeRegistryPack,
  addRegistryToProject,
  removeRegistryFromProject,
  addPackageToProject,
  updatePackageInProject,
  removePackageFromProject,
  uninstallPackageFromProject,
  syncMacroProject,
  searchMacroRegistryPackages,
  listInstalledMacroPacks,
  getInstalledMacroInfo,
  formatMacroInstallResult,
  getImportIndexFile,
};
