const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const API_KEY = process.env.SENSEAUDIO_API_KEY || '';
const API_BASE = 'https://api.senseaudio.cn';
const MODEL_ID = 'senseaudio-s2';

exports.main = async (event, context) => {
  const { type = 'daily', reportData = {} } = event;

  if (!reportData || !reportData.visits) {
    return { code: 400, message: '缺少报告数据' };
  }

  if (!API_KEY) {
    return { code: 500, message: '未配置AI API密钥' };
  }

  try {
    console.log('开始生成报告, type=', type);
    const summary = await generateWithAI(type, reportData);
    console.log('AI生成成功');
    return {
      code: 0,
      message: '报告生成成功',
      data: summary
    };
  } catch (err) {
    console.error('AI生成报告失败:', err.message || err);
    console.error('错误详情:', JSON.stringify(err));
    // 降级：返回结构化数据拼接的简易报告
    const fallback = generateFallbackReport(type, reportData);
    return {
      code: 0,
      message: 'AI生成失败，返回基础报告',
      data: fallback,
      source: 'fallback'
    };
  }
};

async function generateWithAI(type, data) {
  const isDaily = type === 'daily';
  const title = isDaily ? '日报' : '周报';

  // 构建 prompt
  const visitsText = data.visits.map((v, i) => {
    return `${i + 1}. ${v.customerName} - ${v.purpose || '未填写'} - ${v.result || '未填写'}${v.amount ? ' - 金额' + v.amount + '万' : ''}${v.nextStep ? ' - 后续：' + v.nextStep : ''}`;
  }).join('\n');

  const prompt = `你是一位资深销售总监，请根据以下销售拜访数据，撰写一份专业、简洁的${title}摘要。

${isDaily ? '日期' : '周期'}：${data.title}
统计概览：
- 拜访次数：${data.summary.totalVisits} 次
- 涉及客户：${data.summary.customerCount} 家${data.summary.coreVisits > 0 ? '（含核心客户 ' + data.summary.coreVisits + ' 次）' : ''}
- 新客拓展：${data.summary.newCustomerCount} 次初次拜访
${data.summary.totalAmount > 0 ? '- 涉及金额：约 ' + data.summary.totalAmount + ' 万元' : ''}

目的分布：${JSON.stringify(data.purposeDistribution)}
结果分布：${JSON.stringify(data.resultDistribution)}

拜访明细：
${visitsText || '无拜访记录'}

请输出以下内容（纯JSON格式，不要markdown代码块）：
{
  "overview": "50字以内的总体概况",
  "highlights": ["亮点1", "亮点2"],
  "concerns": ["需要关注的问题1"],
  "nextWeekPlan": "下一步行动建议",
  "fullText": "完整的自然语言报告正文（200-400字）"
}`;

  const response = await new Promise((resolve, reject) => {
    const https = require('https');
    const url = new URL(`${API_BASE}/v1/chat/completions`);

    const postData = JSON.stringify({
      model: MODEL_ID,
      messages: [
        { role: 'system', content: '你是一位资深的销售团队管理者，擅长从拜访数据中提炼关键信息，撰写简洁有力的销售日报和周报。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 2048
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
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('AI响应状态码:', res.statusCode);
        console.log('AI响应原始内容:', data.slice(0, 500));
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error('AI响应解析失败: ' + data.slice(0, 200)));
        }
      });
    });

    req.on('error', (err) => {
      console.error('AI请求网络错误:', err.message);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('AI请求超时'));
    });

    req.write(postData);
    req.end();
  });

  // 解析 AI 返回
  let aiContent = '';
  if (response.choices && response.choices[0] && response.choices[0].message) {
    aiContent = response.choices[0].message.content || '';
  } else if (response.content) {
    aiContent = response.content;
  } else {
    throw new Error('AI返回格式异常');
  }

  // 清理 markdown
  aiContent = aiContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(aiContent);
  } catch (e) {
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('无法解析AI返回');
    }
  }

  return {
    overview: parsed.overview || '',
    highlights: parsed.highlights || [],
    concerns: parsed.concerns || [],
    nextWeekPlan: parsed.nextWeekPlan || '',
    fullText: parsed.fullText || ''
  };
}

function generateFallbackReport(type, data) {
  const isDaily = type === 'daily';
  const lines = [];

  lines.push(`${data.title}共完成拜访 ${data.summary.totalVisits} 次，涉及客户 ${data.summary.customerCount} 家。`);

  if (data.summary.coreVisits > 0) {
    lines.push(`其中核心客户拜访 ${data.summary.coreVisits} 次。`);
  }
  if (data.summary.newCustomerCount > 0) {
    lines.push(`新客拓展 ${data.summary.newCustomerCount} 次。`);
  }
  if (data.summary.totalAmount > 0) {
    lines.push(`涉及金额约 ${data.summary.totalAmount} 万元。`);
  }

  const purposes = Object.entries(data.purposeDistribution)
    .map(([k, v]) => `${k}${v}次`).join('、');
  if (purposes) {
    lines.push(`拜访目的以${purposes}为主。`);
  }

  const results = Object.entries(data.resultDistribution)
    .filter(([k]) => k === '已成交' || k === '达成意向')
    .map(([k, v]) => `${k}${v}次`).join('、');
  if (results) {
    lines.push(`取得${results}的积极进展。`);
  }

  return {
    overview: lines[0] || '暂无数据',
    highlights: data.summary.totalVisits > 0 ? [`完成${data.summary.totalVisits}次拜访`] : [],
    concerns: data.summary.totalVisits === 0 ? ['本周期暂无拜访记录'] : [],
    nextWeekPlan: '建议继续跟进重点客户，推进商机转化。',
    fullText: lines.join('')
  };
}
