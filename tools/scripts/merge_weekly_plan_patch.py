#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""merge_weekly_plan_patch.py
将回炉补丁(如 weekly_plan_patch_english_review_2025-10-03.json)合并到
weekly_plans/weekly_plan_english_mixed_v1.json 中。

规则:
- 按补丁 days[].date 匹配周计划中对应日期;
- 把补丁 tasks[] 追加到该日的 `extra_tasks` 数组(没有则新建);
- 不改动 `primary_task/secondary_task/full_task`;
- 若该日不存在, 则新建一个仅包含 extra_tasks 的日项。
"""
import json, os, sys, argparse, datetime

def load_json(p):
    with open(p,'r',encoding='utf-8') as f:
        return json.load(f)

def save_json(p, obj):
    with open(p,'w',encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def ensure_date_string(s):
    try:
        if len(s)>=10: return s[:10]
    except Exception:
        pass
    return s

def merge_patch(plan_path, patch_path, out_path=None):
    plan = load_json(plan_path)
    patch = load_json(patch_path)
    if 'weekly_plan' not in plan:
        plan['weekly_plan'] = []
    # index by date
    idx = {}
    for day in plan['weekly_plan']:
        d = ensure_date_string(day.get('date',''))
        if d:
            idx[d] = day
    # apply
    for d in patch.get('days', []):
        date = ensure_date_string(d.get('date',''))
        if not date:
            continue
        day = idx.get(date)
        if not day:
            day = {'date': date}
            plan['weekly_plan'].append(day)
            idx[date] = day
        extra = day.get('extra_tasks', [])
        for t in d.get('tasks', []):
            extra.append(t)
        day['extra_tasks'] = extra

    # sort days by date
    def parse_date(s):
        try:
            return datetime.datetime.strptime(ensure_date_string(s), "%Y-%m-%d")
        except Exception:
            return datetime.datetime.max
    plan['weekly_plan'] = sorted(plan['weekly_plan'], key=lambda x: parse_date(x.get('date','9999-12-31')))

    out = out_path or plan_path
    save_json(out, plan)
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', default='weekly_plans/weekly_plan_english_mixed_v1.json')
    ap.add_argument('--patch', required=True, help='weekly_plan_patch_english_review_*.json')
    ap.add_argument('--out', default='weekly_plans/weekly_plan_english_mixed_v1.json')
    args = ap.parse_args()
    out = merge_patch(args.plan, args.patch, args.out)
    print('✅ Merged into:', out)

if __name__ == "__main__":
    main()
