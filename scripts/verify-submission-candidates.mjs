#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(root, 'submission-prep/submission-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const version = '0.1.0';
const repository = 'git+https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker.git';
const repositoryUrl = 'https://github.com/OpaceDigitalAgency/opace-ai-content-verification-integrity-checker';
const expectedDeveloperPackages = [
  '@opace/content-integrity-contracts',
  '@opace/content-integrity-core',
  '@opace/content-integrity-browser',
  '@opace/content-integrity-client',
  '@opace/content-integrity-cli',
];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function verify(relative, expected) {
  const path = join(root, relative);
  check(existsSync(path), `missing submission candidate: ${relative}`);
  const actual = digest(path);
  check(actual === expected, `submission hash mismatch for ${relative}: ${actual} != ${expected}`);
  return path;
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function archiveKind(path) {
  if (path.endsWith('.tar.gz') || path.endsWith('.tgz')) return 'tar';
  if (path.endsWith('.zip') || path.endsWith('.whl')) return 'zip';
  throw new Error(`unsupported archive type: ${path}`);
}

function archiveEntries(path) {
  const output = archiveKind(path) === 'tar' ? run('tar', ['-tzf', path]) : run('unzip', ['-Z1', path]);
  const entries = output.split('\n').map(value => value.trim()).filter(Boolean);
  check(entries.length > 0, `empty submission archive: ${path}`);
  for (const entry of entries) {
    check(!entry.startsWith('/') && !entry.startsWith('\\') && !/^[A-Za-z]:[\\/]/.test(entry), `absolute path in archive ${path}: ${entry}`);
    check(!entry.split(/[\\/]/).includes('..'), `path traversal in archive ${path}: ${entry}`);
    check(!entry.startsWith('__MACOSX/') && !entry.endsWith('/.DS_Store') && !entry.endsWith('.DS_Store'), `macOS metadata in archive ${path}: ${entry}`);
  }
  return entries;
}

function archivePayload(path) {
  return archiveKind(path) === 'tar' ? run('tar', ['-xOzf', path]) : run('unzip', ['-p', path]);
}

function archiveEntry(path, entry) {
  return archiveKind(path) === 'tar' ? run('tar', ['-xOzf', path, entry]) : run('unzip', ['-p', path, entry]);
}

function scanArchive(path) {
  const entries = archiveEntries(path);
  const payload = archivePayload(path);
  check(!/(?:\/Users\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\|BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20,}|npm_[A-Za-z0-9]{20,})/.test(payload), `local path, private key or credential marker in ${path}`);
  return { entries, payload };
}

function packageManifest(path) {
  const parsed = JSON.parse(archiveEntry(path, 'package/package.json'));
  check(parsed.version === version, `${parsed.name}: version is not ${version}`);
  check(parsed.private !== true, `${parsed.name}: private package cannot be published`);
  check(parsed.repository?.url === repository, `${parsed.name}: repository URL is not canonical`);
  check(parsed.bugs?.url === `${repositoryUrl}/issues`, `${parsed.name}: issue URL is not canonical`);
  check(parsed.publishConfig?.access === 'public', `${parsed.name}: public access is not explicit`);
  check(parsed.publishConfig?.provenance === true, `${parsed.name}: future provenance is not required`);
  for (const dependencyGroup of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
    for (const [name, dependencyVersion] of Object.entries(parsed[dependencyGroup] ?? {})) {
      check(!String(dependencyVersion).startsWith('file:'), `${parsed.name}: ${name} retains a file dependency`);
      if (expectedDeveloperPackages.includes(name)) check(dependencyVersion === version, `${parsed.name}: ${name} is not pinned to ${version}`);
    }
  }
  return parsed;
}

check(manifest.schema_version === '1.0', 'unsupported submission manifest schema');
check(manifest.state === 'local_candidates_frozen_not_published', 'submission manifest state is not frozen/not-published');
check(manifest.public_action_authorised === false, 'submission manifest must not authorise a public action');
check(manifest.release_source_tag === 'packages-v0.1.0', 'release source tag must not reuse historical v0.1.x tags');
check(manifest.repository.target === repositoryUrl, 'submission repository target is not canonical');
check(manifest.developer_npm.public_package_count === 5, 'developer npm package count is not five');
check(JSON.stringify(manifest.developer_npm.public_packages) === JSON.stringify(expectedDeveloperPackages), 'developer npm release set changed');
check(manifest.npm.name === '@opace/astro-content-integrity', 'Astro package is missing from the npm release set');
check(manifest.developer_npm.public_package_count + 1 === 6, 'npm release set must contain five developer packages plus Astro');
check(manifest.developer_npm.excluded_private_packages?.length === 1, 'private/demo npm package exclusion is missing');
check(manifest.developer_npm.excluded_private_packages[0]?.name === '@opace/watermark-lab', 'unexpected private/demo npm exclusion');
check(manifest.developer_npm.excluded_private_packages[0]?.state === 'private_demo_only_not_in_release_set', '@opace/watermark-lab must remain outside the release set');

const astroPath = verify(manifest.npm.candidate_file, manifest.npm.candidate_sha256);
const wheelPath = verify(manifest.pypi.wheel_file, manifest.pypi.wheel_sha256);
const sdistPath = verify(manifest.pypi.sdist_file, manifest.pypi.sdist_sha256);
const chromePath = verify(manifest.chrome.candidate_file, manifest.chrome.candidate_sha256);
const wordpressPath = verify(manifest.wordpress.candidate_file, manifest.wordpress.candidate_sha256);

