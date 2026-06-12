const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 数据库集合初始化脚本
// 首次部署后，在开发者工具中右键此云函数 → 创建并部署：云端安装依赖
// 然后在小程序端调用此云函数进行初始化

async function createCollectionIfNotExists(name) {
  try {
    await db.createCollection(name);
    console.log(`集合 ${name} 创建成功`);
  } catch (err) {
    if (err.errCode === -502001) {
      console.log(`集合 ${name} 已存在`);
    } else {
      console.error(`集合 ${name} 创建失败:`, err);
    }
  }
}

exports.main = async (event, context) => {
  try {
    // 1. 创建集合
    await createCollectionIfNotExists('users');
    await createCollectionIfNotExists('visits');
    await createCollectionIfNotExists('customers');
    await createCollectionIfNotExists('configs');
    await createCollectionIfNotExists('verify_codes');

    // 2. 初始化系统配置
    const configRes = await db.collection('configs').where({ key: 'weekly_visit_target' }).get();
    if (configRes.data.length === 0) {
      await db.collection('configs').add({
        data: {
          key: 'weekly_visit_target',
          value: 5,
          desc: '每周拜访目标',
          createdAt: db.serverDate()
        }
      });
    }

    const configRes2 = await db.collection('configs').where({ key: 'min_distill_records' }).get();
    if (configRes2.data.length === 0) {
      await db.collection('configs').add({
        data: {
          key: 'min_distill_records',
          value: 8,
          desc: '最小蒸馏记录数',
          createdAt: db.serverDate()
        }
      });
    }

    const configRes3 = await db.collection('configs').where({ key: 'min_distill_customers' }).get();
    if (configRes3.data.length === 0) {
      await db.collection('configs').add({
        data: {
          key: 'min_distill_customers',
          value: 2,
          desc: '最小蒸馏客户数',
          createdAt: db.serverDate()
        }
      });
    }

    return {
      code: 0,
      message: '数据库初始化完成',
      data: {
        collections: ['users', 'visits', 'customers', 'configs', 'verify_codes'],
        configs: ['weekly_visit_target', 'min_distill_records', 'min_distill_customers']
      }
    };
  } catch (err) {
    return {
      code: 500,
      message: '初始化失败: ' + err.message,
      data: null
    };
  }
};