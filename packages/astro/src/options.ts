import { isAbsolute } from 'node:path';

export interface ContentIntegrityAstroOptions {
  toolbar?: boolean;
  buildCheck?: 'report' | false;
  failOn?: Array<'protected_fact_changed'>;
  localService?: false;
  reportDirectory?: string;
  include?: string[];
  exclude?: string[];
  maxCharacters?: number;
}

export interface NormalisedOptions {
  toolbar: boolean;
  buildCheck: 'report' | false;
  failOn: Array<'protected_fact_changed'>;
  localService: false;
  reportDirectory: string;
  include: string[];
  exclude: string[];
  maxCharacters: number;
}

const KEYS = new Set(['toolbar', 'buildCheck', 'failOn', 'localService', 'reportDirectory', 'include', 'exclude', 'maxCharacters']);
const TOKEN = /(token|secret|password|api[_-]?key|bearer)/iu;
const REMOTE = /^(?:https?:|wss?:|ftp:)/iu;

function unsafeLocalPath(value: string): boolean {
  return REMOTE.test(value) || isAbsolute(value) || value.includes('\\') || value.split('/').some((segment) => segment === '..' || segment === '.');
}

export function normaliseOptions(value: ContentIntegrityAstroOptions = {}): NormalisedOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Options must be an object.');
  for (const key of Object.keys(value)) {
    if (!KEYS.has(key)) throw new TypeError(`Unknown option: ${key}`);
    if (TOKEN.test(key)) throw new TypeError('Secret-shaped options are forbidden.');
  }
  if (value.toolbar !== undefined && typeof value.toolbar !== 'boolean') throw new TypeError('toolbar must be boolean.');
  if (value.buildCheck !== undefined && value.buildCheck !== false && value.buildCheck !== 'report') throw new TypeError("buildCheck must be 'report' or false; fail-build mode is unavailable in this candidate.");
  if (value.localService !== undefined && value.localService !== false) throw new TypeError('localService must be false; no local-service client is included in this candidate.');
  if (value.failOn !== undefined && (!Array.isArray(value.failOn) || value.failOn.some((rule) => rule !== 'protected_fact_changed'))) throw new TypeError("failOn may contain only 'protected_fact_changed'. Writing-pattern and AI-likelihood rules can never fail a build.");
  if (value.reportDirectory !== undefined) {
    if (typeof value.reportDirectory !== 'string' || !value.reportDirectory.trim()) throw new TypeError('reportDirectory must be a non-empty relative path.');
    if (unsafeLocalPath(value.reportDirectory)) throw new TypeError('reportDirectory must be a project-relative child path without traversal or backslashes.');
    if (TOKEN.test(value.reportDirectory)) throw new TypeError('Secret-shaped report paths are forbidden.');
  }
  for (const key of ['include', 'exclude'] as const) {
    const candidate = value[key];
    if (candidate !== undefined && (!Array.isArray(candidate) || candidate.some((item) => typeof item !== 'string' || !item.trim() || unsafeLocalPath(item)))) throw new TypeError(`${key} must contain non-empty project-local patterns without traversal or backslashes.`);
  }
  if (value.maxCharacters !== undefined && (!Number.isInteger(value.maxCharacters) || value.maxCharacters < 1 || value.maxCharacters > 50_000)) throw new TypeError('maxCharacters must be an integer from 1 to 50000.');
  return {
    toolbar: value.toolbar ?? true,
    buildCheck: value.buildCheck ?? 'report',
    failOn: value.failOn ?? ['protected_fact_changed'],
    localService: false,
    reportDirectory: value.reportDirectory ?? 'content-integrity-report',
    include: value.include ?? ['**/*.html'],
    exclude: value.exclude ?? ['**/404.html', '**/500.html', '**/feed*.html', '**/search*.html', '**/sitemap*.html'],
    maxCharacters: value.maxCharacters ?? 50_000,
  };
}
