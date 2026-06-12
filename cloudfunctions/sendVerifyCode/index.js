const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 生成6位随机验证码
function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

exports.main = async (event, context) => {
  const { phone } = event;

  if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
    return { code: 400, message: '手机号格式错误' };
  }

  const code = genCode();
  const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期

  // 存储验证码到数据库
  await db.collection('verify_codes').add({
    data: {
      phone: phone,
      code: code,
      expireAt: expireAt,
      createdAt: db.serverDate()
    }
  });

  // TODO: 生产环境请接入腾讯云短信服务发送真实短信
  // const res = await cloud.openapi.cloudbase.sendSms({...})

  // 开发环境：直接返回验证码（方便测试）
  console.log(`验证码已生成: ${phone} -> ${code}`);

  return {
    code: 0,
    message: '验证码已发送',
    data: {
      // 开发模式下返回验证码，生产环境请删除此字段
      devCode: code
    }
  };
};