// 云函数：getLibraryList - 获取话术库技能包列表
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const { category } = event;

    let query = {};
    if (category && category !== 'all') {
      query = { category };
    }

    const skillsRes = await db.collection('skill_library').where(query).get();

    // 获取每个技能包的话术数量
    const skills = await Promise.all(skillsRes.data.map(async skill => {
      const scriptsRes = await db.collection('scripts').where({
        skillId: skill._id
      }).count();

      return {
        _id: skill._id,
        name: skill.name,
        icon: skill.icon || '📖',
        category: skill.category,
        description: skill.description || '',
        tags: skill.tags || [],
        scriptCount: scriptsRes.total,
        useCount: skill.useCount || 0,
        avgRating: skill.avgRating || 4.5,
        preview: skill.preview || ''
      };
    }));

    return {
      code: 0,
      skills
    };

  } catch (err) {
    console.error('getLibraryList error:', err);
    return { code: 500, message: err.message };
  }
};
