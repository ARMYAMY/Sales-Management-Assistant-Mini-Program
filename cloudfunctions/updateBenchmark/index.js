// 云函数：updateBenchmark - 更新用户当前对标
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { benchmarkSlug } = event;

  try {
    // 更新用户记录的 benchmark
    await db.collection('users')
      .where({ _openid: OPENID })
      .update({
        data: {
          benchmarkSlug: benchmarkSlug,
          updateTime: db.serverDate()
        }
      });

    return { code: 0, message: 'success' };
  } catch (err) {
    console.error('updateBenchmark error:', err);
    return { code: 500, message: err.message };
  }
};
