# 红黑卧底游戏

基于 Node.js + Express + Socket.IO 的在线队伍身份分配器。玩家加入后只负责选择队伍；主控每局点击开始时，系统在各队伍内随机分配卧底（队伍不变）。

## 在线地址
- 玩家入口：https://game-f8jw.onrender.com/
- 主控入口：https://game-f8jw.onrender.com/admin.html

> Render 免费实例在空闲时会休眠，唤醒时首个请求可能变慢（几十秒级）。

## 快速开始
1. 所有玩家打开“玩家入口”，输入名字、选择红/黑队，点击“加入”。
2. 主控打开“主控入口”，点击“开始游戏”。
3. 每局开始后会重新随机卧底身份。

## 游戏规则（默认逻辑）
- 分红队、黑队；玩家队伍在加入时确认，之后不变。
- 主控每局点击开始后，系统在每个队伍内随机 1–2 名卧底。
- 卧底人数：
  - 队伍人数 ≤ 1：不分配卧底
  - 队伍人数 = 2：固定 1 名卧底
  - 队伍人数 ≥ 3：随机 1 或 2 名卧底
- 普通玩家：只看到“普通队员”。
- 卧底：看到“卧底”，并显示同队其他卧底的名字。

## 本地运行（可选）
```bash
npm install
npm start
```

## 参考
- Render Web Services（支持 WebSocket）：https://render.com/docs/web-services
- Render 免费实例休眠说明：Render Dashboard 提示
