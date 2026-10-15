from __future__ import annotations
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from scripts.memory import weight_bytes,gqa_kv_bytes,recurrent_matrix_bytes,state_pool_ratio
from scripts.launch import check_profile,check_environment,build_command,verify_local
from scripts.clone_upstreams import commands,UPSTREAMS
from scripts.fetch_metadata import SecureRedirect
from scripts.validate_repo import validate
from deploy.kserve.render import render
from benchmarks.run_streaming import semantic,percentile,summarize,probe
from urllib.request import Request

P=json.loads((ROOT/'profiles/qwen3.8-27b.bf16.vllm.baseline.json').read_text())

class ArithmeticTests(unittest.TestCase):
    def test_kimi_fp8_weight_floor(self): self.assertEqual(weight_bytes(2800,'fp8'),2.8e12)
    def test_kimi_exceeds_node(self): self.assertGreater(weight_bytes(2800,'fp8'),8*288e9)
    def test_nvfp4_scale_overhead(self): self.assertEqual(weight_bytes(1,'nvfp4-blocks'),562500000)
    def test_mxfp4_scale_overhead(self): self.assertEqual(weight_bytes(1,'mxfp4-blocks'),531250000)
    def test_mistral_88gib_kv(self): self.assertEqual(gqa_kv_bytes(88,8,128,262144)/2**30,88)
    def test_qwen_16gib_kv(self): self.assertEqual(gqa_kv_bytes(16,4,256,262144)/2**30,16)
    def test_qwen_144mib_matrix(self): self.assertEqual(recurrent_matrix_bytes(48,48,128,128)/2**20,144)
    def test_kimi_414mib_matrix(self): self.assertEqual(recurrent_matrix_bytes(69,96,128,128)/2**20,414)
    def test_invalid_negative(self):
        with self.assertRaises(ValueError): weight_bytes(-1,'fp8')
    def test_invalid_nonfinite(self):
        with self.assertRaises(ValueError): weight_bytes(float('nan'),'bf16')
    def test_state_ratio(self): self.assertEqual(state_pool_ratio(5,2,100,10,10),7)
    def test_invalid_slots(self):
        with self.assertRaises(ValueError): state_pool_ratio(0,0,1,1,1)

class GuardTests(unittest.TestCase):
    def test_candidate(self): check_profile(P)
    def test_blocked(self):
        p=copy.deepcopy(P);p['status']='blocked'
        with self.assertRaises(ValueError): check_profile(p,allow_probe=True)
    def test_probe_requires_opt_in(self):
        p=copy.deepcopy(P);p['status']='compatibility-probe'
        with self.assertRaises(ValueError): check_profile(p)
        check_profile(p,allow_probe=True)
    def test_forbidden_identity(self):
        p=copy.deepcopy(P);p['engine_args']+=['--model-path','untrusted']
        with self.assertRaises(ValueError): check_profile(p)
    def test_simulated_acceptance(self):
        with self.assertRaises(ValueError): check_environment({'SGLANG_SIMULATE_ACC_LEN':'4.5'})
    def test_local_bind_and_no_trust(self):
        cmd=build_command(P,'/models/pinned')
        self.assertEqual(cmd[:3],['vllm','serve','/models/pinned'])
        self.assertEqual(cmd[cmd.index('--host')+1],'127.0.0.1')
        self.assertNotIn('--trust-remote-code',cmd)
    def test_draft_placeholder_requires_path(self):
        p=copy.deepcopy(P);p['engine_args']+=['--draft-model','__DRAFT_DIR__']
        with self.assertRaises(ValueError): build_command(p,'/models/pinned')
    def test_local_provenance_and_tamper(self):
        with tempfile.TemporaryDirectory() as td:
            path=Path(td);config=b'{"architectures":["Test"]}'
            (path/'config.json').write_bytes(config)
            meta={'hf_id':P['hf_id'],'revision':'a'*40,'files':{'config.json':{'sha256':hashlib.sha256(config).hexdigest()}}}
            (path/'superstorm-revision.json').write_text(json.dumps(meta))
            self.assertEqual(verify_local(path,P['hf_id'])['revision'],'a'*40)
            with self.assertRaises(ValueError): verify_local(path,'other/model')
            (path/'config.json').write_text('{}')
            with self.assertRaises(ValueError): verify_local(path,P['hf_id'])
    def test_clone_pins(self):
        for name,(_,sha) in UPSTREAMS.items():
            cmd=commands(name,Path('/new/checkout'))
            self.assertIn(sha,cmd[2]);self.assertIn('--detach',cmd[3])
            self.assertTrue(all('reset' not in c and 'clean' not in c for c in cmd))
    def test_redirect_strips_auth(self):
        req=Request('https://huggingface.co/x',headers={'Authorization':'Bearer test-not-a-real-token'})
        out=SecureRedirect().redirect_request(req,None,302,'Found',{},'https://cdn.example/x')
        self.assertIsNone(out.get_header('Authorization'))
    def test_redirect_refuses_http(self):
        req=Request('https://huggingface.co/x')
        with self.assertRaises(ValueError): SecureRedirect().redirect_request(req,None,302,'Found',{},'http://cdn.example/x')