const npmManifestPath = verify(manifest.developer_npm.manifest, manifest.developer_npm.manifest_sha256);
const npmManifest = JSON.parse(readFileSync(npmManifestPath, 'utf8'));
check(npmManifest.version === version, 'developer npm manifest version mismatch');
check(npmManifest.packages.length === 5, 'developer npm manifest must contain exactly five packages');
check(JSON.stringify(npmManifest.packages.map(item => item.name)) === JSON.stringify(expectedDeveloperPackages), 'developer npm archive order/set changed');

const developerArchives = new Map();
for (const item of npmManifest.packages) {
  check(item.version === version, `${item.name}: candidate manifest version mismatch`);
  const path = verify(join(dirname(manifest.developer_npm.manifest), item.file), item.sha256);
  scanArchive(path);
  const parsed = packageManifest(path);
  check(parsed.name === item.name, `${item.file}: package name does not match candidate manifest`);
  developerArchives.set(item.name, { path, parsed });
}

const astroScan = scanArchive(astroPath);
const astroPackage = packageManifest(astroPath);
check(astroPackage.name === '@opace/astro-content-integrity', 'Astro package name mismatch');
check(astroPackage.keywords?.includes('astro-integration'), 'Astro package is missing the catalogue keyword');
check(astroPackage.dependencies?.['@opace/content-integrity-browser'] === version, 'Astro browser dependency is not exact');
check(astroPackage.dependencies?.['@opace/content-integrity-contracts'] === version, 'Astro contracts dependency is not exact');
check(astroPackage.dependencies?.['@opace/content-integrity-core'] === version, 'Astro core dependency is not exact');
check(astroScan.payload.includes('c2pa_text_credential'), 'Astro exact candidate is missing the C2PA credential safe-fix guard');

const corePayload = archivePayload(developerArchives.get('@opace/content-integrity-core').path);
check(corePayload.includes('c2pa_text_credential'), 'core exact candidate is missing the C2PA credential safe-fix guard');
check(developerArchives.get('@opace/content-integrity-cli').parsed.dependencies?.['@opace/content-integrity-core'] === version, 'CLI does not close over the guarded exact core version');

const chromeScan = scanArchive(chromePath);
const chromeManifest = JSON.parse(archiveEntry(chromePath, 'manifest.json'));
check(chromeManifest.version === manifest.chrome.version, 'Chrome candidate version mismatch');
check(chromeManifest.minimum_chrome_version === '145', 'Chrome minimum version changed');
check(chromeScan.payload.includes('c2pa_text_credential'), 'Chrome exact candidate is missing the C2PA credential safe-fix guard');

const wordpressScan = scanArchive(wordpressPath);
check(wordpressScan.entries.every(entry => entry.startsWith('opace-ai-content-integrity/')), 'WordPress archive has an unexpected top-level path');
const wordpressPlugin = archiveEntry(wordpressPath, 'opace-ai-content-integrity/opace-ai-content-integrity.php');
const wordpressReadme = archiveEntry(wordpressPath, 'opace-ai-content-integrity/readme.txt');
check(wordpressPlugin.includes(` * Version: ${manifest.wordpress.version}\n`), 'WordPress plugin header version mismatch');
check(wordpressPlugin.includes(`OPACE_CONTENT_INTEGRITY_VERSION', '${manifest.wordpress.version}'`), 'WordPress runtime version mismatch');
check(wordpressReadme.includes(`Stable tag: ${manifest.wordpress.version}\n`), 'WordPress stable tag mismatch');
check(wordpressScan.payload.includes('c2pa_text_credential'), 'WordPress exact candidate is missing the C2PA credential safe-fix guard');
const expectedWordpressLine = readFileSync(join(root, manifest.wordpress.expected_sha256_file), 'utf8').trim();
check(expectedWordpressLine === `${manifest.wordpress.candidate_sha256}  opace-ai-content-integrity-${manifest.wordpress.version}.zip`, 'tracked WordPress expected SHA does not match the canonical manifest');

const wheelScan = scanArchive(wheelPath);
const wheelMetadataPath = wheelScan.entries.find(entry => entry.endsWith('.dist-info/METADATA'));
check(wheelMetadataPath, 'Python wheel metadata is missing');
const wheelMetadata = archiveEntry(wheelPath, wheelMetadataPath);
check(wheelMetadata.includes('Name: opace-content-integrity\n'), 'Python wheel name mismatch');
check(wheelMetadata.includes(`Version: ${version}\n`), 'Python wheel version mismatch');
check(wheelMetadata.includes(`Project-URL: Source, ${repositoryUrl}\n`), 'Python wheel source URL is not canonical');
check(wheelMetadata.includes(`Project-URL: Issues, ${repositoryUrl}/issues\n`), 'Python wheel issue URL is not canonical');

const sdistScan = scanArchive(sdistPath);
const sdistMetadataPath = sdistScan.entries.find(entry => entry.endsWith('/PKG-INFO'));
check(sdistMetadataPath, 'Python sdist metadata is missing');
const sdistMetadata = archiveEntry(sdistPath, sdistMetadataPath);
check(sdistMetadata.includes('Name: opace-content-integrity\n'), 'Python sdist name mismatch');
check(sdistMetadata.includes(`Version: ${version}\n`), 'Python sdist version mismatch');
check(sdistMetadata.includes(`Project-URL: Source, ${repositoryUrl}\n`), 'Python sdist source URL is not canonical');
check(manifest.pypi.c2pa_credential_guard === 'not_applicable_model_free_control_plane_without_safe_fix_api', 'Python C2PA guard boundary is not explicit');

console.log('Submission candidates passed: 5 developer npm + Astro + Python wheel/sdist + Chrome + WordPress.');
console.log('Exact hashes, archive safety, public metadata, dependency closure and applicable C2PA safe-fix guards passed.');
