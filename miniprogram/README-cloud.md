# 销售助手 - 云开发配置指南

## 一、配置云开发环境

### 1.1 开通云开发

1. 打开微信开发者工具
2. 点击工具栏「云开发」按钮
3. 按提示开通云开发环境（选择「按量付费」或「免费额度」）
4. 记录「环境 ID」（如：`sales-assistant-xxx`）

### 1.2 配置环境 ID

打开 `app.js`，将 `'your-env-id'` 替换为实际的环境 ID：

```javascript
wx.cloud.init({
  env: 'sales-assistant-xxx', // ← 替换为你的环境 ID
  traceUser: true
});
```

## 二、部署云函数

### 2.1 安装依赖并部署

在开发者工具中，对每个云函数执行以下操作：

1. 右键 `cloudfunctions/login` → 「创建并部署：云端安装依赖」
2. 右键 `cloudfunctions/getUserInfo` → 「创建并部署：云端安装依赖」
3. 右键 `cloudfunctions/updateUserInfo` → 「创建并部署：云端安装依赖」
4. 右键 `cloudfunctions/getDashboard` → 「创建并部署：云端安装依赖」
5. 右键 `cloudfunctions/createVisit` → 「创建并部署：云端安装依赖」
6. 右键 `cloudfunctions/getVisitList` → 「创建并部署：云端安装依赖」
7. 右键 `cloudfunctions/getVisitDetail` → 「创建并部署：云端安装依赖」
8. 右键 `cloudfunctions/updateVisit` → 「创建并部署：云端安装依赖」
9. 右键 `cloudfunctions/getCustomers` → 「创建并部署：云端安装依赖」
10. 右键 `cloudfunctions/sendVerifyCode` → 「创建并部署：云端安装依赖」
11. 右键 `cloudfunctions/dbInit` → 「创建并部署：云端安装依赖」

### 2.2 初始化数据库

部署完 `dbInit` 后，在小程序中调用一次初始化：

```javascript
wx.cloud.callFunction({
  name: 'dbInit'
}).then(res => {
  console.log('数据库初始化完成', res);
});
```

或在开发者工具控制台执行：

```javascript
wx.cloud.callFunction({ name: 'dbInit' }).then(console.log)
```

## 三、数据库集合说明

| 集合名 | 用途 | 权限 |
|--------|------|------|
| `users` | 用户信息 | 仅创建者可读写 |
| `visits` | 拜访记录 | 仅创建者可读写 |
| `customers` | 客户信息 | 仅创建者可读写 |
| `configs` | 系统配置 | 仅管理员可写，所有用户可读 |
| `verify_codes` | 验证码 | 仅创建者可读写 |

## 四、云函数列表

| 云函数 | 用途 | 调用页面 |
|--------|------|----------|
| `login` | 登录/注册 | 登录页 |
| `sendVerifyCode` | 发送验证码 | 登录页 |
| `getUserInfo` | 获取用户信息 | app.js |
| `updateUserInfo` | 更新用户信息 | 个人中心 |
| `getDashboard` | 工作台数据 | 首页、个人中心 |
| `createVisit` | 创建拜访记录 | 拜访录入 |
| `getVisitList` | 拜访列表 | 拜访历史 |
| `getVisitDetail` | 拜访详情 | 拜访详情 |
| `updateVisit` | 更新拜访记录 | 拜访详情 |
| `getCustomers` | 客户搜索建议 | 拜访录入 |
| `dbInit` | 初始化数据库 | 一次性调用 |

## 五、开发环境说明

### 5.1 验证码

开发环境下，验证码固定为 `123456`，方便测试。生产环境请接入腾讯云短信服务：

1. 在 `sendVerifyCode` 云函数中接入短信 API
2. 删除返回 `devCode` 的代码
3. 配置短信模板和签名

### 5.2 数据库权限

云数据库默认权限为「仅创建者可读写」，适合当前业务场景。如需管理员查看所有数据，可：

1. 在云函数中使用管理员权限查询
2. 或调整数据库权限为「所有用户可读，仅创建者可写」

## 六、数据安全

- 所有数据库操作均通过云函数执行，前端无法直接操作数据库
- 云函数中自动获取 `OPENID`，确保用户只能操作自己的数据
- 敏感字段（如金额）支持标记 `amount_sensitive`，可在展示时脱敏

## 七、后续扩展

如需接入真实短信服务，修改 `cloudfunctions/sendVerifyCode/index.js`：

```javascript
// 接入腾讯云短信
const res = await cloud.openapi.cloudbase.sendSms({
  env: cloud.DYNAMIC_CURRENT_ENV,
  phoneNumberList: [phone],
  templateId: 'YOUR_TEMPLATE_ID',
  templateParamList: [code]
});
```

更多配置请参考腾讯云短信服务文档。
