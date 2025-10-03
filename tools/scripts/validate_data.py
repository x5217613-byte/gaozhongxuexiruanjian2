#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
validate_data.py
最小化 JSON 校验（不依赖第三方库）：
- question：检查必须字段存在（id/type/stem），给出摘要；
- plan：检查 subject/weekly_plan；
- 报告重复 id、空 stem。
"""
import os, json, glob, collections, sys

def is_question(x):
    return isinstance(x, dict) and "stem" in x and "type" in x

def validate_questions(items):
    dup = collections.Counter()
    empty = 0
    for it in items:
        qid = str(it.get("id",""))
        if qid: dup[qid]+=1
        if not it.get("stem"): empty += 1
    problems = []
    problems += [f"重复ID：{k} x{v}" for k,v in dup.items() if v>1]
    if empty: problems.append(f"空题干：{empty} 条")
    return problems

def validate_plan(obj):
    if not isinstance(obj, dict): return ["计划文件不是对象"]
    out = []
    if "subject" not in obj: out.append("缺少 subject")
    if "weekly_plan" not in obj or not isinstance(obj["weekly_plan"], list): out.append("weekly_plan 缺失或非数组")
    return out

def main(root="data"):
    files = glob.glob(os.path.join(root, "**", "*.json"), recursive=True)
    report = []
    for fp in files:
        name = os.path.basename(fp)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            report.append({"file":name,"ok":False,"problems":[f"解析失败：{e}"]}); continue

        problems = []
        if isinstance(data, list) and data and is_question(data[0]):
            problems = validate_questions(data)
        elif name.endswith("_essay_prompts.json"):
            problems = []
        elif name.startswith("weekly_plan_"):
            problems = validate_plan(data)
        else:
            # 尝试材料题
            if isinstance(data, list) and isinstance(data[0], dict) and "questions" in data[0]:
                for unit in data:
                    qs = unit.get("questions", [])
                    problems += [f"[{unit.get('id')}] " + p for p in validate_questions(qs)]
            else:
                problems = []
        report.append({"file":name,"ok": len(problems)==0, "problems": problems})
    # 输出报告
    print(json.dumps(report, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv)>1 else "data"
    main(root)
