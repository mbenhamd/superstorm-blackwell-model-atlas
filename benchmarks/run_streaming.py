#!/usr/bin/env python3
"""Closed-loop HTTP/SSE probe. Chunk counts are not token counts."""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import time
from urllib import request, parse

class NoRedirect(request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

def semantic(delta: dict) -> tuple[bool,bool]:
    answer=bool(delta.get('content'))
    any_content=answer or bool(delta.get('reasoning_content') or delta.get('reasoning') or delta.get('tool_calls'))
    return any_content,answer

def probe(base_url: str, model: str, payload: dict, timeout: int = 300) -> dict:
    body=dict(payload,model=model,stream=True,stream_options={'include_usage':True})
    encoded=json.dumps(body,ensure_ascii=False).encode()
    headers={'Content-Type':'application/json','Accept':'text/event-stream'}
    token=os.environ.get('BENCH_API_KEY')
    if token: headers['Authorization']='Bearer '+token
    started=time.perf_counter(); first=None; first_answer=None; chunks=0; usage=None; finish_reason=None
    row={'payload_sha256':hashlib.sha256(encoded).hexdigest(),'ok':False,'completion_tokens':None,
         'first_semantic_seconds':None,'first_answer_seconds':None,'semantic_chunks':0}
    try:
        req=request.Request(base_url.rstrip('/')+'/v1/chat/completions',data=encoded,headers=headers)
        with request.build_opener(NoRedirect()).open(req,timeout=timeout) as response:
            if 'text/event-stream' not in response.headers.get('Content-Type',''):
                raise ValueError('Expected SSE response, not a buffered JSON or HTML page.')
            total=0; done=False
            for raw in response:
                elapsed=time.perf_counter()-started
                if elapsed>timeout: raise TimeoutError('Overall request deadline exceeded.')
                total+=len(raw)
                if total>64*1024*1024: raise ValueError('Response limit exceeded.')
                line=raw.decode('utf-8').strip()
                if not line.startswith('data:'): continue
                data=line[5:].strip()
                if data=='[DONE]': done=True; break
                event=json.loads(data)
                if event.get('error'): raise ValueError('Endpoint returned a streaming error event.')
                if event.get('usage'): usage=event['usage']
                for choice in event.get('choices',[]):
                    delta=choice.get('delta',{})
                    has_semantic,has_answer=semantic(delta)
                    if has_semantic:
                        chunks+=1
                        if first is None: first=elapsed
                    if has_answer and first_answer is None: first_answer=elapsed
                    if choice.get('finish_reason') is not None: finish_reason=choice['finish_reason']
            if not done and finish_reason is None: raise ValueError('Stream ended without a terminal marker.')
        row['ok']=True
    except Exception as exc:
        # Keep failure class, not potentially sensitive server response or prompts.
        row['error_type']=type(exc).__name__
    row.update(latency_seconds=time.perf_counter()-started,first_semantic_seconds=first,
               first_answer_seconds=first_answer,semantic_chunks=chunks,finish_reason=finish_reason)
    ct=usage.get('completion_tokens') if isinstance(usage,dict) else None
    if isinstance(ct,int) and not isinstance(ct,bool) and ct>=0: row['completion_tokens']=ct
    row['usage']=usage
    row['tpot_proxy_seconds']=(row['latency_seconds']-first)/(ct-1) if row['ok'] and first is not None and isinstance(ct,int) and ct>1 else None
    return row

def percentile(values: list[float], q: float) -> float | None:
    if not values: return None
    ordered=sorted(values); idx=(len(ordered)-1)*q; lo=int(idx); hi=min(lo+1,len(ordered)-1)
    return ordered[lo]*(hi-idx)+ordered[hi]*(idx-lo) if hi!=lo else ordered[lo]

def summarize(rows: list[dict], wall: float) -> dict:
    successful=[r for r in rows if r['ok']]
    times=[r['latency_seconds'] for r in successful]
    ttft=[r['first_semantic_seconds'] for r in successful if r['first_semantic_seconds'] is not None]
    # An incomplete usage series must not masquerade as total token throughput.
    complete=bool(rows) and all(r['ok'] and r['completion_tokens'] is not None for r in rows)
    return {'requests':len(rows),'successful':len(successful),'failed':len(rows)-len(successful),
            'error_rate':(len(rows)-len(successful))/len(rows) if rows else None,
            'successful_requests_per_second':len(successful)/wall if wall>0 else None,
            'output_tokens_per_second':sum(r['completion_tokens'] for r in rows)/wall if complete and wall>0 else None,
            'output_token_accounting_complete':complete,
            'latency_success_only_p50':percentile(times,.5),'latency_success_only_p95':percentile(times,.95),
            'first_semantic_success_only_p95':percentile(ttft,.95),
            'note':'Closed-loop workload. Successful latency percentiles are conditional on success; failures are reported separately. No goodput/SLO or per-token ITL claim.'}

def main() -> None:
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--base-url',default='http://127.0.0.1:8000'); ap.add_argument('--model',required=True)
    ap.add_argument('--requests-jsonl',type=Path,required=True)
    ap.add_argument('--concurrency',type=int,default=1); ap.add_argument('--timeout',type=int,default=300)
    ap.add_argument('--output',type=Path,required=True)
    a=ap.parse_args()
    if a.concurrency<1 or a.timeout<1: ap.error('Concurrency and timeout must be positive.')
    parsed=parse.urlsplit(a.base_url)
    if parsed.username or parsed.password or parsed.query or parsed.fragment: ap.error('Do not put credentials/query/fragment in base-url.')
    if parsed.scheme not in ('http','https') or not parsed.hostname: ap.error('Expected an HTTP(S) base URL.')
    if os.environ.get('BENCH_API_KEY') and parsed.scheme!='https' and parsed.hostname not in ('127.0.0.1','localhost','::1'):
        ap.error('API-key requests to nonlocal endpoints require HTTPS.')
    if a.output.exists(): ap.error('Refusing to overwrite an existing measurement file.')
    payloads=[json.loads(line) for line in a.requests_jsonl.read_text().splitlines() if line.strip()]
    if not payloads or any(not isinstance(p,dict) or not p.get('messages') for p in payloads): ap.error('Expected nonempty chat request objects.')
    start=time.perf_counter()
    with ThreadPoolExecutor(max_workers=a.concurrency) as pool:
        rows=list(pool.map(lambda p:probe(a.base_url,a.model,p,a.timeout),payloads))
    wall=time.perf_counter()-start
    report={'schema_version':1,'measurement_kind':'closed-loop HTTP/SSE client probe',
            'created_at_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'model':a.model,'concurrency':a.concurrency,
            'wall_seconds':wall,'requests':rows,'summary':summarize(rows,wall)}
    a.output.parent.mkdir(parents=True,exist_ok=True)
    with a.output.open('x',encoding='utf-8') as f: json.dump(report,f,indent=2)
    print(json.dumps(report['summary'],indent=2))

if __name__=='__main__': main()
