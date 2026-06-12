const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const API_KEY = process.env.SENSEAUDIO_API_KEY || '';
const API_BASE = 'https://api.senseaudio.cn';
const MODEL_ID = 'senseaudio-s2-flash';

exports.main = async (event, context) => {
  const { text } = event;

  if (!text) {
    return { code: 400, message: '缺少文本内容' };
  }

  // 优先调用 AI 模型进行结构化提取
  if (API_KEY) {
    try {
      const aiResult = await parseWithAI(text);
      return {
        code: 0,
        message: 'AI解析成功',
        data: aiResult,
        source: 'ai'
      };
    } catch (err) {
      console.error('AI解析失败，降级到规则解析:', err);
      // AI 失败时降级到规则解析
    }
  }

  // 规则解析兜底
  const ruleResult = parseVisitText(text);
  return {
    code: 0,
    message: '规则解析完成',
    data: ruleResult,
    source: 'rule'
  };
};

// 调用 AI 模型解析
async function parseWithAI(text) {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const prompt = `请从以下销售拜访语音转写文本中提取结构化信息，以纯JSON格式返回（不要markdown代码块，不要额外说明）。

需要提取的字段：
- customer_name: 客户公司名称（如"神州数码"、"华为技术"等）
- contact_person: 联系人姓名（去掉职务，如"张三"而不是"张经理"）
- visit_date: 拜访日期，格式YYYY-MM-DD。提到"今天"用${today}，"昨天"用${yesterday}
- visit_time: 拜访时间（如"14:30"、"下午"）
- location: 拜访地点/方式（如"客户现场"、"电话"、"视频会议"、"公司会议室"）
- purpose: 拜访目的，只能从以下选一项：初次拜访、需求挖掘、方案演示、商务谈判、合同签订、售后服务、其他
- result: 拜访结果，只能从以下选一项：达成意向、推进中、待决策、已成交、未达成、其他
- next_step: 下一步计划或后续安排
- amount: 涉及的金额或预算，只保留数字（如"50万"返回"50"）
- competitor_info: 提到的竞品或竞争对手信息

文本内容：
"""${text}"""

请只返回以下格式的JSON：
{"customer_name":"","contact_person":"","visit_date":"","visit_time":"","location":"","purpose":"","result":"","next_step":"","amount":"","competitor_info":""}`;

  const response = await new Promise((resolve, reject) => {
    const https = require('https');
    const url = new URL(`${API_BASE}/v1/chat/completions`);

    const postData = JSON.stringify({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: '你是一个销售拜访信息提取助手，擅长从口语化文本中提取结构化字段。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1024
    });

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('AI响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI请求超时'));
    });

    req.write(postData);
    req.end();
  });

  // 解析 AI 返回的内容
  let aiContent = '';
  if (response.choices && response.choices[0] && response.choices[0].message) {
    aiContent = response.choices[0].message.content || '';
  } else if (response.content) {
    aiContent = response.content;
  } else {
    throw new Error('AI返回格式异常');
  }

  // 清理 markdown 代码块
  aiContent = aiContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(aiContent);
  } catch (e) {
    // 尝试从文本中提取 JSON
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('无法解析AI返回的JSON');
    }
  }

  // 标准化字段
  const result = {
    customer_name: parsed.customer_name || parsed.customerName || '',
    contact_person: parsed.contact_person || parsed.contactPerson || '',
    visit_date: parsed.visit_date || parsed.visitDate || '',
    visit_time: parsed.visit_time || parsed.visitTime || '',
    location: parsed.location || '',
    purpose: normalizePurpose(parsed.purpose || parsed.purposeIndex || ''),
    result: normalizeResult(parsed.result || parsed.resultIndex || ''),
    next_step: parsed.next_step || parsed.nextStep || '',
    amount: normalizeAmount(parsed.amount || ''),
    competitor_info: parsed.competitor_info || parsed.competitorInfo || '',
    confidence: calculateConfidence(parsed),
    raw_text: text
  };

  return result;
}

// 标准化目的
function normalizePurpose(p) {
  const valid = ['初次拜访', '需求挖掘', '方案演示', '商务谈判', '合同签订', '售后服务', '其他'];
  const matched = valid.find(v => p.includes(v));
  return matched || '其他';
}

// 标准化结果
function normalizeResult(r) {
  const valid = ['达成意向', '推进中', '待决策', '已成交', '未达成', '其他'];
  const matched = valid.find(v => r.includes(v));
  return matched || '其他';
}

// 标准化金额
function normalizeAmount(a) {
  if (!a) return '';
  const num = String(a).replace(/[万元,\s]/g, '');
  return num || '';
}

// 计算置信度
function calculateConfidence(parsed) {
  const fields = ['customer_name', 'contact_person', 'visit_date', 'purpose', 'result'];
  let filled = 0;
  fields.forEach(f => {
    if (parsed[f] && String(parsed[f]).trim()) filled++;
  });
  return Math.min(filled / fields.length, 1);
}

