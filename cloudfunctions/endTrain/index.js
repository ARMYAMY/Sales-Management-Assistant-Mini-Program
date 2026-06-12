// 云函数：endTrain - 结束训练并生成报告
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const https = require('https');

const API_URL = 'api.senseaudio.cn';
const API_PATH = '/v1/chat/completions';
const MODEL = 'senseaudio-s2';

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
      temperature: 0.7,
      max_tokens: 1000
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
  const { sessionId } = event;

  try {
    const sessionRes = await db.collection('train_sessions').doc(sessionId).get();
    const session = sessionRes.data;
    if (session._openid !== OPENID) {
      return { code: 403, message: '无权访问' };
    }

    const scores = session.scores || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // 构建对话摘要
    const dialogueSummary = session.messages.map(m => {
      return m.role === 'ai' ? `客户：${m.content}` : `销售：${m.content}`;
    }).join('\n');

    // 调用AI生成综合评估
    const prompt = `请对以下销售对话训练进行综合评估：

场景：${session.scenarioName || '销售拜访'}
标杆：${session.benchmarkName || '张三'}
对话轮数：${session.rounds || 0}
各轮得分：${scores.join(', ')}

对话内容：
${dialogueSummary.slice(-2000)}

请输出JSON格式评估：
{
  "totalScore": 总分0-100,
  "scoreScript": 话术匹配度0-35,
  "scoreStyle": 风格接近度0-25,
  "scoreStrategy": 策略一致性0-20,
  "scoreEffectiveness": 沟通有效性0-20,
  "improvements": ["改进建议1", "改进建议2"]
}`;

    let summary = {
      totalScore: avgScore,
      scoreScript: Math.round(avgScore * 0.35),
      scoreStyle: Math.round(avgScore * 0.25),
      scoreStrategy: Math.round(avgScore * 0.2),
      scoreEffectiveness: Math.round(avgScore * 0.2),
      improvements: ['继续保持积极态度', '注意倾听客户需求']
    };

    try {
      const aiResult = await callAI([
        { role: 'system', content: '你是销售训练评估专家。只输出JSON。' },
        { role: 'user', content: prompt }
      ]);
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        summary = { ...summary, ...parsed };
      }
    } catch (e) {
      console.error('AI评估失败，使用默认:', e.message);
    }

    // 计算与上次训练的分数变化
    const prevRes = await db.collection('train_sessions')
      .where({ _openid: OPENID, status: 'completed', _id: _.neq(sessionId) })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get();

    const prevScore = prevRes.data[0]?.summary?.totalScore || 0;
    const scoreChange = summary.totalScore - prevScore;

    // 更新会话状态
    await db.collection('train_sessions').doc(sessionId).update({
      data: {
        status: 'completed',
        summary: summary,
        scoreChange: scoreChange,
        updateTime: db.serverDate()
      }
    });

    return {
      code: 0,
      data: { summary, scoreChange }
    };
  } catch (err) {
    console.error('endTrain error:', err);
    return { code: 500, message: err.message };
  }
};
