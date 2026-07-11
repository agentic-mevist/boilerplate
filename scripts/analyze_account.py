#!/usr/bin/env python3
"""Compute a per-account analytics summary from Apify instagram-scraper posts JSON.

Usage: python3 analyze_account.py <posts.json> <followers_count> [out.json]
Prints a human summary; optionally writes structured JSON.
"""
import json
import re
import statistics as st
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

NOW = datetime(2026, 7, 11, tzinfo=timezone.utc)


def parse_ts(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def analyze(posts, followers):
    posts = [p for p in posts if p.get("timestamp")]
    for p in posts:
        p["_dt"] = parse_ts(p["timestamp"])
    posts.sort(key=lambda p: p["_dt"])
    if not posts:
        return {}

    span_days = max((posts[-1]["_dt"] - posts[0]["_dt"]).days, 1)
    per_month = defaultdict(int)
    for p in posts:
        per_month[p["_dt"].strftime("%Y-%m")] += 1

    likes = [p.get("likesCount") or 0 for p in posts]
    comments = [p.get("commentsCount") or 0 for p in posts]
    vids = [p for p in posts if p.get("type") == "Video"]
    views = [p.get("videoViewCount") or 0 for p in vids if p.get("videoViewCount")]

    by_type = defaultdict(list)
    for p in posts:
        by_type[p.get("type", "?")].append(p.get("likesCount") or 0)

    # engagement rate per post vs followers
    er = [(l + c) / followers * 100 for l, c in zip(likes, comments)] if followers else []

    # caption stats
    cap_lens = [len(p.get("caption") or "") for p in posts]
    hashtags = Counter()
    for p in posts:
        for h in re.findall(r"#\w+", p.get("caption") or ""):
            hashtags[h.lower()] += 1

    # top and bottom posts
    def brief(p):
        return {
            "shortCode": p.get("shortCode"),
            "type": p.get("type"),
            "date": p["_dt"].strftime("%Y-%m-%d"),
            "likes": p.get("likesCount"),
            "comments": p.get("commentsCount"),
            "views": p.get("videoViewCount"),
            "caption": (p.get("caption") or "")[:200],
            "url": f"https://www.instagram.com/p/{p.get('shortCode')}/",
        }

    top_by_likes = [brief(p) for p in sorted(posts, key=lambda p: p.get("likesCount") or 0, reverse=True)[:10]]
    top_videos = [brief(p) for p in sorted(vids, key=lambda p: p.get("videoViewCount") or 0, reverse=True)[:10]]

    summary = {
        "n_posts": len(posts),
        "date_from": posts[0]["_dt"].strftime("%Y-%m-%d"),
        "date_to": posts[-1]["_dt"].strftime("%Y-%m-%d"),
        "span_days": span_days,
        "posts_per_week": round(len(posts) / (span_days / 7), 2),
        "per_month": dict(sorted(per_month.items())),
        "format_mix": {k: len(v) for k, v in by_type.items()},
        "format_median_likes": {k: st.median(v) for k, v in by_type.items()},
        "likes": {"median": st.median(likes), "mean": round(st.mean(likes), 1), "max": max(likes)},
        "comments": {"median": st.median(comments), "mean": round(st.mean(comments), 1)},
        "video_views": {
            "n": len(views),
            "median": st.median(views) if views else None,
            "mean": round(st.mean(views), 1) if views else None,
            "max": max(views) if views else None,
        },
        "er_median_pct": round(st.median(er), 3) if er else None,
        "er_mean_pct": round(st.mean(er), 3) if er else None,
        "caption_len": {"median": st.median(cap_lens), "max": max(cap_lens)},
        "top_hashtags": hashtags.most_common(15),
        "top_by_likes": top_by_likes,
        "top_videos": top_videos,
    }
    return summary


if __name__ == "__main__":
    posts = json.load(open(sys.argv[1]))
    followers = int(sys.argv[2])
    s = analyze(posts, followers)
    if len(sys.argv) > 3:
        json.dump(s, open(sys.argv[3], "w"), ensure_ascii=False, indent=1, default=str)
    for k in ["n_posts", "date_from", "date_to", "posts_per_week", "format_mix",
              "format_median_likes", "likes", "comments", "video_views", "er_median_pct"]:
        print(f"{k}: {s.get(k)}")
    print("per_month:", json.dumps(s.get("per_month"), ensure_ascii=False))
