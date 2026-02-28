---
name: data-analysis
description: Complete data analysis workflow - process data, perform calculations, and generate visualization code
version: 1.0.0
author: Mechanical-Revolution
agents:
  - orchestrator
  - mathematician
  - coder
---

# Data Analysis Skill

## Description

Data Analysis 是一个完整的数据分析工作流程，涵盖数据处理、统计计算和可视化代码生成。

这个 skill 展示了如何使用 Task Decomposition 处理数据分析任务：
1. **计算阶段**：mathematician agent 执行统计分析和数值计算
2. **可视化阶段**：coder agent 生成数据可视化代码
3. **结果整合**：orchestrator 将分析结果和可视化代码整合

## When to Use

适用场景：

- 数据统计分析 + 图表生成
- 财务计算 + 报表代码
- 科学计算 + 结果可视化
- 性能分析 + 监控图表

示例任务：

- "分析这组销售数据，计算同比增长率，并生成 Python 可视化代码"
- "计算投资组合的收益率和风险指标，然后用 JavaScript 生成图表"
- "统计用户行为数据，计算转化率，并创建 Dashboard 代码"
- "分析服务器性能指标，计算 P95/P99 延迟，并生成监控图表"

## How It Works

### 执行流程

```
用户：分析数据 X，计算指标 Y，生成可视化 Z
    ↓
Orchestrator 分析
    ↓ 识别：需要计算 + 编码
    ↓ 分解：
    ↓   子任务1: 统计分析和计算
    ↓   子任务2: 生成可视化代码
    ↓
Handoff to Mathematician
    ↓
Mathematician 执行计算
    ↓ 使用 calculator tool
    ↓ 统计分析（均值、方差、增长率等）
    ↓ 返回计算结果和分析报告
    ↓
Handoff back to Orchestrator
    ↓
Orchestrator 接收计算结果
    ↓ 决策：需要生成可视化代码
    ↓ 将计算结果作为数据源传递
    ↓
Handoff to Coder
    ↓
Coder 生成可视化代码
    ↓ 基于计算结果选择合适的图表类型
    ↓ 使用合适的可视化库（matplotlib, Chart.js, D3.js 等）
    ↓ 返回完整的可视化代码
    ↓
Handoff back to Orchestrator
    ↓
Orchestrator 聚合结果
    ↓ 组织：分析报告 + 可视化代码
    ↓ 返回完整响应
```

### 关键优势

1. **精确计算**：mathematician 使用工具确保数值准确性
2. **数据驱动**：可视化代码基于实际的计算结果
3. **完整流程**：从原始数据到最终图表的完整链路
4. **可复现**：代码可以直接运行，复现分析结果

## Example

### 示例 1：销售数据分析

**输入**：
```
分析以下销售数据，计算同比增长率，并生成 Python 可视化代码：
2023年: 100万
2024年: 130万
```

**Orchestrator 分析**：
```
任务分析：
- 需要计算同比增长率
- 需要生成可视化代码

分解计划：
1. 计算任务 → mathematician
2. 可视化任务 → coder
```

**Mathematician 输出**：
```markdown
# 销售数据分析

## 原始数据
- 2023年销售额: 100万元
- 2024年销售额: 130万元

## 计算过程
同比增长率 = (2024年 - 2023年) / 2023年 × 100%
            = (130 - 100) / 100 × 100%
            = 30%

## 分析结果
- 绝对增长: 30万元
- 同比增长率: 30%
- 结论: 销售额显著增长，表现良好
```

**Coder 输出**：
```python
import matplotlib.pyplot as plt
import numpy as np

# 销售数据
years = ['2023', '2024']
sales = [100, 130]  # 单位：万元

# 创建柱状图
fig, ax = plt.subplots(figsize=(10, 6))

bars = ax.bar(years, sales, color=['#3498db', '#2ecc71'], width=0.6)

# 添加数值标签
for bar in bars:
    height = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2., height,
            f'{height}万',
            ha='center', va='bottom', fontsize=12)

# 添加增长率标注
ax.annotate('↑ 30%', xy=(1, 130), xytext=(0.5, 120),
            arrowprops=dict(arrowstyle='->', color='red', lw=2),
            fontsize=14, color='red', weight='bold')

# 图表设置
ax.set_ylabel('销售额（万元）', fontsize=12)
ax.set_title('年度销售额对比', fontsize=14, weight='bold')
ax.set_ylim(0, 150)
ax.grid(axis='y', alpha=0.3)

plt.tight_layout()
plt.savefig('sales_comparison.png', dpi=300)
plt.show()

print("图表已保存为 sales_comparison.png")
print(f"2024年同比增长率: 30%")
```

**最终输出**：
```markdown
# 销售数据分析报告

## 数据概览
- 2023年销售额: 100万元
- 2024年销售额: 130万元

## 关键指标
- **同比增长率**: 30%
- **绝对增长**: 30万元

## 可视化代码
[上述 Python 代码]

## 使用说明
1. 安装依赖: `pip install matplotlib numpy`
2. 运行代码生成图表
3. 图表将保存为 sales_comparison.png
```

### 示例 2：投资收益分析

**输入**：
```
计算 10000 元在 5% 年利率下 10 年的复利，并用 JavaScript 生成收益曲线图
```

**执行流程**：
```
orchestrator → mathematician (计算复利) → orchestrator → coder (生成 Chart.js 代码) → orchestrator
```

