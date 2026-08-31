"""Git-based sources: clone, pin the last pre-2022 commit, ingest native
Markdown. Exact-dated provenance (git history) -> H1.

Repos (licence verified from the LICENSE file AT THE PINNED COMMIT; a repo
is skipped if the expected licence text is not found):
  github/docs                      CC BY 4.0 (content)   GREEN  developer-docs
  18F/content-guide                CC0 1.0               GREEN  business-guide
  18F/methods                     CC0 1.0               GREEN  business-guide
  18F/ux-guide                    CC0 1.0               GREEN  business-guide
  18F/agile                       CC0 1.0               GREEN  business-guide
  MicrosoftDocs/microsoft-style-guide  CC BY 4.0 expected     GREEN  howto-guide
  gitlab-com/www-gitlab-com (source/handbook, sparse)  CC BY-SA 4.0  AMBER business-guide
  mdn/content (files/en-us/learn, sparse)              CC BY-SA 2.5+ AMBER developer-docs

Usage: python3 fetch_git_sources.py [repo-key ...]
Clones go to the session scratchpad, not the repository.
"""
import json
import os
import re
import subprocess
import sys
import time

from fetch_lib import quality_ok, doc_id, append_jsonl, RAW

SCRATCH = os.environ.get(
    "CORPUS_SCRATCH",
    "/private/tmp/claude-501/-Users-davidbryan-Dropbox-Opace-Sales-Marketing-"
    "other-plugins/1d592235-dd08-4ba1-b509-863f36dbce59/scratchpad/git-src")
os.makedirs(SCRATCH, exist_ok=True)
CUTOFF = "2022-01-01"

REPOS = {
    "github-docs": {
        "url": "https://github.com/github/docs.git",
        "subdir": "content", "sparse": None,
        "licence": "CC BY 4.0 (github/docs content licence)",
        "licence_re": r"Attribution 4\.0|CC-BY-4\.0|CC BY 4\.0",
        "licence_files": ["LICENSE", "content/LICENSE", "LICENSE-CODE"],
        "register": "developer-docs", "bucket": "GREEN", "target": 400,
        "web": "https://github.com/github/docs/blob/{sha}/{path}",
    },
    "18f-content-guide": {
        "url": "https://github.com/18F/content-guide.git",
        "subdir": "_pages", "sparse": None,
        "licence": "CC0 1.0 (public domain dedication)",
        "licence_re": r"CC0|public domain",
        "licence_files": ["LICENSE.md", "LICENSE"],
        "register": "business-guide", "bucket": "GREEN", "target": 120,
        "web": "https://github.com/18F/content-guide/blob/{sha}/{path}",
    },
    "18f-methods": {
        "url": "https://github.com/18F/methods.git",
        "subdir": "_methods", "sparse": None,
        "licence": "CC0 1.0 (public domain dedication)",
        "licence_re": r"CC0|public domain",
        "licence_files": ["LICENSE.md", "LICENSE"],
        "register": "business-guide", "bucket": "GREEN", "target": 80,
        "web": "https://github.com/18F/methods/blob/{sha}/{path}",
    },
    "18f-ux-guide": {
        "url": "https://github.com/18F/ux-guide.git",
        "subdir": "_pages", "sparse": None,
        "licence": "CC0 1.0 (public domain dedication)",
        "licence_re": r"CC0|public domain",
        "licence_files": ["LICENSE.md", "LICENSE"],
        "register": "business-guide", "bucket": "GREEN", "target": 80,
        "web": "https://github.com/18F/ux-guide/blob/{sha}/{path}",
    },
    "18f-agile": {
        "url": "https://github.com/18F/agile.git",
        "subdir": "_posts", "sparse": None,
        "licence": "CC0 1.0 (public domain dedication)",
        "licence_re": r"CC0|public domain",
        "licence_files": ["LICENSE.md", "LICENSE"],
        "register": "business-guide", "bucket": "GREEN", "target": 60,
        "web": "https://github.com/18F/agile/blob/{sha}/{path}",
    },
    "ms-style-guide": {
        "url": "https://github.com/MicrosoftDocs/microsoft-style-guide.git",
        "subdir": "styleguide", "sparse": None,
        "licence": "CC BY 4.0 (MicrosoftDocs)",
        "licence_re": r"Attribution 4\.0|CC BY 4\.0|CC-BY-4\.0",
        "licence_files": ["LICENSE", "LICENSE.md"],
        "register": "howto-guide", "bucket": "GREEN", "target": 100,
        "web": "https://github.com/MicrosoftDocs/microsoft-style-guide/blob/{sha}/{path}",
    },
    "gitlab-handbook": {
        "url": "https://gitlab.com/gitlab-com/www-gitlab-com.git",
        "subdir": "source/handbook", "sparse": "source/handbook",
        "licence": "CC BY-SA 4.0 (GitLab handbook)",
        "licence_re": r"Attribution[- ]ShareAlike 4\.0|CC BY-SA 4\.0|CC-BY-SA-4\.0",
        "licence_files": ["LICENCE", "LICENSE", "LICENSE.md"],
        "register": "business-guide", "bucket": "AMBER", "target": 400,
        "web": "https://gitlab.com/gitlab-com/www-gitlab-com/-/blob/{sha}/{path}",
    },
    "mdn-learn": {
        "url": "https://github.com/mdn/content.git",
        "subdir": "files/en-us/learn", "sparse": "files/en-us/learn",
        "licence": "CC BY-SA 2.5+ (MDN prose licence)",
        "licence_re": r"Attribution[- ]ShareAlike|CC-BY-SA|ShareAlike",
        "licence_files": ["LICENSE.md", "LICENSE"],
        "register": "developer-docs", "bucket": "AMBER", "target": 250,
        "web": "https://github.com/mdn/content/blob/{sha}/{path}",
    },
}

