# SYNTHPLAY 上线部署指南（Hostinger KVM 2 + Cloudflare R2）

- **主站域名**：`synthplay.games`（及 `www.synthplay.games`）
- **管理后台**：`admin.synthplay.games`
- **独立安全沙箱域**：`synthplay-box.cloud`（及 `cdn.synthplay-box.cloud`、`*.synthplay-box.cloud`）

---

## 第一步：把两个域名接入 Cloudflare（免费版）

1. 登录 Cloudflare，依次添加站点 `synthplay.games` 和 `synthplay-box.cloud`（选 Free 套餐）。
2. 将 Cloudflare 给你的两条 NS 记录填回 Hostinger 的域名 Nameserver 设置中（一般 5~15 分钟生效）。
3. 在 Cloudflare 为 **`synthplay.games`** 添加 3 条 DNS `A` 记录（填你 Hostinger KVM 2 的公网 IP）：
   - `@` -> `<你的 VPS IP>`（代理状态先选 **仅 DNS / 灰云**，等 Caddy 首次申请完 HTTPS 证书后再可按需开启小黄云 + SSL 模式设为 **Full (Strict)**）
   - `www` -> `<你的 VPS IP>`
   - `admin` -> `<你的 VPS IP>`

## 第二步：开通 Cloudflare R2（0 出口流量费）

1. 在 Cloudflare 左侧进入 **R2 Object Storage**，创建两个桶：
   - `synthplay-quarantine`（上传隔离桶，不公开）
   - `synthplay-games-prod`（生产游戏桶，绑定自定义域 `cdn.synthplay-box.cloud`）
2. 在 R2 管理页生成一组 **R2 API Token（Object Read & Write）**，记下 `Account ID`、`Access Key ID`、`Secret Access Key`。

## 第三步：Hostinger KVM 2 一键启动服务

SSH 登录到你的 Hostinger KVM 2（Ubuntu 24.04 + Docker）：

```bash
# 1. 拉取仓库
git clone https://github.com/night-of-sen/aigame.git /opt/synthplay
cd /opt/synthplay

# 2. 复制并填写生产环境变量
cp .env.example .env
nano .env   # 填入强密码、R2 密钥及收款配置

# 3. 放行防火墙 80 / 443 端口（如开启了 ufw）
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp

# 4. 启动完整生产容器栈（PostgreSQL + Redis + Meilisearch + Web + Admin + Caddy 自动 HTTPS）
docker compose up -d --build

# 5. 查看启动状态与日志
docker compose ps
docker compose logs -f caddy web admin
```

等待约 30 秒，Caddy 会自动向 Let's Encrypt 申请 SSL 证书，访问 `https://synthplay.games` 与 `https://admin.synthplay.games` 即可看到完整线上站点！
