/**
 * Simple Chat Detector
 *
 * 只检测是否为简单对话（闲聊、问候）
 * 如果不是简单对话，则交给 AI 进行任务分配
 */

export interface ChatDetectionResult {
  isSimpleChat: boolean;
  confidence: number;
  reasoning: string;
}

export class SimpleChatDetector {
  // 闲聊关键词
  private chatKeywords = [
    "你好", "您好", "hi", "hello", "嗨",
    "早上好", "晚上好", "下午好",
    "谢谢", "感谢", "多谢",
    "再见", "拜拜", "bye",
    "怎么样", "如何", "还好吗",
  ];

  // 问候模式
  private greetingPatterns = [
    /^(你好|您好|hi|hello|嗨)[！!。.，,]*$/i,
    /^(早上好|晚上好|下午好)[！!。.，,]*$/i,
    /^(谢谢|感谢|多谢)[！!。.，,]*$/i,
    /^(再见|拜拜|bye)[！!。.，,]*$/i,
  ];

  /**
   * 检测是否为简单对话
   */
  detect(input: string): ChatDetectionResult {
    const trimmed = input.trim();

    // 1. 检查是否匹配问候模式
    for (const pattern of this.greetingPatterns) {
      if (pattern.test(trimmed)) {
        return {
          isSimpleChat: true,
          confidence: 0.95,
          reasoning: "匹配问候模式",
        };
      }
    }

    // 2. 检查长度（简单对话通常很短）
    if (trimmed.length <= 5) {
      // 检查是否包含闲聊关键词
      for (const keyword of this.chatKeywords) {
        if (trimmed.includes(keyword)) {
          return {
            isSimpleChat: true,
            confidence: 0.90,
            reasoning: "短文本 + 闲聊关键词",
          };
        }
      }
    }

    // 3. 检查是否包含任务关键词
    const taskKeywords = [
      "帮我", "帮忙", "请", "能不能", "可以",
      "写", "生成", "实现", "开发", "创建",
      "分析", "研究", "查找", "搜索",
      "翻译", "润色", "优化",
      "算法", "代码", "程序", "脚本",
    ];

    for (const keyword of taskKeywords) {
      if (trimmed.includes(keyword)) {
        return {
          isSimpleChat: false,
          confidence: 0.85,
          reasoning: "包含任务关键词",
        };
      }
    }

    // 4. 默认：长度 > 10 的视为任务
    if (trimmed.length > 10) {
      return {
        isSimpleChat: false,
        confidence: 0.70,
        reasoning: "文本较长，可能是任务描述",
      };
    }

    // 5. 其他情况视为简单对话
    return {
      isSimpleChat: true,
      confidence: 0.60,
      reasoning: "无明确任务特征",
    };
  }
}

/**
 * 创建简单对话检测器
 */
export function createChatDetector(): SimpleChatDetector {
  return new SimpleChatDetector();
}
