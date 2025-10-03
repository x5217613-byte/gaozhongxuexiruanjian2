#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
migrate_to_schema_v1.py
将 data/ 下杂项题库统一迁移为 Schema v1.0（question/exam item）。
不会覆盖原文件，迁移结果写入 data_migrated/。
"""
import os, json, glob, hashlib

def unify_question(q):
    # 兼容旧字段
    explanation = q.get("explanation") or q.get("marking_guide") or q.get("solution")
    answer = q.get("answer")
    if isinstance(answer, str) and answer.isdigit():
        answer = int(answer)
    return {
        "id": q.get("id") or q.get("qid") or str(abs(hash(q.get("stem",""))) % 10**10),
        "subject": q.get("subject"),
        "module": q.get("chapter") or q.get("chapterId"),
        "type": q.get("type","single"),
        "stem": q.get("stem",""),
        "options": q.get("options", []),
        "answer": answer,
        "explanation": explanation,
        "tags": q.get("tags", []),
        "difficulty": q.get("difficulty") if isinstance(q.get("difficulty"), (int,float)) else None,
        "points": q.get("points") if isinstance(q.get("points"), (int,float)) else None,
        "time_suggest": q.get("time_suggest") if isinstance(q.get("time_suggest"), (int,float)) else None,
        "source": q.get("source") or q.get("file")
    }

def unify_material_unit(u):
    # 把材料题整成 {id, source, questions:[...]}
    src = u.get("source") or u.get("sources") or ""
    qs = [unify_question(q) for q in u.get("questions", [])]
    return {
        "id": u.get("id"),
        "source": src,
        "questions": qs,
        "suggested_time_min": u.get("suggested_time_min", 20)
    }

def main(root="data", out="data_migrated"):
    os.makedirs(out, exist_ok=True)
    files = glob.glob(os.path.join(root, "**", "*.json"), recursive=True)
    for fp in files:
        name = os.path.basename(fp)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            print("跳过（非JSON）：", name, e); continue

        # practice_*: 题目数组
        if name.startswith("practice_") and isinstance(data, list):
            out_items = [unify_question(q) for q in data]
            with open(os.path.join(out, name), "w", encoding="utf-8") as f:
                json.dump(out_items, f, ensure_ascii=False, indent=2)
            print("迁移：", name, "→", os.path.join(out, name))
            continue

        # materials_*: 材料数组
        if name.startswith("materials_") and isinstance(data, list):
            out_items = [unify_material_unit(u) for u in data]
            with open(os.path.join(out, name), "w", encoding="utf-8") as f:
                json.dump(out_items, f, ensure_ascii=False, indent=2)
            print("迁移：", name, "→", os.path.join(out, name))
            continue

        # *_essay_prompts.json: 保留原结构
        if name.endswith("_essay_prompts.json"):
            with open(os.path.join(out, name), "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print("拷贝作文：", name); continue

        # 其它：原样复制
        with open(os.path.join(out, name), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            print("拷贝：", name)

if __name__ == "__main__":
    main()
