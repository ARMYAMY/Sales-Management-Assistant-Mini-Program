const https = require('https');
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 从云开发环境变量读取密钥（安全做法，不要硬编码）
// 请在云开发控制台 → 云函数 →  recogniseSpeech → 版本与配置 → 环境变量 中设置：
// SENSEAUDIO_API_KEY = sk-...
const API_KEY = process.env.SENSEAUDIO_API_KEY || '';
const API_HOST = 'api.senseaudio.cn';
const API_PATH = '/v1/audio/transcriptions'; // 如果实际路径不同，请修改此行
const MODEL_ID = 'senseaudio-asr-1.5-260319';

// 构建 multipart/form-data body
function buildMultipartBody(buffer, boundary) {
  const prefix = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="audio.mp3"\r\n` +
    `Content-Type: audio/mpeg\r\n\r\n`,
    'utf8'
  );
  const modelField = Buffer.from(
    `\r\n--${boundary}\r\n` +
    `Content-Disposition: form-data; name="model"\r\n\r\n` +
    `${MODEL_ID}\r\n` +
    `--${boundary}--\r\n`,
    'utf8'
  );
  return Buffer.concat([prefix, buffer, modelField]);
}

// 发送 HTTPS POST 请求
function postMultipart(body, boundary) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: API_PATH,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('请求超时')));
    req.write(body);
    req.end();
  });
}

exports.main = async (event, context) => {
  const { fileID } = event;

  if (!fileID) {
    return { code: 400, message: '缺少音频文件ID' };
  }

  if (!API_KEY) {
    return { code: 500, message: '未配置 SENSEAUDIO_API_KEY 环境变量' };
  }

  try {
    // 1. 从云存储下载音频文件
    const downloadRes = await cloud.downloadFile({ fileID });
    const buffer = downloadRes.fileContent;

    // 2. 构建 multipart 请求体
    const boundary = '----CloudFormBoundary' + Date.now();
    const body = buildMultipartBody(buffer, boundary);

    // 3. 调用语音识别 API
    const response = await postMultipart(body, boundary);

    console.log('API响应状态:', response.statusCode);
    console.log('API响应内容:', response.body);

    // 4. 解析返回结果
    let result;
    try {
      result = JSON.parse(response.body);
    } catch (e) {
      // 如果不是 JSON，把原始文本返回
      return {
        code: 0,
        data: { text: response.body.trim() }
      };
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      // 适配常见返回字段名：text / result / transcription / content
      const text = result.text || result.result || result.transcription || result.content || result.data?.text || '';
      return {
        code: 0,
        message: 'success',
        data: { text }
      };
    } else {
      return {
        code: response.statusCode,
        message: result.error?.message || result.message || '识别服务返回错误',
        data: result
      };
    }
  } catch (err) {
    console.error('语音识别失败:', err);
    return { code: 500, message: '语音识别失败: ' + err.message };
  }
};