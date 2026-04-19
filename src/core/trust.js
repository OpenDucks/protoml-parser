const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const { tokenize } = require("./tokenizer");
const { parseBlocks } = require("./blockParser");
const { resolveMacroPath } = require("../cli/options");
const { BUILTIN_MACRO_DIR, BUILTIN_MACRO_HASHES } = require("./builtinMacroTrust");

const SIGNATURE_SUFFIX = ".sig.json";

function normalizeFileRef(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
}

function isUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/");
}

function getSignatureFilePath(filePath) {
  return `${filePath}${SIGNATURE_SUFFIX}`;
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function normalizeRegistrySource(source, baseDir = process.cwd()) {
  if (!source) return null;

  if (typeof source === "string") {
    return {
      source,
      local: !isUrl(source),
      resolvedSource: isUrl(source) ? source : path.resolve(baseDir, source),
    };
  }

  const rawSource = source.source || source.path || source.url;
  if (!rawSource) return null;
  const effectiveBaseDir = source.baseDir || baseDir;

  return {
    source: rawSource,
    local: !isUrl(rawSource),
    resolvedSource: isUrl(rawSource) ? rawSource : path.resolve(effectiveBaseDir, rawSource),
  };
}

function resolveRegistryFilePath(normalizedSource) {
  if (!normalizedSource || !normalizedSource.local) {
    return null;
  }

  const resolved = normalizedSource.resolvedSource;
  if (!fs.existsSync(resolved)) {
    return null;
  }

  if (fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, "protoml.registry.json");
  }

  return resolved;
}

