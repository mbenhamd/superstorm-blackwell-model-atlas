#!/usr/bin/env python3
"""Read-only JSON, document-link, profile and Python syntax validation."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT=Path(__file__).resolve().parents[1]
if __package__ in (None, ''):
    sys.path.insert(0, str(ROOT))
from scripts.launch import validate_profile

def load_json(path: Path):
    def reject_constant(value):
        raise ValueError(f'Nonstandard JSON number: {value}')
    def unique_object(pairs):
        result={}
        for key,value in pairs:
            if key in result: raise ValueError(f'Duplicate JSON key: {key}')
            result[key]=value
        return result
    return json.loads(path.read_text(encoding='utf-8'),parse_constant=reject_constant,object_pairs_hook=unique_object)

def validate(root: Path = ROOT) -> dict:
    root=root.resolve()
    failures=[]; json_count=0; links=0; python_count=0
    files=[p for p in root.rglob('*') if p.is_file() and not any(x in p.relative_to(root).parts for x in ('__pycache__','upstreams','metadata','.git'))]
    for p in files:
        if p.suffix=='.json':
            try: load_json(p); json_count+=1
            except (OSError,ValueError) as exc: failures.append(f'{p.relative_to(root)}: JSON {exc}')
        if p.suffix=='.py':
            try: compile(p.read_text(encoding='utf-8'),str(p),'exec'); python_count+=1
            except (OSError,SyntaxError,UnicodeError) as exc: failures.append(f'{p.relative_to(root)}: Python {exc}')
        if p.suffix=='.md':
            try: text=re.sub(r'```.*?```','',p.read_text(encoding='utf-8'),flags=re.S)
            except (OSError,UnicodeError) as exc:
                failures.append(f'{p.relative_to(root)}: Markdown {exc}');continue
            for target in re.findall(r'\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)',text):
                parsed=urlsplit(target)
                if parsed.scheme or target.startswith('#'): continue
                dest=(p.parent/unquote(parsed.path)).resolve(); links+=1
                if not dest.is_relative_to(root.resolve()): failures.append(f'{p.relative_to(root)}: escaping link {target}')
                elif not dest.exists(): failures.append(f'{p.relative_to(root)}: broken link {target}')
    try:
        models=load_json(root/'catalog/models.json')['models']
        sources=load_json(root/'evidence/sources.json')['sources']
        source_ids={s['id'] for s in sources} if isinstance(sources,list) else set(sources)
        if len(source_ids)!=len(sources): failures.append('Duplicate source IDs.')
        profiles=load_json(root/'catalog/profiles.json')
        if not isinstance(models,list) or not isinstance(profiles,list): raise ValueError('Expected model/profile arrays.')
        if len(models)!=8: failures.append('Expected eight model families.')
        if len({m['company'] for m in models})!=6: failures.append('Expected six companies.')
        keys={m['key'] for m in models}; ids=set(); model_paths=set()
        if len(keys)!=len(models): failures.append('Duplicate model keys.')
        by_key={m['key']:m for m in models}
        for m in models:
            model_path=(root/m['path']).resolve()
            if not model_path.is_relative_to(root/'companies'):
                failures.append(f'{m["key"]}: model path must be inside companies/');continue
            if model_path in model_paths: failures.append(f'Duplicate model path {m["path"]}')
            model_paths.add(model_path)
            for name in ('README.md','architecture.md','precision.md','serving.md','validation.md','sources.md','model.json'):
                if not (model_path/name).is_file(): failures.append(f'Missing {m["key"]}/{name}')
            try:
                if load_json(model_path/'model.json')!=m: failures.append(f'Catalog/model divergence {m["key"]}')
            except (OSError,ValueError) as exc: failures.append(f'{m["key"]}: model record {exc}')
            if not set(m['source_ids'])<=source_ids: failures.append(f'{m["key"]}: missing source IDs')
            if m['config_projection'].get('layers',0)<1: failures.append(f'{m["key"]}: no architecture dimensions')
            variants=m['variants']
            if len({v['key'] for v in variants})!=len(variants): failures.append(f'{m["key"]}: duplicate variant keys')
        for path in (root/'companies').glob('*/*/model.json'):
            if path.parent.resolve() not in model_paths: failures.append(f'Uncatalogued model record {path.relative_to(root)}')
        for p in profiles:
            if not isinstance(p,dict):
                failures.append('A profile record must be a JSON object.');continue
            if not isinstance(p.get('id'),str) or not re.fullmatch(r'[a-z0-9][a-z0-9._-]*',p['id']):
                failures.append('Invalid profile id.');continue
            if p['id'] in ids: failures.append(f'Duplicate profile {p["id"]}')
            ids.add(p['id'])
            if p['model_key'] not in keys: failures.append(f'Unknown profile model {p["id"]}')
            if not set(p['source_ids'])<=source_ids: failures.append(f'{p["id"]}: missing source IDs')
            try: validate_profile(p)
            except (ValueError,TypeError) as exc: failures.append(f'{p["id"]}: {exc}')
            if p['tested_on_target'] is not False: failures.append(f'Unsubstantiated test claim {p["id"]}')
            model=by_key.get(p['model_key'])
            variant=next((v for v in model['variants'] if v['key']==p['variant']),None) if model else None
            if variant is None or variant['hf_id']!=p['hf_id']:
                failures.append(f'Profile checkpoint/variant mismatch {p["id"]}')
            elif variant.get('revision')!=p.get('model_revision'):
                failures.append(f'Profile/model revision mismatch {p["id"]}')
            try:
                actual=load_json(root/'profiles'/f'{p["id"]}.json')
                if actual!=p: failures.append(f'Catalog/profile divergence {p["id"]}')
            except (OSError,ValueError) as exc: failures.append(f'{p["id"]}: profile record {exc}')
        for path in (root/'profiles').glob('*.json'):
            if path.stem not in ids: failures.append(f'Uncatalogued profile {path.name}')
        counts={'model_families':len(models),'companies':len({m['company'] for m in models}),
                'sources':len(source_ids),'profiles':len(profiles)}
    except (OSError,ValueError,KeyError,TypeError,AttributeError) as exc:
        failures.append(f'Catalog validation failed: {exc}');counts={}
    return {'ok':not failures,'files_checked':len(files),'json_files':json_count,'python_files':python_count,
            'local_links_checked':links,**counts,'failures':failures,
            'boundary':'Static/local checks only; no external links, engine flags, GPU inference, cluster schema admission or network retrieval certified.'}

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--root',type=Path,default=ROOT);a=ap.parse_args()
    result=validate(a.root);print(json.dumps(result,indent=2));raise SystemExit(0 if result['ok'] else 1)

if __name__=='__main__': main()