// 规则解析兜底
function parseVisitText(text) {
  const result = {
    customer_name: '',
    contact_person: '',
    visit_date: '',
    visit_time: '',
    location: '',
    purpose: '',
    result: '',
    next_step: '',
    amount: '',
    competitor_info: '',
    confidence: 0
  };

  let matchCount = 0;

  const companyPatterns = [
    /(?:拜访了?|去了?|到|在)([^，。；,.;]+?公司|[^，。；,.;]+?集团|[^，。；,.;]+?科技)/,
    /([^，。；,.;]+?公司|[^，。；,.;]+?集团)/
  ];
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match) { result.customer_name = match[1].trim(); matchCount++; break; }
  }

  const contactPatterns = [
    /([\u4e00-\u9fa5]{2,4})(?:经理|总监|主管|主任|先生|女士)/,
    /(?:联系了?|找到了?|见到)([\u4e00-\u9fa5]{2,4})/
  ];
  for (const pattern of contactPatterns) {
    const match = text.match(pattern);
    if (match) { result.contact_person = match[1].trim(); matchCount++; break; }
  }

  const datePatterns = [
    /(\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?)/,
    /(今天|昨天|明天|本周|上周)/,
    /(\d{1,2}[月/-]\d{1,2}[日]?)/
  ];
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let dateStr = match[1];
      if (dateStr === '今天') { dateStr = new Date().toISOString().split('T')[0]; }
      else if (dateStr === '昨天') { const d = new Date(); d.setDate(d.getDate() - 1); dateStr = d.toISOString().split('T')[0]; }
      else if (dateStr === '明天') { const d = new Date(); d.setDate(d.getDate() + 1); dateStr = d.toISOString().split('T')[0]; }
      else { dateStr = dateStr.replace(/[年月]/g, '-').replace(/[日]/g, '').replace(/\//g, '-'); if (dateStr.split('-').length === 2) { dateStr = new Date().getFullYear() + '-' + dateStr; } }
      result.visit_date = dateStr; matchCount++; break;
    }
  }

  const timePatterns = [
    /(\d{1,2}[点:：]\d{1,2})/, /(\d{1,2}[点])/, /(上午|下午|早上|晚上)/
  ];
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) { result.visit_time = match[1]; matchCount++; break; }
  }

  const locationKeywords = ['上门', '电话', '线上', '视频', '会议室', '办公室', '客户现场'];
  for (const kw of locationKeywords) {
    if (text.includes(kw)) { result.location = kw; matchCount++; break; }
  }

  const purposeKeywords = {
    '初次拜访': ['初次', '第一次', '首次'],
    '需求挖掘': ['需求', '调研', '了解'],
    '方案演示': ['演示', '方案', '展示', '介绍产品'],
    '商务谈判': ['谈判', '议价', '价格', '商务'],
    '合同签订': ['合同', '签约', '签订'],
    '售后服务': ['售后', '服务', '维护', '问题']
  };
  for (const [purpose, keywords] of Object.entries(purposeKeywords)) {
    if (keywords.some(kw => text.includes(kw))) { result.purpose = purpose; matchCount++; break; }
  }

  const resultKeywords = {
    '达成意向': ['意向', '感兴趣', '有意向', '同意'],
    '推进中': ['推进', '继续', '跟进', '下一步'],
    '待决策': ['考虑', '决策', '商量', '讨论'],
    '已成交': ['成交', '签约', '下单', '购买'],
    '未达成': ['拒绝', '不同意', '没兴趣', '不行']
  };
  for (const [res, keywords] of Object.entries(resultKeywords)) {
    if (keywords.some(kw => text.includes(kw))) { result.result = res; matchCount++; break; }
  }

  const amountPatterns = [
    /(\d+(?:\.\d+)?)\s*[万]/, /(\d+(?:\.\d+)?)\s*[千]/, /预算.*?([\d,]+)/, /金额.*?([\d,]+)/
  ];
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) { result.amount = match[1].replace(/,/g, ''); matchCount++; break; }
  }

  const nextStepPatterns = [
    /(?:下周|下次|接下来|后续|然后)[，。,\s]*(.+?)(?:[。；]|$)/,
    /(?:安排|计划|准备)[，。,\s]*(.+?)(?:[。；]|$)/
  ];
  for (const pattern of nextStepPatterns) {
    const match = text.match(pattern);
    if (match) { result.next_step = match[1].trim(); matchCount++; break; }
  }

  const competitorPatterns = [
    /(?:竞品|竞争对手|对手|其他品牌)[是：:]*(.+?)(?:[。；]|$)/,
    /(?:提到|说到|问了)(.+?)(?:的产品|的方案|的价格)/
  ];
  for (const pattern of competitorPatterns) {
    const match = text.match(pattern);
    if (match) { result.competitor_info = match[1].trim(); matchCount++; break; }
  }

  result.confidence = Math.min(matchCount / 8, 1);
  return result;
}