FRONTMATTER_RE = re.compile(r"\A---\n.*?\n---\n", re.S)
LIQUID_RE = re.compile(r"{%.*?%}|{{.*?}}", re.S)
HTML_TAG_RE = re.compile(r"<[^>\n]{1,120}>")


def sh(args, cwd=None, timeout=1800):
    return subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                          timeout=timeout)


def clone_and_pin(key, cfg):
    d = os.path.join(SCRATCH, key)
    if not os.path.isdir(os.path.join(d, ".git")):
        args = ["git", "clone", "--filter=blob:none"]
        if cfg["sparse"]:
            args += ["--sparse"]
        args += [cfg["url"], d]
        r = sh(args, timeout=3600)
        if r.returncode != 0:
            print(f"[{key}] clone failed: {r.stderr[-300:]}")
            return None, None
    if cfg["sparse"]:
        sh(["git", "sparse-checkout", "set", cfg["sparse"]], cwd=d)
    r = sh(["git", "rev-list", "-n", "1", f"--before={CUTOFF}", "HEAD"], cwd=d)
    sha = r.stdout.strip()
    if not sha:
        print(f"[{key}] no pre-2022 commit")
        return None, None
    r = sh(["git", "checkout", "-q", sha], cwd=d, timeout=3600)
    if r.returncode != 0:
        print(f"[{key}] checkout failed: {r.stderr[-300:]}")
        return None, None
    date = sh(["git", "show", "-s", "--format=%as", sha], cwd=d).stdout.strip()
    print(f"[{key}] pinned {sha[:10]} ({date})")
    return d, sha


def licence_ok(d, cfg):
    for lf in cfg["licence_files"]:
        p = os.path.join(d, lf)
        if os.path.exists(p):
            txt = open(p, encoding="utf-8", errors="replace").read()
            if re.search(cfg["licence_re"], txt, re.I):
                return lf
    return None


