
/* knowledge_infer.js — heuristic knowledge point & qtype extraction */
window.KW = (function(){
  // Basic keyword dictionaries (extensible)
  const dict = {
    math: {
      knowledge: [
        [/函数|映射|一次函数|二次函数|指数函数|对数函数|幂函数/i, '函数'],
        [/集合|区间|命题|充要|必要|充分/i, '集合与命题'],
        [/三角函数|正弦|余弦|正切|诱导|同角三角/i, '三角函数'],
        [/数列|等差|等比|通项|求和|递推/i, '数列'],
        [/概率|统计|随机|分布|期望/i, '概率统计'],
        [/立体几何|向量|空间向量|平面向量/i, '向量与几何'],
        [/解析几何|直线|圆|椭圆|双曲线|抛物线/i, '解析几何'],
      ],
      qtype: [
        [/选择|单选|多选/i, '选择题'],
        [/填空/i, '填空题'],
        [/解答|证明|计算/i, '解答题'],
        [/压轴|综合/i, '综合题']
      ]
    },
    physics: {
      knowledge: [
        [/力学|匀变速|牛顿|受力|动量|功|能|功率/i, '力学'],
        [/电学|欧姆|电路|电阻|电容|电磁|磁感应/i, '电学与电磁'],
        [/热学|热力学|温度|内能/i, '热学'],
        [/光学|折射|反射|成像|干涉|衍射/i, '光学'],
        [/波动|简谐|共振|波速/i, '波动'],
      ],
      qtype: [
        [/选择|单选|多选/i, '选择题'],
        [/实验|误差|器材/i, '实验题'],
        [/计算|推导|分析/i, '计算题']
      ]
    },
    chemistry: {
      knowledge: [
        [/化学方程|氧化还原|电解|电化学/i, '电化学与反应'],
        [/有机|烷烃|烯烃|芳香|官能团/i, '有机化学'],
        [/溶液|酸碱|滴定|缓冲|pH/i, '溶液与酸碱'],
        [/离子方程|离子反应/i, '离子反应'],
        [/结构|键|杂化|晶体/i, '结构与物质性质'],
      ],
      qtype: [
        [/选择|单选|多选/i, '选择题'],
        [/实验|装置|现象/i, '实验题'],
        [/计算|定量|配平/i, '计算题']
      ]
    },
    english: {
      knowledge: [
        [/cloze|完形|cloze test/i, '完形填空'],
        [/reading|阅读理解|passage/i, '阅读理解'],
        [/grammar|语法|改错|错误更正|error/i, '语法改错'],
        [/writing|作文|写作/i, '写作'],
        [/vocabulary|词汇|近义|短语/i, '词汇与短语']
      ],
      qtype: [
        [/选择|单选|多选/i, '选择题'],
        [/阅读|七选五|匹配/i, '阅读题'],
        [/填空|完形/i, '完形填空'],
        [/写作|作文/i, '写作']
      ]
    }
  };

  function detect(subject, text){
    subject = (subject||'').toLowerCase();
    const t = (text||'').replace(/\s+/g,' ').slice(0,400);
    const pack = dict[subject] || dict.math;
    let knowledge = null, qtype = null;
    for (const [re,tag] of (pack.knowledge||[])){ if (re.test(t)){ knowledge = tag; break; } }
    for (const [re,tag] of (pack.qtype||[])){ if (re.test(t)){ qtype = tag; break; } }
    return {knowledge, qtype};
  }

  /** infer from localStorage review item or DOM text */
  function inferForItem(it){
    const subj = (it.subject||'').toLowerCase();
    const text = [it.title, it.desc, it.stem].filter(Boolean).join(' ');
    return detect(subj, text);
  }

  function inferForKey(subject, file, id, fallbackText){
    return detect(subject, fallbackText||'');
  }

  return { inferForItem, inferForKey };
})(); 
