#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# generate_weekly_plan_from_policy.py
# 基于 data_manifest.json 与 policy_review_v1.json 自动生成全科周计划（轻/标准/冲刺）

import json, argparse

def find_by_prefix(paths, prefix):
    prefix = prefix.lower()
    out = []
    for p in paths or []:
        name = p.lower()
        if prefix in name:
            out.append(p.split('/')[-1])
    return out

def pick(arr, i):
    return arr[i % len(arr)] if arr else None

def pick_count(rng, mode):
    if not rng or len(rng)<2: return 20
    lo, hi = rng
    if mode=='light': return lo
    if mode=='sprint': return hi
    return round((lo+hi)/2)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--manifest', default='data_manifest.json')
    ap.add_argument('--policy', default='policy/policy_review_v1.json')
    ap.add_argument('--mode', default='standard', choices=['light','standard','sprint'])
    ap.add_argument('--out', default='weekly_plan_auto_v1.json')
    args = ap.parse_args()

    with open(args.manifest, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    with open(args.policy, 'r', encoding='utf-8') as f:
        policy_full = json.load(f)
    pmode = policy_full.get('modes', {}).get(args.mode, {})
    time_min = pmode.get('time',{}).get('min', 60)
    time_max = pmode.get('time',{}).get('max', 90)

    m = manifest
    def pPractice(subj): return find_by_prefix(m.get('practice',[]), f"practice_{subj}")
    def pMaterials(kw):  return find_by_prefix(m.get('materials',[]), kw)
    def pEssays(subj):   return [p.split('/')[-1] for p in m.get('essays',[]) if subj in p.lower()]

    DAYS = ['周一','周二','周三','周四','周五','周六','周日']
    plan = {'subject': f'auto_{args.mode}', 'weekly_plan': []}
    daySubjects = ['math','english','physics','chemistry','biology','chinese','history']

    subj_cfg = policy_full.get('subject_daily', {})
    for i, day in enumerate(DAYS):
        subj = daySubjects[i] if i < len(daySubjects) else 'geography'
        d = {'day': day, 'time_suggestion': {'practice_min': time_min, 'practice_max': time_max}}
        if subj=='math':
            files = pPractice('math')
            rng = subj_cfg.get('math',{}).get('practice_range',[30,40])
            d['primary_task'] = {'file': pick(files,i), 'question_count': pick_count(rng, args.mode)}
            d['secondary_task'] = {'type':'thinking','requirement':'压轴题思路复盘'}
        elif subj=='english':
            files = pPractice('english')
            d['primary_task'] = {'file': pick(files,i), 'topic':'reading', 'passages': 1}
            d['secondary_task'] = {'file': pick(files,i+1), 'topic':'cloze_or_matching', 'question_count': 1, 'grammar': 10}
        elif subj in ['physics','chemistry','biology']:
            files = pPractice(subj)
            mats = pMaterials(f'{subj}_experiments') or pMaterials(subj)
            rng = subj_cfg.get(subj,{}).get('practice_range',[25,35])
            d['primary_task'] = {'file': pick(mats,i) or pick(files,i), 'index': (i%7)+1}
            d['secondary_task'] = {'file': pick(files,i+1), 'question_count': pick_count(rng, args.mode)}
        elif subj in ['chinese','history','geography','politics']:
            mats = pMaterials(subj) or pMaterials('materials')
            rng = subj_cfg.get(subj,{}).get('practice_range',[10,15])
            d['primary_task'] = {'file': pick(mats,i), 'type':'materials', 'index': (i%7)+1}
            d['secondary_task'] = {'file': pick(pPractice(subj),i), 'question_count': pick_count(rng, args.mode)}
        else:
            d['primary_task'] = {'type':'self_study','requirement':'自学并做同步练习 30 题'}
            d['secondary_task'] = {'type':'recap','requirement':'总结错因卡片'}
        plan['weekly_plan'].append(d)
    plan['weekly_plan'][6]['full_task'] = {'type':'composite', 'requirement':'综合套题/大作文/实验报告'}

    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    print('✅ 生成：', args.out)

if __name__ == '__main__':
    main()
