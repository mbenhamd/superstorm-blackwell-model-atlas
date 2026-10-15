#!/usr/bin/env python3
"""Resolve and hash Hugging Face metadata only. No weight downloads or code execution."""
from __future__ import annotations
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
from urllib import request, error, parse

ROOT=Path(__file__).resolve().parents[1]
FILES=('config.json','README.md','generation_config.json','tokenizer_config.json',
       'preprocessor_config.json','processor_config.json','quantization_config.json',
       'hf_quant_config.json','model.safetensors.index.json','LICENSE','LICENSE.txt')
MAX_BYTES=32*1024*1024

class SecureRedirect(request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if parse.urlsplit(newurl).scheme!='https':
            raise ValueError('Refusing metadata redirect to non-HTTPS URL.')
        out=super().redirect_request(req,fp,code,msg,headers,newurl)
        if out and parse.urlsplit(newurl).netloc!=parse.urlsplit(req.full_url).netloc:
            out.remove_header('Authorization')
        return out

def get(url: str, token: str | None = None) -> bytes:
    if parse.urlsplit(url).scheme!='https': raise ValueError('Only HTTPS metadata retrieval is allowed.')
    headers={'User-Agent':'Superstorm-Metadata-Audit/1.0'}
    if token and parse.urlsplit(url).hostname=='huggingface.co': headers['Authorization']='Bearer '+token
    opener=request.build_opener(SecureRedirect())
    with opener.open(request.Request(url,headers=headers),timeout=45) as response:
        data=response.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES: raise ValueError('Metadata size limit exceeded.')
    return data

def fetch(repo: str, ref: str, output: Path, token: str | None = None) -> Path:
    if not re.fullmatch(r'[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+',repo): raise ValueError('Expected organization/model repository ID.')
    if any(part in ('.','..') for part in repo.split('/')): raise ValueError('Invalid repository path component.')
    metadata=json.loads(get(f'https://huggingface.co/api/models/{repo}/revision/{parse.quote(ref,safe="")}',token))
    if not isinstance(metadata,dict): raise ValueError('Hub API did not return a metadata object.')
    sha=metadata.get('sha','')
    if not isinstance(sha,str) or not re.fullmatch(r'[a-f0-9]{40}',sha): raise ValueError('Hub API did not return an immutable 40-character commit.')
    if re.fullmatch(r'[a-f0-9]{40}',ref) and sha!=ref: raise ValueError('Immutable reference mismatch.')
    target=output/repo.replace('/','--')/sha
    target.mkdir(parents=True,exist_ok=False)
    receipt={'hf_id':repo,'revision':sha,'requested_ref':ref,'retrieved_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
             'metadata_only':True,'weight_files_verified':False,'files':{},'missing':[]}
    try:
        # Config first: a missing/forbidden config invalidates the metadata snapshot.
        for filename in FILES:
            url=f'https://huggingface.co/{repo}/resolve/{sha}/{filename}'
            try: data=get(url,token)
            except error.HTTPError as exc:
                if exc.code==404 and filename!='config.json': receipt['missing'].append(filename); continue
                raise
            if filename.endswith('.json') and not isinstance(json.loads(data),dict):
                raise ValueError(f'{filename} must contain a JSON object.')
            (target/filename).write_bytes(data)
            receipt['files'][filename]={'url':url,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
        (target/'superstorm-revision.json').write_text(json.dumps(receipt,indent=2)+'\n')
    except Exception:
        # Preserve only newly created partial data and label it; do not claim success.
        (target/'INCOMPLETE.txt').write_text('Retrieval failed before provenance completion. Do not use this directory for launch.\n')
        raise
    return target

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--repo',help='Explicit organization/model ID; may include a matched external drafter.')
    ap.add_argument('--ref',default='main',help='Resolved to an immutable SHA before file downloads.')
    ap.add_argument('--output',type=Path,default=Path('metadata'))
    ap.add_argument('--fetch',action='store_true',help='Explicitly authorize small metadata network reads/writes.')
    a=ap.parse_args()
    if not a.fetch:
        data=json.loads((ROOT/'catalog/models.json').read_text())
        models=data['models'] if isinstance(data,dict) else data
        for m in models:
            for variant in m['variants']:
                if variant['hf_id']: print(variant['hf_id'])
        print('# LIST ONLY. Use --repo organization/model --fetch to resolve and archive metadata; never weights.')
        return
    if not a.repo: ap.error('--fetch requires --repo.')
    try: print(fetch(a.repo,a.ref,a.output,os.environ.get('HF_TOKEN')))
    except (OSError,ValueError,error.URLError) as exc:
        # Do not print HTTP headers or token-bearing request objects.
        ap.error(f'Metadata retrieval failed ({type(exc).__name__}): {str(exc)[:300]}')

if __name__=='__main__': main()
