#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
wrongbook_to_weekly_plan.py
输入 wrongbook.json（来自前端导出的错题本），产出 7 天回炉计划 weekly_plan_review_v1.json
用法：
  python wrongbook_to_weekly_plan.py --input wrongbook.json --output weekly_plan_review_v1.json
"""
import json, argparse, re
def detect_subject(name:str)->str:
    s=(name or "").lower()
    for key in ["math","english","chinese","history","geography","politics","physics","chemistry","biology"]:
        if key in s: return key
    return "mixed"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--policy', default='policy/policy_review_v1.json')
    ap.add_argument('--mode', default='standard')
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", default="weekly_plan_review_v1.json")
    args = ap.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        wb = json.load(f)

    by = {}

    # load policy
    try:
        with open(args.policy, "r", encoding="utf-8") as pf:
            policy = json.load(pf)
        pmode = policy.get("modes", {}).get(args.mode, {})
        target_review = pmode.get("daily_target", {}).get("review_count", 30)
        tmin = pmode.get("time", {}).get("min", 60)
        tmax = pmode.get("time", {}).get("max", 90)
    except Exception:
        target_review = 30
        tmin, tmax = 60, 90

    for w in wb:
        subj = detect_subject(w.get("file",""))
        by.setdefault(subj, []).append({"file": w.get("file"), "id": w.get("id"), "stem": w.get("stem")})

    # round-robin interleave
    buckets = [by[k][:] for k in sorted(by.keys())]
    flat = []
    added = True
    while added:
        added=False
        for b in buckets:
            if b:
                flat.append(b.pop(0)); added=True

    days = [[] for _ in range(7)]
    for i, it in enumerate(flat):
        days[i%7].append(it)

    plan = {"subject":"review_mixed","weekly_plan":[]}
    names = ["周一","周二","周三","周四","周五","周六","周日"]
    for i in range(7):
        plan["weekly_plan"].append({
            "day": names[i],
            "primary_task": {"type":"review_set","items":days[i][:target_review]},
            "secondary_task": {"type":"recap","requirement":"回顾错因，补记错因卡片，二次练习易混题各2题"},
            "time_suggestion": {"practice_min": tmin, "practice_max": tmax}
        })
    plan["weekly_plan"][6]["full_task"] = {"type":"mock_from_wrongbook","items":flat[:30],"requirement":"综合回炉（30题）+ 错因短评（300字）"}

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    print("✅ 已生成：", args.output)

if __name__ == "__main__":
    main()
