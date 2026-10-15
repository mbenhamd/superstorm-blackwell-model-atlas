#!/usr/bin/env python3
"""Read-only JSON, document-link, profile and Python syntax validation."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT=Path(__file__).resolve().parents[1]

def validate(root: Path = ROOT) -> dict:
    failures=[]; json_count=0; links=0; python_count=0
    files=[p for p in root.rglob('*') if p.is_file() and not any(x in p.parts for x in ('__pycache__','upstreams','metadata','.git'))]
    for p in files:
        if p.suffix=='.json':
            try: json.loads(p.read_text(encoding='utf-8')); json_count+=1
            except (OSError,ValueError) as exc: failures.append(f'{p.relative_to(root)}: JSON {exc}')
        if p.suffix=='.py':
            try: compile(p.read_text(encoding='utf-8'),str(p),'exec'); python_count+=1
            except (SyntaxError,UnicodeError) as exc: failures.append(f'{p.relative_to(root)}: Python {exc}')
        if p.suffix=='.md':
            text=re.sub(r'```.*?```','',p.read_text(encoding='utf-8'),flags=re.S)
            for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)',text):
                parsed=urlsplit(target)
                if parsed.scheme or target.startswith('#'): continue
                dest=(p.parent/unquote(parsed.path)).resolve(); links+=1
                if not dest.is_relative_to(root.resolve()): failures.append(f'{p.relative_to(root)}: escaping link {target}')
                elif not dest.exists(): failures.append(f'{p.relative_to(root)}: broken link {target}')
    try:
        models=json.loads((root/'catalog/models.json').read_text())['models']
        sources=json.loads((root/'evidence/sources.json').read_text())['sources']
        source_ids={s['id'] for s in sources} if isinstance(sources,list) else set(sources)
        profiles=json.loads((root/'catalog/profiles.json').read_text())
        if len(models)!=8: failures.append('Expected eight model families.')
        if len({m['company'] for m in models})!=6: failures.append('Expected six companies.')
        keys={m['key'] for m in models}; ids=set()
        for m in models:
            for name in ('README.md','architecture.md','precision.md','serving.md','validation.md','sources.md','model.json'):
                if not (root/m['path']/name).is_file(): failures.append(f'Missing {m["key"]}/{name}')
            if not set(m['source_ids'])<=source_ids: failures.append(f'{m["key"]}: missing source IDs')
            if m['config_projection'].get('layers',0)<1: failures.append(f'{m["key"]}: no architecture dimensions')
        for p in profiles:
            if p['id'] in ids: failures.append(f'Duplicate profile {p["id"]}')
            ids.add(p['id'])
            if p['model_key'] not in keys: failures.append(f'Unknown profile model {p["id"]}')
            if not set(p['source_ids'])<=source_ids: failures.append(f'{p["id"]}: missing source IDs')
            if p['gpu_count']!=p['tensor_parallel_size']*p['data_parallel_size']: failures.append(f'GPU rank count mismatch {p["id"]}')
            if not 1<=p['gpu_count']<=8: failures.append(f'Too many GPUs {p["id"]}')
            if p['tested_on_target'] is not False: failures.append(f'Unsubstantiated test claim {p["id"]}')
            actual=json.loads((root/'profiles'/f'{p["id"]}.json').read_text())
            if actual!=p: failures.append(f'Catalog/profile divergence {p["id"]}')
        counts={'model_families':len(models),'companies':len({m['company'] for m in models}),
                'sources':len(source_ids),'profiles':len(profiles)}
    except (OSError,ValueError,KeyError,TypeError) as exc:
        failures.append(f'Catalog validation failed: {exc}');counts={}
    return {'ok':not failures,'files_checked':len(files),'json_files':json_count,'python_files':python_count,
            'local_links_checked':links,**counts,'failures':failures,
            'boundary':'Static/local checks only; no external links, engine flags, GPU inference, cluster schema admission or network retrieval certified.'}

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,default=ROOT);a=ap.parse_args()
    result=validate(a.root);print(json.dumps(result,indent=2));raise SystemExit(0 if result['ok'] else 1)

if __name__=='__main__': main()