**Mathematician 输出**：
```
复利公式: A = P(1 + r)^t
计算: 10000 × (1 + 0.05)^10 = 16288.95 元

逐年收益：
年份 1: 10500.00
年份 2: 11025.00
年份 3: 11576.25
...
年份 10: 16288.95

总收益: 6288.95 元
年化收益率: 5%
```

**Coder 输出**：
```javascript
// 使用 Chart.js 生成复利增长曲线
const ctx = document.getElementById('compoundInterestChart').getContext('2d');

const data = {
  labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  datasets: [{
    label: '投资价值（元）',
    data: [10000, 10500, 11025, 11576.25, 12155.06, 12762.82,
           13400.96, 14071.00, 14774.55, 15513.28, 16288.95],
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    fill: true,
    tension: 0.4
  }]
};

const config = {
  type: 'line',
  data: data,
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: '10年复利增长曲线（5% 年利率）'
      },
      tooltip: {
        callbacks: {
          label: (context) => `¥${context.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value) => `¥${value}`
        }
      },
      x: {
        title: {
          display: true,
          text: '年份'
        }
      }
    }
  }
};

new Chart(ctx, config);
```

## Configuration

### 基础配置

```typescript
import {
  defineAgent,
  defineTool,
  handoff,
  createOrchestratorInstructions,
  MATHEMATICIAN_PROMPT,
  CODER_PROMPT,
} from "mechanical-revolution";
import { z } from "zod";

// 计算工具
const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string(),
  }),
  execute: async ({ expression }) => {
    const result = eval(expression); // 生产环境使用安全的计算库
    return { result: String(result) };
  },
});

// Mathematician Agent
const mathAgent = defineAgent({
  name: "mathematician",
  instructions: MATHEMATICIAN_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [calculatorTool],
  capabilities: {
    summary: "Mathematical computation and analysis specialist",
    skills: [
      "calculations",
      "statistical_analysis",
      "financial_calculations",
      "data_analysis",
    ],
    useCases: [
      "Solving equations",
      "Statistical computations",
      "Financial analysis",
    ],
    limitations: ["Cannot generate visualization code"],
  },
});

// Coder Agent
const coderAgent = defineAgent({
  name: "coder",
  instructions: CODER_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4",
  capabilities: {
    summary: "Software development specialist",
    skills: [
      "code_writing",
      "data_visualization",
      "chart_generation",
    ],
    useCases: [
      "Creating visualization code",
      "Generating charts",
      "Dashboard development",
    ],
    limitations: ["Cannot perform calculations"],
  },
});

// Orchestrator
const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions([mathAgent, coderAgent]),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(mathAgent, {
      description: "Delegate mathematical and statistical tasks",
    }),
    handoff(coderAgent, {
      description: "Delegate visualization and coding tasks",
    }),
  ],
});
```

### 使用示例

```typescript
const runner = new Runner(config, [orchestrator, mathAgent, coderAgent]);

const result = await runner.run(
  orchestrator,
  "分析销售数据，计算增长率，并生成可视化代码"
);

console.log(result.output);
// 输出包含：
// 1. 统计分析结果
// 2. 计算过程和结论
// 3. 完整的可视化代码
```

## Best Practices

### 1. 提供清晰的数据

在任务描述中包含具体的数据：

✅ 好的示例：
- "分析销售数据 [2023: 100万, 2024: 130万]，计算增长率并可视化"
- "计算 10000 元在 5% 利率下 10 年的复利，生成曲线图"

❌ 不好的示例：
- "分析一下数据"（没有具体数据）
- "做个图表"（缺少数据和需求）

### 2. 明确可视化需求

指定图表类型或可视化库：

```
"用 Python matplotlib 生成柱状图"
"用 JavaScript Chart.js 创建折线图"
"用 D3.js 制作交互式仪表盘"
```

### 3. 优化数据传递

确保计算结果完整传递给 coder：

```typescript
handoff(coderAgent, {
  description: "Generate visualization code",
  inputFilter: (history) => {
    // 确保包含计算结果
    return history.filter(msg =>
      msg.role === 'assistant' && msg.content.includes('计算结果')
    );
  },
})
```

### 4. 处理大数据集

对于大数据集，考虑：
- 在任务描述中提供数据摘要
- 使用文件引用而非直接嵌入数据
- 让 coder 生成数据加载代码

## Troubleshooting

### 问题：计算结果不准确

**原因**：calculator tool 实现有问题或表达式错误

**解决**：
1. 使用更可靠的计算库（如 math.js）
2. 在 mathematician prompt 中强调验证结果
3. 添加单位测试

### 问题：可视化代码无法运行

**原因**：coder 没有正确使用计算结果或库版本不匹配

**解决**：
1. 在 handoff 时明确指定可视化库和版本
2. 要求 coder 包含依赖安装说明
3. 提供数据格式示例

### 问题：分析不够深入

**原因**：mathematician 只做了基础计算

**解决**：
1. 在任务描述中明确分析深度
2. 优化 MATHEMATICIAN_PROMPT，要求更详细的分析
3. 添加更多统计分析工具

## Related

- [Task Decomposition Skill](../task-decomposition.md)
- [Research and Code Skill](./research-and-code.md)
- [完整示例代码](../../examples/task-decomposition-demo.ts)
