# TF-IDF Agent Matcher - 实现文档

## 概述

基于 **TF-IDF (Term Frequency - Inverse Document Frequency)** 和 **余弦相似度** 的 Agent 匹配系统，用于智能地将任务分配给最合适的 Agent。

## 理论基础

### TF-IDF

**来源**: Salton & McGill (1983) - "Introduction to Modern Information Retrieval"

**核心思想**:
- **TF (Term Frequency)**: 词在文档中出现的频率
- **IDF (Inverse Document Frequency)**: 词的区分度（稀有词更重要）

**公式**:
```
TF-IDF(term, doc) = TF(term, doc) × IDF(term)

其中:
TF(term, doc) = count(term in doc)
IDF(term) = log((N + 1) / (df(term) + 1)) + 1

N: 总文档数
df(term): 包含该词的文档数
```

### 余弦相似度

**公式**:
```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)

对于归一化向量:
cosine_similarity(A, B) = A · B = Σ(Aᵢ × Bᵢ)
```

**取值范围**: [0, 1]
- 1: 完全相同
- 0: 完全不相关

## 实现原理

### 1. 初始化阶段

```typescript
constructor(agents: AgentConfig[]) {
  this.buildVocabulary();      // 构建词汇表
  this.calculateIDF();         // 计算 IDF 分数
  this.vectorizeAgents();      // 向量化所有 Agent
}
```

#### 1.1 构建词汇表

从所有 Agent 的能力描述中提取词汇：

```typescript
// Agent 能力描述 → 文档
agentToDocument(agent) {
  return [
    agent.capabilities.summary,
    ...agent.capabilities.modelStrengths,
    ...agent.capabilities.taskTypes,
    ...agent.capabilities.bestFor,
  ].join(' ');
}

// 分词（支持中英文）
tokenize(text) {
  // 中文：按字分词
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);

  // 英文：按词分词
  const englishWords = text.toLowerCase().match(/[a-z0-9_]+/g);

  return [...chineseChars, ...englishWords];
}
```

**示例**:
```
Input: "Claude Opus 4 - 编码能力突出"
Tokens: ["编", "码", "能", "力", "突", "出", "claude", "opus", "4"]
```

#### 1.2 计算 IDF

统计每个词在多少个 Agent 中出现，计算其重要性：

```typescript
// 词在所有 Agent 中都出现 → IDF 低（不重要）
// 词只在少数 Agent 中出现 → IDF 高（重要）

IDF("代码") = log((3 + 1) / (1 + 1)) + 1 = 1.69  // 只在 Claude Opus 中
IDF("能力") = log((3 + 1) / (3 + 1)) + 1 = 1.00  // 在所有 Agent 中
```

#### 1.3 向量化 Agent

将每个 Agent 转换为 TF-IDF 向量：

```typescript
// 词汇表: ["编", "码", "图", "像", "中", "文", ...]
// Claude Opus 向量: [0.8, 0.7, 0.0, 0.0, 0.2, 0.1, ...]
// Doubao 向量:      [0.1, 0.0, 0.9, 0.8, 0.9, 0.9, ...]
```

### 2. 匹配阶段

```typescript
findBestAgent(input, currentAgent, availableAgents) {
  // 1. 将用户输入向量化
  const inputVector = this.documentToVector(input);

  // 2. 计算与所有 Agent 的相似度
  const similarities = agents.map(agent => ({
    agent,
    similarity: this.cosineSimilarity(inputVector, agentVector),
  }));

  // 3. 找到最高相似度
  const best = max(similarities);

  // 4. 决策是否切换
  const shouldHandoff = (best.similarity - currentSimilarity) > 0.15;

  return { bestAgent, shouldHandoff, similarity, reasoning };
}
```

## 测试结果

### 测试统计

- **词汇表大小**: 109 个词
- **向量维度**: 109
- **测试用例**: 8 个
- **通过率**: 100%

### 典型案例

#### 案例 1: 编码任务自动切换

```
输入: "帮我设计一个二叉树遍历算法"
当前 Agent: doubao-chinese-vision

结果:
- 最佳 Agent: claude-opus-coder
- 相似度: 36.7%
- 是否切换: Yes
- 原因: "二叉树"、"算法" 等词与 Claude Opus 的能力描述高度匹配
```

**匹配分数**:
- claude-opus-coder: 36.7% ✓
- claude-sonnet-analyst: 15.8%
- doubao-chinese-vision: 0.0%

#### 案例 2: 图像任务自动切换

```
输入: "分析这张图片中的文字内容"
当前 Agent: claude-opus-coder

结果:
- 最佳 Agent: doubao-chinese-vision
- 相似度: 72.9%
- 是否切换: Yes
- 原因: "图片"、"文字"、"内容" 等词与 Doubao 的能力描述高度匹配
```

**匹配分数**:
- doubao-chinese-vision: 72.9% ✓
- claude-sonnet-analyst: 17.2%
- claude-opus-coder: 0.0%

#### 案例 3: 保持当前 Agent

```
输入: "优化这段 TypeScript 代码的性能"
当前 Agent: claude-opus-coder

结果:
- 最佳 Agent: claude-opus-coder
- 相似度: 46.3%
- 是否切换: No
- 原因: 当前 Agent 已经是最佳选择
```

**匹配分数**:
- claude-opus-coder: 46.3% ✓
- doubao-chinese-vision: 2.3%
- claude-sonnet-analyst: 1.3%

## 优势

### ✅ 有理论支撑
- 基于经典的信息检索算法
- 在搜索引擎、推荐系统中广泛应用
- 数十年的实践验证

### ✅ 不依赖枚举
- 自动从 Agent 能力描述中学习
- 无需手动定义特征维度
- 无需手动设置权重