def frontmatter_title(raw):
    m = FRONTMATTER_RE.match(raw)
    if not m:
        return None, raw
    fm = m.group(0)
    body = raw[m.end():]
    tm = re.search(r"(?m)^title:\s*['\"]?(.+?)['\"]?\s*$", fm)
    return (tm.group(1).strip() if tm else None), body


def clean_markdown(body):
    body = LIQUID_RE.sub("", body)
    # fenced code blocks out (structural noise, matches AI-side treatment)
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    body = HTML_TAG_RE.sub("", body)
    body = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", body)
    body = re.sub(r"\n{3,}", "\n\n", body)
    return body.strip()


def prose_ok(md):
    """Reject reference-y pages: needs real paragraphs, not just tables/links."""
    lines = [l for l in md.split("\n") if l.strip()]
    if not lines:
        return False
    table_lines = sum(1 for l in lines if l.lstrip().startswith("|"))
    if table_lines > 0.2 * len(lines):
        return False
    paras = [b for b in re.split(r"\n\s*\n", md)
             if b.strip() and not b.lstrip().startswith(("#", "-", "|", "*", "1."))]
    return len(paras) >= 3


def ingest(key, cfg):
    d, sha = clone_and_pin(key, cfg)
    if not d:
        return 0
    lf = licence_ok(d, cfg)
    if not lf:
        print(f"[{key}] LICENCE NOT VERIFIED at pinned commit -- skipped")
        return 0
    outp = os.path.join(RAW, f"git-{key}.jsonl")
    if os.path.exists(outp):
        os.remove(outp)
    root = os.path.join(d, cfg["subdir"])
    mds = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [x for x in dirnames if not x.startswith(".")]
        for fn in filenames:
            if fn.endswith((".md", ".markdown", ".html.md", ".md.erb")):
                mds.append(os.path.join(dirpath, fn))
    mds.sort()
    kept = 0
    for p in mds:
        if kept >= cfg["target"]:
            break
        rel = os.path.relpath(p, d)
        try:
            raw = open(p, encoding="utf-8", errors="replace").read()
        except Exception:
            continue
        title, body = frontmatter_title(raw)
        md = clean_markdown(body)
        if not title:
            m = re.match(r"\s*#\s+(.+)", md)
            title = m.group(1).strip() if m else os.path.basename(p)
        if not md.startswith("#"):
            md = f"# {title}\n\n" + md
        if not quality_ok(md, min_words=200) or not prose_ok(md):
            continue
        # per-file last pre-2022 modification date + author (git provenance)
        r = sh(["git", "log", "-1", f"--before={CUTOFF}", "--format=%as|%an",
                "--", rel], cwd=d, timeout=120)
        fdate, author = (r.stdout.strip().split("|", 1) + [""])[:2] \
            if r.stdout.strip() else ("", "")
        url = cfg["web"].format(sha=sha, path=rel.replace(os.sep, "/"))
        append_jsonl(outp, {
            "id": doc_id(key, url), "text": md, "source": key, "url": url,
            "licence": cfg["licence"] + f" (verified: {lf}@{sha[:10]})",
            "published_date": fdate or None,
            "git_commit": sha, "git_author": author or None,
            "register": cfg["register"],
            "human_confidence": "H1",
            "legal_bucket": cfg["bucket"],
            "fetched_at": time.strftime("%Y-%m-%d"),
            "title": title,
            "raw_html": rel,  # native markdown IS the source; path at commit
        })
        kept += 1
    print(f"[{key}] kept {kept} of {len(mds)} md files")
    return kept


def main():
    keys = sys.argv[1:] or list(REPOS)
    total = 0
    for k in keys:
        try:
            total += ingest(k, REPOS[k])
        except subprocess.TimeoutExpired:
            print(f"[{k}] TIMEOUT -- skipped")
    print(f"[git] total {total}")


if __name__ == "__main__":
    main()