function loadRegistrySourceSync(source, baseDir = process.cwd()) {
  const normalized = normalizeRegistrySource(source, baseDir);
  if (!normalized) return null;
  if (!normalized.local) {
    return {
      source: normalized.source,
      authors: [],
      skipped: true,
      reason: "Remote trust sources require the explicit trust/verify command.",
    };
  }

  const registryFile = resolveRegistryFilePath(normalized);
  if (!registryFile || !fs.existsSync(registryFile)) {
    return {
      source: normalized.source,
      authors: [],
      skipped: true,
      reason: "Registry file not found.",
    };
  }

  const raw = safeReadJson(registryFile) || {};
  return {
    source: normalized.source,
    file: registryFile,
    authors: Array.isArray(raw.authors) ? raw.authors : [],
    raw,
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

async function loadRegistrySourceAsync(source, baseDir = process.cwd()) {
  const normalized = normalizeRegistrySource(source, baseDir);
  if (!normalized) return null;

  if (normalized.local) {
    return loadRegistrySourceSync(source, baseDir);
  }

  const raw = await fetchJson(normalized.resolvedSource);
  return {
    source: normalized.source,
    file: normalized.resolvedSource,
    authors: Array.isArray(raw.authors) ? raw.authors : [],
    raw,
  };
}

function findNearestProjectRegistryConfig(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir);

  while (true) {
    const configFile = path.join(currentDir, "protoml.macros.json");
    if (fs.existsSync(configFile)) {
      return configFile;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function gatherDefaultRegistrySources(baseDir = process.cwd()) {
  const configFile = findNearestProjectRegistryConfig(baseDir);
  if (!configFile) {
    return [];
  }

  const config = safeReadJson(configFile) || {};
  if (!Array.isArray(config.registries)) {
    return [];
  }
  const configDir = path.dirname(configFile);

  return config.registries.map((entry) => {
    if (typeof entry === "string") {
      return { source: entry, baseDir: configDir };
    }

    if (entry && typeof entry === "object") {
      const source = entry.source || entry.path || entry.url;
      return source ? { ...entry, source, baseDir: configDir } : entry;
    }

    return entry;
  }).filter(Boolean);
}

function dedupeRegistrySources(sources) {
  const seen = new Set();
  const result = [];

  for (const source of Array.isArray(sources) ? sources : []) {
    const key = typeof source === "string"
      ? source
      : JSON.stringify(source);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(source);
  }

  return result;
}

function getDefaultRegistryBaseDir(filePath, fallbackDir = process.cwd()) {
  if (!filePath) {
    return fallbackDir;
  }

  const absoluteFile = path.resolve(filePath);
  return fs.existsSync(absoluteFile) && fs.statSync(absoluteFile).isDirectory()
    ? absoluteFile
    : path.dirname(absoluteFile);
}

function resolveConfiguredRegistrySources(filePath, options = {}) {
  const explicitSources = Array.isArray(options.registrySources) ? options.registrySources : [];
  const discoveredSources = options.includeProjectRegistries === false
    ? []
    : gatherDefaultRegistrySources(getDefaultRegistryBaseDir(filePath, process.cwd()));

  return dedupeRegistrySources([
    ...explicitSources,
    ...discoveredSources,
  ]);
}

function normalizePublicKeyPem(value) {
  return String(value || "").replace(/\r/g, "").trim();
}

function findAuthorTrust(signatureInfo, registrySources) {
  if (!signatureInfo || signatureInfo.status !== "valid") {
    return {
      author: signatureInfo?.author || null,
      author_trust: "unknown",
      matched_registry: null,
      matched_key: null,
    };
  }

  const signatureKey = normalizePublicKeyPem(signatureInfo.public_key_pem);
  for (const registry of registrySources || []) {
    for (const author of registry.authors || []) {
      if (String(author.name || "").trim() !== String(signatureInfo.author || "").trim()) {
        continue;
      }

      const keys = Array.isArray(author.keys)
        ? author.keys
        : Array.isArray(author.public_keys)
          ? author.public_keys
          : [];

      for (const key of keys) {
        const keyPem = normalizePublicKeyPem(key.public_key || key.pem || key.value);
        const keyId = key.id || key.key_id || null;
        const keyMatches = signatureKey && keyPem && signatureKey === keyPem;
        const idMatches = signatureInfo.key_id && keyId && signatureInfo.key_id === keyId;

        if (!keyMatches && !idMatches) {
          continue;
        }

        return {
          author: author.name,
          author_trust: ["trusted", "untrusted", "unknown"].includes(author.trust)
            ? author.trust
            : "unknown",
          matched_registry: registry.source || registry.file || null,
          matched_key: keyId,
        };
      }
    }
  }

  return {
    author: signatureInfo.author || null,
    author_trust: "unknown",
    matched_registry: null,
    matched_key: null,
  };
}

function readSignatureFile(filePath, type) {
  const signatureFile = getSignatureFilePath(filePath);
  if (!fs.existsSync(signatureFile)) {
    return {
      status: "missing",
      signature_file: signatureFile,
      author: null,
      key_id: null,
      algorithm: null,
      public_key_pem: null,
      sha256: null,
    };
  }

  const payload = safeReadJson(signatureFile);
  if (!payload || typeof payload !== "object") {
    return {
      status: "invalid",
      signature_file: signatureFile,
      error: "Signature file is not valid JSON.",
      author: null,
      key_id: null,
      algorithm: null,
      public_key_pem: null,
      sha256: null,
    };
  }

  if (payload.type && payload.type !== type) {
    return {
      status: "invalid",
      signature_file: signatureFile,
      error: `Signature type mismatch: expected ${type}, got ${payload.type}.`,
      author: payload.author || null,
      key_id: payload.key_id || null,
      algorithm: payload.algorithm || null,
      public_key_pem: payload.public_key_pem || null,
      sha256: payload.sha256 || null,
    };
  }

  return {
    status: "present",
    signature_file: signatureFile,
    payload,
    author: payload.author || null,
    key_id: payload.key_id || null,
    algorithm: payload.algorithm || null,
    public_key_pem: payload.public_key_pem || null,
    sha256: payload.sha256 || null,
  };
}

function verifyDetachedSignature(filePath, type) {
  const signatureInfo = readSignatureFile(filePath, type);
  if (signatureInfo.status !== "present") {
    return signatureInfo;
  }

  const payload = signatureInfo.payload;
  const fileBuffer = fs.readFileSync(filePath);
  const actualHash = sha256Buffer(fileBuffer);
  const expectedHash = String(payload.sha256 || "");

  if (!payload.public_key_pem || !payload.signature || !payload.author) {
    return {
      ...signatureInfo,
      status: "invalid",
      error: "Signature payload is missing required fields.",
      actual_sha256: actualHash,
    };
  }

  if (expectedHash !== actualHash) {
    return {
      ...signatureInfo,
      status: "invalid",
      error: "File hash does not match signature payload.",
      actual_sha256: actualHash,
    };
  }

  const canonical = JSON.stringify({
    type,
    file: path.basename(filePath),
    sha256: actualHash,
    author: payload.author,
    key_id: payload.key_id || "",
  });

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(canonical);
  verifier.end();

  let verified = false;
  try {
    verified = verifier.verify(payload.public_key_pem, Buffer.from(payload.signature, "base64"));
  } catch (error) {
    return {
      ...signatureInfo,
      status: "invalid",
      error: error.message,
      actual_sha256: actualHash,
    };
  }

  return {
    ...signatureInfo,
    status: verified ? "valid" : "invalid",
    error: verified ? null : "Cryptographic signature verification failed.",
    actual_sha256: actualHash,
  };
}

function resolveMacroFilePath(baseDir, file) {
  const projectMacroBase = path.resolve(__dirname, "..", "..", "macros");
  const normalized = resolveMacroPath(String(file || ""), projectMacroBase);

  if (path.isAbsolute(normalized)) {
    return normalized;
  }

  return path.resolve(baseDir, normalizeFileRef(normalized));
}

function detectMacroRiskFlags(source) {
  const text = String(source || "");
  return {
    html_capable: /<[a-z][^>]*>/i.test(text),
    contains_script: /<script\b|javascript:|on[a-z]+\s*=/i.test(text),
    contains_external_urls: /https?:\/\//i.test(text),
  };
}

function getBuiltinMacroStatus(filePath) {
  if (!filePath) {
    return { status: "external", relative_path: null, expected_sha256: null, actual_sha256: null };
  }

  const absoluteFile = path.resolve(filePath);
  const relativePath = normalizeRelativePath(path.relative(BUILTIN_MACRO_DIR, absoluteFile));
  const insideBuiltinDir = relativePath && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

  if (!insideBuiltinDir) {
    return { status: "external", relative_path: null, expected_sha256: null, actual_sha256: null };
  }

  const expectedHash = BUILTIN_MACRO_HASHES[relativePath];
  if (!expectedHash) {
    return { status: "builtin_unlisted", relative_path: relativePath, expected_sha256: null, actual_sha256: null };
  }

  if (!fs.existsSync(absoluteFile)) {
    return { status: "builtin_missing", relative_path: relativePath, expected_sha256: expectedHash, actual_sha256: null };
  }

  const actualHash = sha256Buffer(fs.readFileSync(absoluteFile));
  if (actualHash !== expectedHash) {
    return {
      status: "builtin_modified",
      relative_path: relativePath,
      expected_sha256: expectedHash,
      actual_sha256: actualHash,
    };
  }

  return {
    status: "builtin_trusted",
    relative_path: relativePath,
    expected_sha256: expectedHash,
    actual_sha256: actualHash,
  };
}

function deriveMacroTrust(flags, signatureStatus, authorTrust, builtinStatus = "external") {
  const reasons = [];

  if (flags.contains_script) reasons.push("contains_script");
  if (flags.contains_external_urls) reasons.push("contains_external_urls");
  if (signatureStatus === "invalid") reasons.push("invalid_signature");
  if (builtinStatus === "builtin_modified") reasons.push("builtin_modified");
  if (signatureStatus === "missing") reasons.push("unsigned");
  if (authorTrust === "untrusted") reasons.push("author_marked_untrusted");
  if (authorTrust === "unknown" && signatureStatus === "valid") reasons.push("author_not_listed");

  if (
    flags.contains_script ||
    flags.contains_external_urls ||
    signatureStatus === "invalid" ||
    authorTrust === "untrusted" ||
    builtinStatus === "builtin_modified"
  ) {
    return { level: "untrusted", reasons };
  }

  if (builtinStatus === "builtin_trusted") {
    return { level: "trusted", reasons };
  }

  if (signatureStatus === "valid" && authorTrust === "trusted") {
    return { level: "trusted", reasons };
  }

  return { level: "unknown", reasons };
}

function derivePmlTrust(signatureStatus, authorTrust, macros, imports) {
  const reasons = [];
  const hasUntrustedMacro = (macros || []).some((entry) => entry.effective_trust === "untrusted");
  const hasUntrustedImport = (imports || []).some((entry) => entry.effective_trust === "untrusted");

  if (hasUntrustedMacro) reasons.push("uses_untrusted_macros");
  if (hasUntrustedImport) reasons.push("imports_untrusted_pml");
  if (signatureStatus === "invalid") reasons.push("invalid_signature");
  if (signatureStatus === "missing") reasons.push("unsigned");
  if (authorTrust === "untrusted") reasons.push("author_marked_untrusted");
  if (authorTrust === "unknown" && signatureStatus === "valid") reasons.push("author_not_listed");

  if (hasUntrustedMacro || hasUntrustedImport || signatureStatus === "invalid" || authorTrust === "untrusted") {
    return { level: "untrusted", reasons };
  }

  if (signatureStatus === "valid" && authorTrust === "trusted") {
    return { level: "trusted", reasons };
  }

  return { level: "unknown", reasons };
}

function findRegisteredMacros(ast, baseDir, ownerFile) {
  const registered = [];

  for (const [name, entry] of Object.entries(ast.inline_macros || {})) {
    registered.push({
      alias: name,
      actual_name: name,
      path: `${ownerFile}:${entry.line || 0}`,
      inline: true,
      template: entry.template || "",
      line: entry.line || 0,
    });
  }

  for (const [alias, file] of Object.entries(ast.macros || {})) {
    const fullPath = resolveMacroFilePath(baseDir, file);
    registered.push({
      alias,
      actual_name: alias,
      path: fullPath,
      inline: false,
      file: normalizeFileRef(file),
    });
  }

  for (const importFile of Array.isArray(ast.macros_import) ? ast.macros_import : []) {
    const fullPath = path.resolve(baseDir, normalizeFileRef(importFile));
    if (!fs.existsSync(fullPath)) continue;
    const importedAst = parseBlocks(tokenize(fs.readFileSync(fullPath, "utf8")));
    for (const [alias, file] of Object.entries(importedAst.macros || {})) {
      const macroPath = resolveMacroFilePath(path.dirname(fullPath), file);
      registered.push({
        alias,
        actual_name: alias,
        path: macroPath,
        inline: false,
        file: normalizeFileRef(file),
        via_import: normalizeFileRef(importFile),
      });
    }
  }

  return registered;
}

function findUsedMacroNames(ast) {
  const used = new Set();
  for (const line of Array.isArray(ast.meeting) ? ast.meeting : []) {
    const text = String(line || "");
    for (const match of text.matchAll(/@@macro=([\w-]+):?/g)) {
      used.add(match[1]);
    }
  }
  return used;
}

function analyzeMacroEntry(entry, registrySources) {
  const source = entry.inline
    ? String(entry.template || "")
    : fs.existsSync(entry.path)
      ? fs.readFileSync(entry.path, "utf8")
      : "";

  const flags = detectMacroRiskFlags(entry.inline ? entry.template : source);
  const signature = entry.inline
    ? {
        status: "missing",
        signature_file: null,
        author: null,
        key_id: null,
        algorithm: null,
        public_key_pem: null,
        sha256: null,
      }
    : verifyDetachedSignature(entry.path, "macro");
  const builtin = entry.inline
    ? { status: "inline", relative_path: null, expected_sha256: null, actual_sha256: null }
    : getBuiltinMacroStatus(entry.path);
  const authorInfo = findAuthorTrust(signature, registrySources);
  const derivedAuthorTrust = builtin.status === "builtin_trusted"
    ? "trusted"
    : authorInfo.author_trust;
  const trust = deriveMacroTrust(flags, signature.status, derivedAuthorTrust, builtin.status);

  return {
    alias: entry.alias,
    actual_name: entry.actual_name,
    path: entry.path,
    inline: entry.inline,
    via_import: entry.via_import || null,
    flags,
    signature_status: signature.status,
    signature_file: signature.signature_file || null,
    author: authorInfo.author || signature.author || null,
    author_trust: derivedAuthorTrust,
    matched_registry: authorInfo.matched_registry,
    matched_key: authorInfo.matched_key,
    builtin_status: builtin.status,
    builtin_relative_path: builtin.relative_path,
    effective_trust: trust.level,
    reasons: trust.reasons,
  };
}

function analyzePmlTrustSync(filename, options = {}, visited = new Set()) {
  const fullPath = path.resolve(filename);
  const baseDir = path.dirname(fullPath);
  const raw = fs.readFileSync(fullPath, "utf8");
  const ast = parseBlocks(tokenize(raw));
  const visitKey = fullPath.toLowerCase();

  if (visited.has(visitKey)) {
    return {
      path: fullPath,
      type: "pml",
      effective_trust: "unknown",
      signature_status: "missing",
      author: null,
      author_trust: "unknown",
      reasons: ["recursive_import_cycle"],
      macros: [],
      imports: [],
      registry_sources: [],
      skipped: true,
    };
  }

  visited.add(visitKey);

  const configuredSources = resolveConfiguredRegistrySources(fullPath, options);
  const registrySources = configuredSources
    .map((source) => loadRegistrySourceSync(source, process.cwd()))
    .filter(Boolean);

  const registeredMacros = findRegisteredMacros(ast, baseDir, fullPath);
  const usedMacroNames = findUsedMacroNames(ast);
  const macros = registeredMacros
    .filter((entry) => usedMacroNames.has(entry.alias) || usedMacroNames.has(entry.actual_name))
    .map((entry) => analyzeMacroEntry(entry, registrySources));

  const imports = [];
  for (const [name, entry] of Object.entries(ast.imports || {})) {
    const format = String(entry.format || "text").toLowerCase();
    if (format !== "pml") continue;
    const importPath = path.resolve(baseDir, normalizeFileRef(entry.file));
    if (!fs.existsSync(importPath)) {
      imports.push({
        name,
        path: importPath,
        type: "pml",
        effective_trust: "untrusted",
        signature_status: "missing",
        author: null,
        author_trust: "unknown",
        reasons: ["missing_import"],
      });
      continue;
    }

    imports.push({
      name,
      ...analyzePmlTrustSync(importPath, options, visited),
    });
  }

  const signature = verifyDetachedSignature(fullPath, "pml");
  const authorInfo = findAuthorTrust(signature, registrySources);
  const trust = derivePmlTrust(signature.status, authorInfo.author_trust, macros, imports);

  return {
    path: fullPath,
    type: "pml",
    effective_trust: trust.level,
    signature_status: signature.status,
    signature_file: signature.signature_file || null,
    author: authorInfo.author || signature.author || null,
    author_trust: authorInfo.author_trust,
    matched_registry: authorInfo.matched_registry,
    matched_key: authorInfo.matched_key,
    reasons: trust.reasons,
    macros,
    imports,
    registry_sources: registrySources.map((entry) => ({
      source: entry.source || null,
      file: entry.file || null,
      skipped: Boolean(entry.skipped),
      reason: entry.reason || null,
    })),
  };
}

async function analyzePmlTrust(filename, options = {}) {
  const fullPath = path.resolve(filename);
  const baseDir = path.dirname(fullPath);
  const raw = fs.readFileSync(fullPath, "utf8");
  const ast = parseBlocks(tokenize(raw));
  const registrySourceInputs = resolveConfiguredRegistrySources(fullPath, options);
  const registrySources = (await Promise.all(
    registrySourceInputs.map((source) => loadRegistrySourceAsync(source, process.cwd()).catch((error) => ({
      source: typeof source === "string" ? source : source?.source || null,
      authors: [],
      skipped: true,
      reason: error.message,
    })))
  )).filter(Boolean);

  const registeredMacros = findRegisteredMacros(ast, baseDir, fullPath);
  const usedMacroNames = findUsedMacroNames(ast);
  const macros = registeredMacros
    .filter((entry) => usedMacroNames.has(entry.alias) || usedMacroNames.has(entry.actual_name))
    .map((entry) => analyzeMacroEntry(entry, registrySources));

  const imports = [];
  for (const [name, entry] of Object.entries(ast.imports || {})) {
    const format = String(entry.format || "text").toLowerCase();
    if (format !== "pml") continue;
    const importPath = path.resolve(baseDir, normalizeFileRef(entry.file));
    if (!fs.existsSync(importPath)) {
      imports.push({
        name,
        path: importPath,
        type: "pml",
        effective_trust: "untrusted",
        signature_status: "missing",
        author: null,
        author_trust: "unknown",
        reasons: ["missing_import"],
      });
      continue;
    }

    imports.push({
      name,
      ...analyzePmlTrustSync(importPath, { ...options, registrySources: registrySourceInputs }),
    });
  }

  const signature = verifyDetachedSignature(fullPath, "pml");
  const authorInfo = findAuthorTrust(signature, registrySources);
  const trust = derivePmlTrust(signature.status, authorInfo.author_trust, macros, imports);

  return {
    path: fullPath,
    type: "pml",
    effective_trust: trust.level,
    signature_status: signature.status,
    signature_file: signature.signature_file || null,
    author: authorInfo.author || signature.author || null,
    author_trust: authorInfo.author_trust,
    matched_registry: authorInfo.matched_registry,
    matched_key: authorInfo.matched_key,
    reasons: trust.reasons,
    macros,
    imports,
    registry_sources: registrySources.map((entry) => ({
      source: entry.source || null,
      file: entry.file || null,
      skipped: Boolean(entry.skipped),
      reason: entry.reason || null,
    })),
  };
}

function signFile(filePath, type, privateKeyPath, author, keyId = "") {
  const absoluteFile = path.resolve(filePath);
  const absoluteKey = path.resolve(privateKeyPath);

  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`File not found: ${absoluteFile}`);
  }
  if (!fs.existsSync(absoluteKey)) {
    throw new Error(`Private key not found: ${absoluteKey}`);
  }
  if (!author) {
    throw new Error("Author is required for signing.");
  }

  const fileBuffer = fs.readFileSync(absoluteFile);
  const sha256 = sha256Buffer(fileBuffer);
  const privateKeyPem = fs.readFileSync(absoluteKey, "utf8");
  const publicKeyPem = crypto.createPublicKey(privateKeyPem).export({ type: "spki", format: "pem" }).toString();
  const payload = {
    version: 1,
    type,
    file: path.basename(absoluteFile),
    sha256,
    author,
    key_id: keyId || "",
    algorithm: "rsa-sha256",
    signed_at: new Date().toISOString(),
    public_key_pem: publicKeyPem,
  };

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(JSON.stringify({
    type: payload.type,
    file: payload.file,
    sha256: payload.sha256,
    author: payload.author,
    key_id: payload.key_id,
  }));
  signer.end();

  payload.signature = signer.sign(privateKeyPem).toString("base64");

  const targetFile = getSignatureFilePath(absoluteFile);
  fs.writeFileSync(targetFile, JSON.stringify(payload, null, 2) + "\n", "utf8");

  return {
    file: absoluteFile,
    signature_file: targetFile,
    sha256,
    author,
    key_id: keyId || "",
    type,
  };
}

function verifyFileTrustSync(filePath, type, options = {}) {
  const absoluteFile = path.resolve(filePath);
  const configuredSources = resolveConfiguredRegistrySources(absoluteFile, options);
  const registrySources = configuredSources
    .map((source) => loadRegistrySourceSync(source, process.cwd()))
    .filter(Boolean);

  const signature = verifyDetachedSignature(absoluteFile, type);
  const authorInfo = findAuthorTrust(signature, registrySources);
  const builtin = type === "macro"
    ? getBuiltinMacroStatus(absoluteFile)
    : { status: "external", relative_path: null };

  return {
    path: absoluteFile,
    type,
    signature_status: signature.status,
    signature_file: signature.signature_file || null,
    author: authorInfo.author || signature.author || null,
    author_trust: authorInfo.author_trust,
    matched_registry: authorInfo.matched_registry,
    matched_key: authorInfo.matched_key,
    builtin_status: builtin.status,
    builtin_relative_path: builtin.relative_path,
    sha256: signature.actual_sha256 || signature.sha256 || null,
    error: signature.error || null,
    registry_sources: registrySources.map((entry) => ({
      source: entry.source || null,
      file: entry.file || null,
      skipped: Boolean(entry.skipped),
      reason: entry.reason || null,
    })),
  };
}

async function verifyFileTrust(filePath, type, options = {}) {
  const absoluteFile = path.resolve(filePath);
  const configuredSources = resolveConfiguredRegistrySources(absoluteFile, options);
  const registrySources = (await Promise.all(
    configuredSources.map((source) => loadRegistrySourceAsync(source, process.cwd()).catch((error) => ({
      source: typeof source === "string" ? source : source?.source || null,
      authors: [],
      skipped: true,
      reason: error.message,
    })))
  )).filter(Boolean);

  const signature = verifyDetachedSignature(absoluteFile, type);
  const authorInfo = findAuthorTrust(signature, registrySources);
  const builtin = type === "macro"
    ? getBuiltinMacroStatus(absoluteFile)
    : { status: "external", relative_path: null };

  return {
    path: absoluteFile,
    type,
    signature_status: signature.status,
    signature_file: signature.signature_file || null,
    author: authorInfo.author || signature.author || null,
    author_trust: authorInfo.author_trust,
    matched_registry: authorInfo.matched_registry,
    matched_key: authorInfo.matched_key,
    builtin_status: builtin.status,
    builtin_relative_path: builtin.relative_path,
    sha256: signature.actual_sha256 || signature.sha256 || null,
    error: signature.error || null,
    registry_sources: registrySources.map((entry) => ({
      source: entry.source || null,
      file: entry.file || null,
      skipped: Boolean(entry.skipped),
      reason: entry.reason || null,
    })),
  };
}

function formatTrustReport(report, verbosity = 0) {
  const lines = [];
  lines.push(`Trust report: ${report.path}`);
  lines.push(`Type: ${report.type}`);
  lines.push(`Effective trust: ${report.effective_trust}`);
  lines.push(`Signature: ${report.signature_status}`);
  lines.push(`Author: ${report.author || "(none)"}`);
  lines.push(`Author trust: ${report.author_trust || "unknown"}`);

  if (report.reasons?.length) {
    lines.push(`Reasons: ${report.reasons.join(", ")}`);
  }

  if (verbosity >= 1 && Array.isArray(report.macros)) {
    const counts = report.macros.reduce((acc, entry) => {
      acc[entry.effective_trust] = (acc[entry.effective_trust] || 0) + 1;
      return acc;
    }, {});
    lines.push(`Macros: ${report.macros.length}`);
    if (Object.keys(counts).length) {
      lines.push(`Macro trust counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(", ")}`);
    }
  }

  if (verbosity >= 1 && Array.isArray(report.imports) && report.imports.length) {
    lines.push(`Imported PML files: ${report.imports.length}`);
  }

  if (verbosity >= 2 && Array.isArray(report.macros) && report.macros.length) {
    lines.push("Macros:");
    for (const entry of report.macros) {
      const flags = Object.entries(entry.flags || {})
        .filter(([, value]) => value)
        .map(([key]) => key);
      const builtin = entry.builtin_status && entry.builtin_status !== "external" && entry.builtin_status !== "inline"
        ? `, builtin=${entry.builtin_status}`
        : "";
      lines.push(`- ${entry.alias}: ${entry.effective_trust} (signature=${entry.signature_status}, author=${entry.author_trust}${builtin}${flags.length ? `, flags=${flags.join("|")}` : ""})`);
    }
  }

  if (verbosity >= 2 && Array.isArray(report.imports) && report.imports.length) {
    lines.push("Imported PML:");
    for (const entry of report.imports) {
      lines.push(`- ${entry.name}: ${entry.effective_trust} (${entry.path})`);
    }
  }

  if (verbosity >= 3 && Array.isArray(report.registry_sources) && report.registry_sources.length) {
    lines.push("Registry sources:");
    for (const entry of report.registry_sources) {
      lines.push(`- ${entry.source || entry.file || "(unknown)"}${entry.skipped ? ` skipped=${entry.reason}` : ""}`);
    }
  }

  return lines.join("\n");
}

function formatVerificationReport(report) {
  const lines = [];
  lines.push(`Verification: ${report.path}`);
  lines.push(`Type: ${report.type}`);
  lines.push(`Signature: ${report.signature_status}`);
  lines.push(`Author: ${report.author || "(none)"}`);
  lines.push(`Author trust: ${report.author_trust || "unknown"}`);
  if (report.type === "macro" && report.builtin_status && report.builtin_status !== "external") {
    lines.push(`Built-in macro status: ${report.builtin_status}${report.builtin_relative_path ? ` (${report.builtin_relative_path})` : ""}`);
  }
  if (report.sha256) lines.push(`SHA256: ${report.sha256}`);
  if (report.signature_file) lines.push(`Signature file: ${report.signature_file}`);
  if (report.matched_registry) lines.push(`Matched registry: ${report.matched_registry}`);
  if (report.error) lines.push(`Error: ${report.error}`);
  return lines.join("\n");
}

module.exports = {
  analyzePmlTrustSync,
  analyzePmlTrust,
  signFile,
  verifyFileTrustSync,
  verifyFileTrust,
  formatTrustReport,
  formatVerificationReport,
  getSignatureFilePath,
};
