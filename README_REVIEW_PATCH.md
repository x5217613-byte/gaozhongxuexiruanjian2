# 英语错词回炉补丁使用说明

训练结束页会出现 **“下载回炉补丁(英语)”** 按钮, 生成形如:
`weekly_plan_patch_english_review_YYYY-MM-DD.json`.

补丁包含 3 天的微计划(今天 / +1 / +3), 任务类型 `vocab_review` , 字段携带 `words` 与 `duration_min`。

## 合并到周计划

### A. 命令行合并(推荐)
```bash
cd <项目根目录>
python tools/scripts/merge_weekly_plan_patch.py --patch ./weekly_plan_patch_english_review_YYYY-MM-DD.json
```
默认将补丁合入 `weekly_plans/weekly_plan_english_mixed_v1.json` 的 `extra_tasks` 字段, 不影响原有 `primary_task/secondary_task/full_task`。

### B. 前端导入
若你已在前端实现了周计划导入, 直接导入该补丁即可; 或导出当前计划后用上面的脚本合并再导入。

## 补丁 Schema
```json
{
  "patch_for": "weekly_plan_english_mixed_v1.json",
  "created": "2025-10-03T09:00:00.000Z",
  "generator": "vocab-daily",
  "days": [
    {
      "date": "2025-10-03",
      "tasks": [
        {"type": "vocab_review", "title": "错词回炉（英语）", "words": ["ability","benefit"], "duration_min": 20}
      ]
    }
  ]
}
```