class DeploymentTests(unittest.TestCase):
    def args(self): return dict(image='registry.example/engine@sha256:'+'a'*64,pvc='model-cache',model_subpath='qwen/pin',name='qwen27b',cpu='16',host_memory='128Gi')
    def test_valid_structure(self):
        d=render(P,**self.args());p=d['spec']['predictor'];c=p['containers'][0]
        self.assertEqual(d['metadata']['annotations']['serving.kserve.io/deploymentMode'],'Standard')
        self.assertEqual(c['resources']['limits']['nvidia.com/gpu'],1)
        self.assertTrue(c['volumeMounts'][0]['readOnly'])
        self.assertEqual(c['command'][c['command'].index('--host')+1],'0.0.0.0')
        self.assertEqual(p['maxReplicas'],1)
    def test_mutable_image_rejected(self):
        a=self.args();a['image']='registry.example/engine:latest'
        with self.assertRaises(ValueError): render(P,**a)
    def test_placeholder_digest_rejected(self):
        a=self.args();a['image']='registry.example/engine@sha256:YOUR_64_HEX_DIGEST'
        with self.assertRaises(ValueError): render(P,**a)
    def test_path_traversal_rejected(self):
        a=self.args();a['model_subpath']='../private'
        with self.assertRaises(ValueError): render(P,**a)
    def test_absolute_path_rejected(self):
        a=self.args();a['model_subpath']='/private'
        with self.assertRaises(ValueError): render(P,**a)
    def test_unknown_resources_rejected(self):
        a=self.args();a['cpu']='0'
        with self.assertRaises(ValueError): render(P,**a)

class ProbeTests(unittest.TestCase):
    def test_semantic_reasoning(self): self.assertEqual(semantic({'reasoning_content':'x'}),(True,False))
    def test_semantic_answer(self): self.assertEqual(semantic({'content':'x'}),(True,True))
    def test_empty_delta(self): self.assertEqual(semantic({'role':'assistant'}),(False,False))
    def test_percentiles(self):
        self.assertEqual(percentile([1,2,3],.5),2)
        self.assertEqual(percentile([1],.99),1)
        self.assertIsNone(percentile([],.5))
    def test_missing_usage_no_fake_tokens(self):
        row={'ok':True,'completion_tokens':None,'latency_seconds':1,'first_semantic_seconds':.2}
        s=summarize([row],1)
        self.assertIsNone(s['output_tokens_per_second'])
        self.assertFalse(s['output_token_accounting_complete'])
    def test_failed_denominator(self):
        a={'ok':True,'completion_tokens':10,'latency_seconds':1,'first_semantic_seconds':.2}
        b=dict(a,ok=False)
        s=summarize([a,b],2)
        self.assertEqual(s['error_rate'],.5)
        self.assertEqual(s['successful_requests_per_second'],.5)
        self.assertIsNone(s['output_tokens_per_second'])
    def test_network_failure_is_recorded(self):
        with patch('benchmarks.run_streaming.request.build_opener',side_effect=OSError('network disabled')):
            r=probe('http://localhost:8000','test/model',{'messages':[{'role':'user','content':'x'}]})
        self.assertFalse(r['ok']);self.assertEqual(r['error_type'],'OSError')
        self.assertIsNone(r['completion_tokens'])

class RepositoryTests(unittest.TestCase):
    def test_links_json_and_profiles(self):
        result=validate(ROOT)
        self.assertTrue(result['ok'],result['failures'])
    def test_hybrid_layer_counts(self):
        models=json.loads((ROOT/'catalog/models.json').read_text())['models']
        for m in models:
            c=m['config_projection']
            if 'kda_layers' in c:
                attention=c.get('mla_layers',c.get('sparse_mla_layers'))
                self.assertEqual(c['layers'],c['kda_layers']+attention)
    def test_no_weights_or_fabricated_measurements(self):
        self.assertFalse(list(ROOT.rglob('*.safetensors')))
        self.assertFalse((ROOT/'benchmarks/results').exists())

if __name__=='__main__': unittest.main()