### ✅ 高效
- 初始化一次，后续查询 < 10ms
- 零 API 调用成本
- 适合高频调用场景

### ✅ 可解释
- 可以查看每个 Agent 的匹配分数
- 可以分析输入的关键词权重
- 可以追踪决策过程

### ✅ 支持多语言
- 中英文混合输入
- 自动识别语言特征
- 无需额外配置

## 局限性

### ⚠️ 依赖文本描述质量

**问题**: 如果 Agent 的能力描述不准确或不完整，匹配效果会下降。

**解决方案**:
- 编写详细的能力描述
- 包含关键词和同义词
- 定期更新和优化

### ⚠️ 无法捕捉深层语义

**问题**: "编码" 和 "写代码" 被视为不同的词。

**示例**:
```
"帮我编码" → 高匹配
"帮我写代码" → 可能低匹配（如果能力描述中没有"写"和"代码"）
```

**解决方案**:
- 在能力描述中包含同义词
- 或者升级到 Embedding 方案（方案二）

### ⚠️ 短输入匹配度低

**问题**: 输入太短时，可提取的特征有限。

**示例**:
```
"你好" → 所有 Agent 相似度都是 0%
```

**解决方案**:
- 设置最小输入长度阈值
- 短输入直接使用当前 Agent

## 使用方法

### 1. 定义 Agent 能力

```typescript
const agent = defineAgent({
  name: "claude-opus-coder",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出",
    modelStrengths: ["长代码生成", "复杂逻辑", "架构设计"],
    taskTypes: ["code_writing", "debugging", "refactoring"],
    languages: ["TypeScript", "Python", "Rust"],
    bestFor: ["复杂功能实现", "算法优化", "二叉树", "链表"],
  },
});
```

**关键点**:
- `bestFor` 中包含具体的关键词（如 "二叉树"、"链表"）
- 包含同义词和相关词（如 "编码"、"代码"、"code"）
- 中英文都包含

### 2. 创建 Matcher

```typescript
import { createAgentMatcher } from "./src/index.js";

const matcher = createAgentMatcher([agent1, agent2, agent3]);
```

### 3. 执行匹配

```typescript
const result = matcher.findBestAgent(
  "帮我设计一个二叉树遍历算法",
  currentAgent,
  availableAgents
);

if (result.shouldHandoff) {
  // 切换到最佳 Agent
  await handoff(result.bestAgent, input);
} else {
  // 继续使用当前 Agent
  await currentAgent.handle(input);
}
```

### 4. 调试和分析

```typescript
// 查看统计信息
const stats = matcher.getStats();
console.log(stats);

// 分析输入特征
const analysis = matcher.analyzeInput("帮我设计一个二叉树遍历算法");
console.log(analysis.topTokens);  // 查看关键词权重
```

## 调优建议

### 1. 优化能力描述

**原则**: 包含用户可能使用的所有关键词

**示例**:
```typescript
// ❌ 不好
bestFor: ["编码"]

// ✅ 好
bestFor: [
  "编码", "写代码", "代码实现", "code", "coding",
  "算法", "数据结构", "二叉树", "链表", "排序",
]
```

### 2. 调整切换阈值

**当前阈值**: 0.15（相似度差 > 15% 才切换）

**调整方法**:
```typescript
// 在 agent-matcher.ts 中修改
const HANDOFF_THRESHOLD = 0.15;  // 调整这个值

// 更激进（更容易切换）
const HANDOFF_THRESHOLD = 0.10;

// 更保守（不容易切换）
const HANDOFF_THRESHOLD = 0.20;
```

### 3. 添加领域特定词汇

**示例**: 如果你的系统专注于某个领域，在能力描述中添加该领域的术语

```typescript
// 金融领域
bestFor: ["股票分析", "风险评估", "投资组合", "量化交易"]

// 医疗领域
bestFor: ["病历分析", "诊断建议", "药物相互作用", "医学影像"]
```

## 性能指标

### 时间复杂度

- **初始化**: O(N × M)
  - N: Agent 数量
  - M: 平均能力描述长度

- **匹配**: O(V + N × V)
  - V: 词汇表大小
  - N: Agent 数量

### 空间复杂度

- **词汇表**: O(V)
- **Agent 向量**: O(N × V)

### 实际性能

- **初始化**: ~10ms（3 个 Agent，109 词汇表）
- **单次匹配**: < 1ms
- **内存占用**: < 1MB

## 下一步

### 短期优化

1. **添加缓存**: 缓存常见输入的匹配结果
2. **批量匹配**: 支持一次匹配多个输入
3. **增量更新**: 支持动态添加/删除 Agent

### 长期扩展

1. **升级到 Embeddings**: 使用预训练模型捕捉语义
2. **混合方案**: TF-IDF + LLM 判断
3. **学习优化**: 根据用户反馈调整权重

## 参考文献

1. Salton, G., & McGill, M. J. (1983). *Introduction to Modern Information Retrieval*. McGraw-Hill.
2. Manning, C. D., Raghavan, P., & Schütze, H. (2008). *Introduction to Information Retrieval*. Cambridge University Press.
3. Baeza-Yates, R., & Ribeiro-Neto, B. (2011). *Modern Information Retrieval*. Addison-Wesley.

## 总结

TF-IDF Agent Matcher 提供了一个**有理论支撑、高效、可解释**的 Agent 匹配方案。通过经典的信息检索算法，实现了智能的任务分配，无需手动枚举规则或调用外部 API。

测试结果显示，该方案能够准确地识别任务类型并选择最合适的 Agent，为多 Agent 系统提供了可靠的任务路由能力。
