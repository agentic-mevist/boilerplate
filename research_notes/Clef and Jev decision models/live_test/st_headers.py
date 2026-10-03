import json, struct, subprocess, sys, collections
def header(repo, fname):
    url=f"https://huggingface.co/{repo}/resolve/main/{fname}"
    b=subprocess.run(["curl","-sSL","--max-time","60","-r","0-7",url],capture_output=True).stdout
    n=struct.unpack("<Q",b[:8])[0]
    h=subprocess.run(["curl","-sSL","--max-time","120","-r",f"8-{8+n-1}",url],capture_output=True).stdout
    return json.loads(h)
DT={"BF16":2,"F16":2,"F32":4,"F8_E4M3":1,"I8":1,"U8":1,"I64":8,"I32":4}
def numel(s):
    p=1
    for x in s: p*=x
    return p
out={}
for repo,shards in [("Cloudflare/clef",[f"model-{i:05d}-of-00012.safetensors" for i in range(1,13)]),
                    ("Cloudflare/clef-flash",[f"model-{i:05d}-of-00004.safetensors" for i in range(1,5)])]:
    groups=collections.Counter(); dtypes=collections.Counter(); keys=0; lora=0
    for f in shards+["joint_head.safetensors"]:
        h=header(repo,f)
        for k,v in h.items():
            if k=="__metadata__": continue
            keys+=1
            n=numel(v["shape"]); dtypes[(f=="joint_head.safetensors",v["dtype"])]+=n
            if "lora" in k.lower(): lora+=n
            if f=="joint_head.safetensors": g="joint_head"
            elif ".visual." in k or k.startswith("model.visual") or "visual" in k: g="vision_encoder(+merger)"
            elif "embed_tokens" in k: g="input_embeddings"
            elif k.startswith("lm_head"): g="lm_head(output_embeddings)"
            elif "mtp" in k: g="mtp"
            else: g="language_model_layers(+norm)"
            groups[g]+=n
        if f=="joint_head.safetensors":
            sample=[ (k,v["shape"],v["dtype"]) for k,v in list(h.items())[:6] if k!="__metadata__"]
            print(repo,"joint_head sample tensors:",sample, "metadata:",h.get("__metadata__"))
    tot=sum(groups.values())
    print(f"\n=== {repo}: {keys} tensors; lora-named params: {lora}")
    for g,n in groups.most_common(): print(f"  {g:32s} {n:>15,d}  ({n/1e9:.3f} B)")
    print(f"  {'TOTAL incl. head':32s} {tot:>15,d}  ({tot/1e9:.3f} B)")
    print("  dtypes (is_head, dtype)->params:",dict(dtypes))
    out[repo]={"groups":dict(groups),"total":tot,"dtypes":{str(k):v for k,v in dtypes.items()},"lora_named":lora}
json.dump(out,open("param_breakdown.json","w"),indent=1)
