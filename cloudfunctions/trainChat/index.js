// 云函数：trainChat - AI训练对话交互
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const https = require('https');

const API_URL = 'api.senseaudio.cn';
const API_PATH = '/v1/chat/completions';
const MODEL = 'senseaudio-s2';

// 调用AI API
function callAI(messages) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.SENSEAUDIO_API_KEY;
    if (!apiKey) {
      reject(new Error('未配置 SENSEAUDIO_API_KEY'));
      return;
    }

    const postData = JSON.stringify({
      model: MODEL,
      messages: messages,
      temperature: 0.8,
      max_tokens: 800
    });

    const options = {
      hostname: API_URL,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else {
            reject(new Error('AI响应格式异常'));
          }
        } catch (e) {
          reject(new Error('AI响应解析失败'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('超时')); });
    req.write(postData);
    req.end();
  });
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { sessionId, message } = event;

  try {
    // 获取会话
    const sessionRes = await db.collection('train_sessions').doc(sessionId).get();
    const session = sessionRes.data;
    if (session._openid !== OPENID) {
      return { code: 403, message: '无权访问' };
    }

    const scenario = session.scenario || {};
    const benchmarkName = session.benchmarkName || '张三';
    const scenarioName = session.scenarioName || '销售拜访';
    const round = (session.rounds || 0) + 1;

    // 构建对话历史
    const historyText = session.messages.map(m => {
      return m.role === 'ai' ? `客户：${m.content}` : `销售：${m.content}`;
    }).join('\n');

    // 构建AI Prompt
    const systemPrompt = `你是一个销售训练AI。你扮演${scenario.customerName || '客户'}（${scenario.title || '负责人'}，${scenario.company || '某公司'}）。
背景：${scenario.background || '正在考虑采购'}
目标：${scenario.goal || '了解产品'}

你需要：
1. 以客户的身份自然回应销售的话术
2. 保持角色一致性
3. 给出一定的挑战性，但不要让对话完全谈崩
4. 回应要简洁，1-3句话

标杆销售${benchmarkName}的风格特点：直接、数据驱动、善用价值重构策略。`;

    const userPrompt = `以下是对话历史：
${historyText}

销售最新回应：${message}

请以客户身份回应。只输出客户的回应内容，不要加"客户："前缀。`;

    // 调用AI生成客户回复
    let aiResponse;
    try {
      aiResponse = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);
    } catch (aiErr) {
      console.error('AI调用失败，使用默认回复:', aiErr.message);
      aiResponse = '嗯，你说的有一定道理，但我还需要再考虑一下。';
    }

    // 生成反馈评分
    const feedbackPrompt = `作为销售训练评估专家，请评估销售刚才的回应：

场景：${scenarioName || '销售拜访'}
标杆：${benchmarkName}

销售回应：${message}

请输出JSON格式：
{
  "scriptMatch": "话术匹配评价",
  "styleDev": "风格偏离评价（如无偏离则不填）",
  "roundScore": 0-100的分数,
  "suggestion": "简短建议"
}`;

    let feedback = { roundScore: 70, scriptMatch: '回应合理', styleDev: '', suggestion: '继续保持' };
    try {
      const feedbackRaw = await callAI([
        { role: 'system', content: '你是一个销售话术评估专家。只输出JSON。' },
        { role: 'user', content: feedbackPrompt }
      ]);
      // 尝试解析JSON
      const jsonMatch = feedbackRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        feedback = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('反馈生成失败:', e.message);
    }

    const roundScore = Math.min(100, Math.max(0, feedback.roundScore || 70));
    const scores = [...(session.scores || []), roundScore];
    const totalScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // 更新会话
    const newMessages = [
      ...session.messages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'ai', content: aiResponse, timestamp: new Date().toISOString() }
    ];

    await db.collection('train_sessions').doc(sessionId).update({
      data: {
        messages: newMessages,
        rounds: round,
        scores: scores,
        updateTime: db.serverDate()
      }
    });

    return {
      code: 0,
      data: {
        customerResponse: aiResponse,
        feedback: {
          scriptMatch: feedback.scriptMatch || '回应合理',
          styleDev: feedback.styleDev || '',
          roundScore: roundScore,
          totalScore: totalScore,
          round: round,
          totalRounds: 7,
          suggestion: feedback.suggestion || ''
        }
      }
    };
  } catch (err) {
    console.error('trainChat error:', err);
    return { code: 500, message: err.message };
  }
};
