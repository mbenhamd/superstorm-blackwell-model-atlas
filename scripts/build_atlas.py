#!/usr/bin/env python3
"""Build the offline reading edition from the atlas's Markdown subset (stdlib only)."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def document_id(path: Path) -> str:
    return 'doc-' + re.sub(r'[^A-Za-z0-9_-]', '-', path.as_posix())


def heading_id(text: str) -> str:
    text = re.sub(r'[`*_]', '', text).lower()
    return re.sub(r'[^\w\s-]', '', text).replace(' ', '-')


def inline(text: str, source: Path, documents: set[Path]) -> str:
    """Render the inline syntax used here, escaping arbitrary HTML."""
    tokens: list[str] = []

    def hold(value: str) -> str:
        tokens.append(value)
        return f'\x00{len(tokens)-1}\x00'

    text = re.sub(r'`([^`]+)`', lambda m: hold('<code>' + html.escape(m[1]) + '</code>'), text)

    def link(match: re.Match) -> str:
        label, target = match[1], match[2]
        parsed = urlsplit(target)
        attrs = ''
        if parsed.scheme:
            if parsed.scheme not in ('https', 'http', 'mailto'):
                return label + ' (' + target + ')'
            attrs = ' target="_blank" rel="noopener noreferrer"'
        elif parsed.path:
            resolved = (ROOT / source.parent / unquote(parsed.path)).resolve()
            try:
                relative = resolved.relative_to(ROOT)
            except ValueError:
                relative = None
            if relative in documents:
                target = '#' + document_id(relative)
                if parsed.fragment:
                    target += '--' + unquote(parsed.fragment)
            elif relative is not None:
                target = relative.as_posix()
                if parsed.fragment:
                    target += '#' + parsed.fragment
        elif parsed.fragment:
            target = '#' + document_id(source) + '--' + unquote(parsed.fragment)
        return hold('<a href="' + html.escape(target, quote=True) + '"' + attrs + '>'
                    + html.escape(label) + '</a>')

    text = re.sub(r'\[([^\]]+)\]\(([^\s)]+)\)', link, text)
    text = html.escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em>\1</em>', text)
    for _ in range(2):
        text = re.sub(r'\x00(\d+)\x00', lambda m: tokens[int(m[1])], text)
    return text


def render_markdown(text: str, source: Path, documents: set[Path]) -> str:
    """Support headings, paragraphs, fenced code, pipe tables, quotes and flat lists."""
    lines = text.splitlines()
    result: list[str] = []
    seen_headings: dict[str, int] = {}
    i = 0
    fmt = lambda value: inline(value, source, documents)
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        if line.startswith('```'):
            language = line[3:].strip()
            code: list[str] = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i])
                i += 1
            if i == len(lines):
                raise ValueError(f'{source}: unterminated code fence')
            result.append('<pre><code class="language-' + html.escape(language, quote=True)
                          + '">' + html.escape('\n'.join(code)) + '\n</code></pre>')
            i += 1
            continue
        heading = re.match(r'^(#{1,6}) (.+)$', line)
        if heading:
            level = len(heading[1])
            slug = heading_id(heading[2])
            count = seen_headings.get(slug, 0)
            seen_headings[slug] = count + 1
            ident = document_id(source) + '--' + slug + (f'-{count}' if count else '')
            result.append(f'<h{level} id="{html.escape(ident, quote=True)}">{fmt(heading[2])}</h{level}>')
            i += 1
            continue
        if (line.startswith('|') and i + 1 < len(lines)
                and re.fullmatch(r'[| :\-]+', lines[i+1])):
            cells = lambda row: [cell.strip() for cell in row.strip().strip('|').split('|')]
            result.append('<table><thead><tr>' + ''.join('<th>' + fmt(c) + '</th>' for c in cells(line))
                          + '</tr></thead><tbody>')
            i += 2
            while i < len(lines) and lines[i].startswith('|'):
                result.append('<tr>' + ''.join('<td>' + fmt(c) + '</td>' for c in cells(lines[i])) + '</tr>')
                i += 1
            result.append('</tbody></table>')
            continue
        if re.match(r'^(?:[-*+] |\d+\. )', line):
            ordered = bool(re.match(r'^\d+\. ', line))
            tag = 'ol' if ordered else 'ul'
            pattern = r'^\d+\. (.*)$' if ordered else r'^[-*+] (.*)$'
            result.append('<' + tag + '>')
            while i < len(lines):
                item = re.match(pattern, lines[i])
                if not item:
                    break
                result.append('<li>' + fmt(item[1]) + '</li>')
                i += 1
            result.append('</' + tag + '>')
            continue
        if line.startswith('> '):
            quoted: list[str] = []
            while i < len(lines) and lines[i].startswith('> '):
                quoted.append(lines[i][2:])
                i += 1
            result.append('<blockquote><p>' + fmt(' '.join(quoted)) + '</p></blockquote>')
            continue
        paragraph = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r'^(?:#|```|\||> |[-*+] |\d+\. )', lines[i]):
            paragraph.append(lines[i])
            i += 1
        result.append('<p>' + fmt(' '.join(paragraph)) + '</p>')
    return '\n'.join(result)


def build() -> str:
    front = ['README.md', 'START_HERE.md', 'reports/comparison.md', 'hardware/B300-8GPU.md',
             'reports/memory-math.md', 'reports/precision-and-kernels.md', 'frameworks/DECISION.md',
             'frameworks/vllm/SOURCE_REVIEW.md', 'frameworks/sglang/SOURCE_REVIEW.md',
             'frameworks/kserve/ARCHITECTURE.md', 'reports/nightly-readiness.md', 'benchmarks/PROTOCOL.md']
    remaining = sorted(p.relative_to(ROOT) for p in ROOT.rglob('*.md')
                       if not any(part.startswith('.') or part in ('upstreams', 'metadata') for part in p.relative_to(ROOT).parts)
                       and p.name != 'AGENTS.md' and p.relative_to(ROOT).as_posix() not in front)
    paths = [Path(p) for p in front] + remaining
    documents = set(paths)
    nav: list[str] = []
    articles: list[str] = []
    hashes = {}
    for path in paths:
        raw = (ROOT / path).read_bytes()
        text = raw.decode('utf-8')
        hashes[path.as_posix()] = hashlib.sha256(raw).hexdigest()
        title = next((line[2:] for line in text.splitlines() if line.startswith('# ')), path.as_posix())
        ident = document_id(path)
        nav.append(f'<a href="#{ident}" data-title="{html.escape(title.lower(), quote=True)}">{html.escape(title)}</a>')
        articles.append(f'<article id="{ident}"><div class="eyebrow">{html.escape(path.as_posix())}</div>'
                        + render_markdown(text, path, documents)
                        + '<a class="back" href="#top">Back to contents ↑</a></article>')
    models = json.loads((ROOT / 'catalog/models.json').read_text())['models']
    profiles = json.loads((ROOT / 'catalog/profiles.json').read_text())
    sources = json.loads((ROOT / 'evidence/sources.json').read_text())['sources']
    stats = ''.join(f'<div class="stat"><strong>{count}</strong><span>{label}</span></div>'
                    for count, label in [(len(models), 'Model families'), (len(profiles), 'Launch profiles'),
                                         (len(sources), 'Source records')])
    return ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Superstorm · Blackwell model atlas</title><style>' + STYLE + '</style></head>'
            '<body id="top"><aside><h2>SUPERSTORM</h2><p>Blackwell model atlas<br>Research and audit · 15 October 2026 UTC</p>'
            '<input id="filter" type="search" placeholder="Filter document titles…" aria-label="Filter document titles">'
            '<nav>' + ''.join(nav) + '</nav><p>Text is embedded offline. Source links open the publishers. '
            'Code and JSON assets accompany this edition.</p></aside><main><header class="hero">'
            '<div class="eyebrow">Architecture · precision · inference · operations</div>'
            '<h1>Understand the model.<br>Justify the deployment.</h1>'
            '<p>A source-linked technical atlas for eight model families on an eight-GPU B300 node.</p>'
            '<div class="stats">' + stats + '</div></header><p class="notice"><strong>Evidence boundary:</strong> '
            'Primary sources and local tools were audited. No B300 serving performance or model quality was measured. '
            'See the audit report and validation ledger for coverage and unresolved limits.</p>'
            + '\n'.join(articles) + '</main><script type="application/json" id="source-hashes">'
            + json.dumps(hashes, sort_keys=True).replace('<', '\\u003c') + '</script>'
            '<script>document.getElementById("filter").addEventListener("input",function(){'
            'const q=this.value.toLowerCase();document.querySelectorAll("nav a").forEach('
            'a=>a.hidden=!a.dataset.title.includes(q));});</script></body></html>\n')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if ATLAS.html differs from its current sources.')
    args = parser.parse_args()
    result = build()
    target = ROOT / 'ATLAS.html'
    if args.check:
        if not target.is_file() or target.read_text(encoding='utf-8') != result:
            parser.exit(1, 'ATLAS.html is stale; run python3 scripts/build_atlas.py\n')
        print('ATLAS.html matches its Markdown sources.')
    else:
        target.write_text(result, encoding='utf-8')
        print('Wrote ATLAS.html')


STYLE = '\n:root{--ink:#16262a;--muted:#566569;--line:#d7e1dc;--accent:#126c52;--paper:#fff;--back:#f2f5f1}*{box-sizing:border-box}[hidden]{display:none!important}html{scroll-behavior:smooth;scroll-padding-top:24px}body{margin:0;background:var(--back);color:var(--ink);font:16px/1.7 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:var(--accent);text-underline-offset:3px}aside{position:fixed;inset:0 auto 0 0;width:290px;padding:28px 20px;background:#162b28;color:#eef4ec;overflow:auto}aside h2{margin:0;font-size:23px;letter-spacing:-.5px}aside p{font-size:13px;color:#bfd1c5;line-height:1.5}aside a{display:block;color:#dbe9e0;padding:7px 9px;margin:2px 0;text-decoration:none;border-radius:5px;font-size:13px;line-height:1.4}aside a:hover{background:#28483d;color:white}aside input{width:100%;background:#eff5ef;border:0;border-radius:6px;padding:11px;margin:14px 0 20px;font:inherit;font-size:13px}main{margin-left:290px;max-width:1300px;padding:42px 45px 100px}.hero{padding:24px 0 35px}.eyebrow{text-transform:uppercase;font-size:11px;letter-spacing:1.8px;color:var(--muted);font-weight:700;overflow-wrap:anywhere}.hero h1{font-size:clamp(32px,4.5vw,58px);letter-spacing:-2px;line-height:1.07;margin:18px 0}.hero p{max-width:700px;font-size:18px;color:var(--muted)}.stats{display:flex;gap:28px;flex-wrap:wrap;margin-top:28px}.stat{border-top:3px solid var(--accent);padding-top:10px;min-width:120px}.stat strong{font-size:26px;display:block}.stat span{font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:var(--muted)}article{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:32px 38px;margin:0 0 24px;overflow-wrap:anywhere;box-shadow:0 3px 14px #16342a04}h1{font-size:30px;line-height:1.22;letter-spacing:-.6px}h2{font-size:23px;line-height:1.35;margin-top:34px}h3{font-size:18px;margin-top:26px}p{margin:14px 0}table{display:block;width:100%;overflow-x:auto;border-collapse:collapse;font-size:13px;line-height:1.5;margin:20px 0}th,td{padding:10px 13px;vertical-align:top;border-bottom:1px solid var(--line);text-align:left}th{background:#ecf3ec;font-weight:700}tr:nth-child(even) td{background:#f8faf7}pre{overflow-x:auto;padding:20px;background:#172b2a;color:#e6efe7;border-radius:7px;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.88em;background:#edf3ed;border-radius:3px;padding:2px 4px}pre code{padding:0;background:none;font-size:inherit}blockquote{border-left:4px solid #6c9e76;margin:22px 0;padding:2px 18px;background:#f2f7ee}.back{display:inline-block;margin-top:28px;font-size:12px;color:var(--muted)}.notice{padding:14px 18px;border-left:4px solid #a38735;background:#fbf6e9;font-size:14px}.nojs{font-size:13px}@media(max-width:960px){aside{position:relative;width:auto;max-height:350px}main{margin:0;padding:25px 16px}article{padding:25px 20px}.hero h1{letter-spacing:-1px}}@media print{aside,.back{display:none}main{margin:0;padding:0;max-width:none}article{border:0;box-shadow:none;page-break-before:always;padding:0}a{color:inherit}pre{white-space:pre-wrap;background:#f2f2f2;color:#111}.hero{page-break-after:always}}\n'

if __name__ == '__main__':
    main()
