# 错题回炉周计划（7天）
- 在 “一周计划” 标签点击【从错题本生成7天回炉计划】即可预览；点击【导出回炉计划】保存 JSON。
- 在 “错题本” 标签也提供同样的快捷按钮（便于先导入 wrongbook.json 再生成）。
- 离线脚本：tools/scripts/wrongbook_to_weekly_plan.py
  ```bash
  python tools/scripts/wrongbook_to_weekly_plan.py --input wrongbook.json --output weekly_plan_review_v1.json
  ```
- 生成的计划遵循 Schema v1：`primary_task/secondary_task/full_task`，可直接导入你的前端。
