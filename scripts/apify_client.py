#!/usr/bin/env python3
"""Thin Apify API client used across this research project.

Usage as CLI:
  python3 apify_client.py run <actor_id> <input.json> [--timeout 600]   # sync run, prints dataset items JSON
  python3 apify_client.py start <actor_id> <input.json>                 # async start, prints run info
  python3 apify_client.py status <run_id>                               # check run status
  python3 apify_client.py items <dataset_id>                           # fetch dataset items
"""
import json
import os
import sys
import time

import requests

TOKEN = os.environ["APIFY_API_KEY"]
BASE = "https://api.apify.com/v2"


def _req(method, path, **kw):
    kw.setdefault("timeout", 120)
    params = kw.pop("params", {})
    params["token"] = TOKEN
    r = requests.request(method, f"{BASE}{path}", params=params, **kw)
    r.raise_for_status()
    return r.json()


def start_actor(actor_id: str, run_input: dict) -> dict:
    actor_id = actor_id.replace("/", "~")
    data = _req("POST", f"/acts/{actor_id}/runs", json=run_input)
    return data["data"]


def run_status(run_id: str) -> dict:
    return _req("GET", f"/actor-runs/{run_id}")["data"]


def dataset_items(dataset_id: str) -> list:
    params = {"clean": "true", "format": "json"}
    r = requests.get(
        f"{BASE}/datasets/{dataset_id}/items",
        params={**params, "token": TOKEN},
        timeout=300,
    )
    r.raise_for_status()
    return r.json()


def run_actor_sync(actor_id: str, run_input: dict, timeout_s: int = 600, poll_s: int = 10) -> list:
    """Start actor, poll until done, return dataset items."""
    run = start_actor(actor_id, run_input)
    run_id = run["id"]
    started = time.time()
    while True:
        st = run_status(run_id)
        status = st["status"]
        if status in ("SUCCEEDED",):
            return dataset_items(st["defaultDatasetId"])
        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
            raise RuntimeError(f"Run {run_id} ended with {status}: {st.get('statusMessage')}")
        if time.time() - started > timeout_s:
            raise TimeoutError(f"Run {run_id} still {status} after {timeout_s}s")
        time.sleep(poll_s)


def main():
    cmd = sys.argv[1]
    if cmd == "run":
        actor = sys.argv[2]
        with open(sys.argv[3]) as f:
            run_input = json.load(f)
        timeout = 600
        if "--timeout" in sys.argv:
            timeout = int(sys.argv[sys.argv.index("--timeout") + 1])
        items = run_actor_sync(actor, run_input, timeout_s=timeout)
        json.dump(items, sys.stdout, ensure_ascii=False)
    elif cmd == "start":
        actor = sys.argv[2]
        with open(sys.argv[3]) as f:
            run_input = json.load(f)
        info = start_actor(actor, run_input)
        print(json.dumps({"id": info["id"], "datasetId": info["defaultDatasetId"], "status": info["status"]}))
    elif cmd == "status":
        st = run_status(sys.argv[2])
        print(json.dumps({"status": st["status"], "datasetId": st["defaultDatasetId"],
                          "itemCount": st.get("stats", {}).get("datasetItemCount"),
                          "msg": st.get("statusMessage")}))
    elif cmd == "items":
        json.dump(dataset_items(sys.argv[2]), sys.stdout, ensure_ascii=False)
    else:
        sys.exit(f"unknown command {cmd}")


if __name__ == "__main__":
    main()
