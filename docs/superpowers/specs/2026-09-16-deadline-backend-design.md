# DeadLine 前后端分离改造设计

日期：2026-09-16
状态：已确认，待实现

## 1. 背景与目标

DeadLine 当前是纯前端日程管理应用（Vue 3 + Vite + Pinia，约 6700 行），全部数据存浏览器本地：
localStorage 的 `todo_calendar_data` 存用户/任务/日期标记/日记，IndexedDB（Dexie）存附件文件。

改造目标是把它变成前后端分离架构。**主要动机是学习 Java 后端与关系型数据库**，不是产品需求。
因此技术选型偏向「能学到东西」而非「最省事」，同时用户明确要求线上站点必须真实连到后端。

两个必须同时满足且**互相连通**的目标：

1. 前端继续部署在 GitHub Pages 上，供他人访问。
2. 前端真实请求部署在本机 VMware CentOS 7 虚拟机上的 Java 后端，数据库用该 VM 上的 MySQL。

## 2. 关键约束（决定方案形态的硬约束）

### 2.1 混合内容拦截
GitHub Pages 强制 HTTPS。浏览器会拦截「HTTPS 页面 → HTTP 后端」的请求，这是浏览器层行为，
后端无论怎么配 CORS 都无法绕过。**后端必须提供 HTTPS。**

### 2.2 本机 VM 无公网 IP
VM 跑在用户 Windows 机器的 VMware 里，默认 NAT 网络，只有 `192.168.x.x` 内网地址。
中国家宽普遍为 CGNAT 且运营商封禁 80/443，端口映射路线不可行。必须使用内网穿透隧道。

### 2.3 第三方 Cookie 拦截
`github.io` 与隧道域名是两个不同的站，属跨站请求。现代浏览器默认拦截跨站 Cookie，
因此 Session + Cookie 方案不可行。必须使用基于请求头的令牌（JWT）。

### 2.4 线上可用性依赖本机
VM 关机、Windows 休眠、家庭断网都会导致线上站点不可用。这是接受该方案的已知代价。
前端必须给出明确的「连不上后端」提示，而非白屏或模糊报错。

## 3. 已确认的技术决策

| 决策项 | 选择 | 理由 |
|---|---|---|
| 后端框架 | Spring Boot 3.x + Spring Data JPA | 业界主流，Repository 接口自动生成 SQL，上手快 |
| JDK 版本 | Java 17 | Spring Boot 3 的最低要求 |
| 数据库 | MySQL 8（VM 上） | 用户既有环境 |
| 认证 | 手写 JWT + HandlerInterceptor | 不引入 Spring Security，链路透明，真正看懂认证 |
| 加密库 | `spring-security-crypto`（仅取 BCrypt 工具类） | 只要 BCryptPasswordEncoder，不引入完整 Spring Security |
| JWT 库 | jjwt | 轻量，API 直白 |
| 前端数据层 | 纯后端，废弃 localStorage 与 IndexedDB | 逻辑最干净，能直观看到数据进库 |
| 附件 | 传到后端，文件存 VM 磁盘，MySQL 存元数据 | 能学到文件上传、静态资源、文件与数据的关联 |
| 露出方式 | cloudflared 快速隧道（`*.trycloudflare.com`） | 免费、无需域名备案、自带 HTTPS |
| 注册策略 | 完全开放，靠限流 + 文件大小 + 配额兜底 | 用户希望他人能直接注册使用 |
| 后端开发环境 | Windows 上用 IDEA 写，打包 jar 传 VM | 本地调试方便，回滚清晰 |

### 3.1 为什么不选其他方案

- **ngrok 免费静态域名**：URL 固定是优点，但免费版对浏览器请求插警告中间页，国内访问偶有抖动。
  cloudflared 无需域名、无中间页。若日后想要固定 URL，升级路径见 9.1。
- **自有域名 + 命名隧道**：最接近生产，但需要买域名并多配 DNS。因为前端 API 地址是运行时可配的，
  升级只需改一个字符串，前端后端代码都不用动，所以现在不必先付这个成本。
- **frp**：需要一台有公网 IP 的服务器做中转，会退化成「需要租 VPS」，不符合本方案前提。
- **Spring Security**：配置链（SecurityFilterChain、过滤器顺序）对初学者是黑盒，调试成本高，
  且会把注意力从「认证是怎么工作的」转移到「框架配置怎么写」。
- **本地缓存兜底 / 双模式**：需要处理同步队列与冲突合并，复杂度翻倍，且这部分与学习后端无关。

## 4. 整体架构

```
浏览器 (https://xiaojiu-aaa.github.io/DeadLine/)
   │
   │  fetch("/api/tasks", { headers: { Authorization: "Bearer <JWT>" } })
   │  HTTPS，跨站，需要 CORS
   ▼
Cloudflare 边缘  https://<随机>.trycloudflare.com     ← 自带 TLS 证书
   │
   │  cloudflared 在 VM 上主动建立的出站长连接（无需公网 IP、无需端口映射）
   ▼
VM: cloudflared 客户端 → 明文 HTTP → localhost:8080
   ▼
VM: Spring Boot 3 (Java 17) + AuthInterceptor 校验 JWT
   │  JDBC (HikariCP)
   ▼
VM: MySQL 8  (localhost:3306, 库名 deadline)
```

该链路同时规避了 2.1、2.2、2.3 三个约束：隧道提供 HTTPS 解决混合内容；
cloudflared 是出站连接，不依赖公网 IP；JWT 走请求头，不碰 Cookie。

### 4.1 源码仓库布局

后端作为独立项目放在前端仓库之外，例如 `D:\workspace\deadline-server`。
不放进 `DeadLine` 仓库，避免前端 Actions 构建时把 Java 源码一起带上。

## 5. 后端设计

### 5.1 项目结构

```
deadline-server/
  pom.xml
  src/main/java/com/xiaojiu/deadlineserver/
    DeadlineApplication.java
    config/WebConfig.java              # CORS 配置
    config/WebMvcConfig.java           # 注册拦截器与参数解析器
    security/JwtUtil.java              # 签发 / 校验 JWT
    security/AuthInterceptor.java      # 拦 /api/**，放行 /api/auth/** 与 OPTIONS
    security/CurrentUserId.java        # 自定义注解
    security/CurrentUserIdResolver.java# 把 request 属性解析成方法参数
    security/RateLimiter.java          # 滑动窗口限流
    security/ClientIp.java             # 从 CF-Connecting-IP 取真实 IP
    entity/     User, Task, Attachment, MarkedDay, Diary
    repository/ UserRepository, TaskRepository, AttachmentRepository,
                MarkedDayRepository, DiaryRepository
    service/    AuthService, TaskService, MarkedDayService, DiaryService, FileService
    controller/ AuthController, TaskController, MarkedDayController,
                DiaryController, FileController, MeController
    dto/        RegisterRequest, LoginRequest, LoginResponse, TaskRequest,
                TaskResponse, AttachmentResponse, MarkedDayRequest, DiaryRequest
    exception/  BizException, GlobalExceptionHandler
  src/main/resources/
    application.yml
    schema.sql
  data/attachments/                    # 附件落盘目录（运行时创建，不入版本库）
```

### 5.2 数据库表

库名 `deadline`，字符集 `utf8mb4`，排序规则 `utf8mb4_unicode_ci`。

```sql
CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  storage_used  BIGINT       NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_username (username)
);

CREATE TABLE tasks (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT       NOT NULL,
  title        VARCHAR(200) NOT NULL,
  task_date    DATE         NOT NULL,
  is_all_day   TINYINT(1)   NOT NULL DEFAULT 0,
  time_label   VARCHAR(30)      NULL,
  latest_start DATE             NULL,
  category     VARCHAR(20)  NOT NULL,
  note         VARCHAR(250)     NULL,
  completed    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_date (user_id, task_date),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE attachments (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id       BIGINT       NOT NULL,
  user_id       BIGINT       NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(64)  NOT NULL,
  size          BIGINT       NOT NULL,
  content_type  VARCHAR(120)     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_task (task_id),
  KEY idx_user (user_id),
  CONSTRAINT fk_att_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE marked_days (
  id      BIGINT      AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT      NOT NULL,
  day     DATE        NOT NULL,
  type    VARCHAR(10) NOT NULL,
  UNIQUE KEY uk_user_day (user_id, day),
  CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE diaries (
  id         BIGINT       AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT       NOT NULL,
  day        DATE         NOT NULL,
  weather    VARCHAR(200) NOT NULL DEFAULT '',
  mood       VARCHAR(200) NOT NULL DEFAULT '',
  message    TEXT             NULL,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_day (user_id, day),
  CONSTRAINT fk_diary_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**设计说明**

- 前端把 `importantDays` 与 `specialDays` 存成两个数组，靠代码保证互斥。改为单表加
  `UNIQUE(user_id, day)` 约束后，互斥由数据库保证，前端逻辑反而更简单。这是关系型数据库
  建模相对「本地数组」的典型收益。
- 列名用 `task_date` / `day` 而非 `date`，避开 MySQL 关键字带来的反引号噪音。
- 表结构用 `schema.sql` 手工维护，JPA 设为 `ddl-auto=validate`。手工写一遍 DDL 比让
  Hibernate 自动建表更能学到东西，且 `validate` 能在实体与表结构不一致时立刻报错。

### 5.3 API 接口

统一前缀 `/api`。除 `/api/auth/**` 外均需 `Authorization: Bearer <token>`。
响应体为 JSON，时间字段为字符串，日期为 `YYYY-MM-DD`。

```
POST   /api/auth/register        body { username, password }  → 201 { token, username }
POST   /api/auth/login           body { username, password }  → 200 { token, username }
GET    /api/me                                                → 200 { username }

GET    /api/tasks                                             → 200 Task[]
POST   /api/tasks                body TaskRequest              → 201 Task
PUT    /api/tasks/{id}           body TaskRequest              → 200 Task
PATCH  /api/tasks/{id}/complete  body { completed: boolean }   → 200 Task
DELETE /api/tasks/{id}                                        → 204
DELETE /api/tasks?before=YYYY-MM-DD                           → 200 { deleted: n }

GET    /api/marked-days                                       → 200 { importantDays: [], specialDays: [] }
PUT    /api/marked-days/{date}   body { type: "important"|"special"|null } → 200 { ...同 GET }

GET    /api/diaries/{date}                                    → 200 Diary | null
PUT    /api/diaries/{date}       body DiaryRequest            → 200 Diary

POST   /api/tasks/{id}/attachments   multipart/form-data 字段名 file → 201 Attachment
GET    /api/attachments/{id}         → 200 文件字节流
DELETE /api/attachments/{id}         → 204
```

**TaskRequest 不包含附件字段。** 附件只能通过 `POST /api/tasks/{id}/attachments` 单独上传，
`PUT /api/tasks/{id}` 也不改动附件。这样附件的增删有唯一入口，避免两套逻辑冲突。

**注册校验规则**：用户名 3–50 字符，仅允许字母、数字、下划线；密码 6–64 字符。
用户名重复返回 409。

**日期字段格式**：所有日期均为 `YYYY-MM-DD` 字符串，
`GET /api/marked-days` 返回的两个数组元素也是该格式。

Task JSON 结构（字段名与现有前端一致，便于前端改造）：

```json
{
  "id": 12,
  "title": "写周报",
  "date": "2026-09-16",
  "isAllDay": false,
  "timeLabel": "09:00 – 10:00",
  "latestStart": null,
  "category": "study",
  "note": "",
  "completed": false,
  "attachments": [{ "id": 3, "name": "报告.pdf", "size": 123456 }]
}
```

Diary JSON 结构：

```json
{ "weather": ["sunny"], "mood": ["happy"], "message": "今天不错" }
```

`GET /api/diaries/{date}` 在无记录时返回 200 且 body 为 `null`，避免前端处理 404。

### 5.4 JWT 认证

- 算法 HS256，密钥写在 `application.yml`，从环境变量注入（见 5.7）。
- 载荷 `{ sub: <userId>, name: <username>, exp: <签发时间 + 7 天> }`。
- `AuthInterceptor` 拦截 `/api/**`，**放行 `/api/auth/**` 与所有 `OPTIONS` 请求**。
- 校验通过后把 userId 写入 `request.setAttribute("userId", ...)`；
  通过 `CurrentUserIdResolver` 暴露为 `@CurrentUserId Long userId` 方法参数。
  用注解解析器而非直接读 `@RequestAttribute`，是为了让 Controller 签名更干净，
  同时把「认证结果如何抵达业务方法」这件事显式化。

### 5.5 四个必须写进代码的坑

1. **拿不到真实客户端 IP。** 走隧道后 `request.getRemoteAddr()` 返回 `127.0.0.1`
   （cloudflared 与后端同机）。真实 IP 在 `CF-Connecting-IP` 请求头。
   限流若读错，所有客户端共用一个 IP，第一个用户即吃满配额。
   `ClientIp` 工具类优先读 `CF-Connecting-IP`，缺失时回退 `getRemoteAddr()`。

2. **拦截器必须放行 OPTIONS。** 跨站请求先发预检，预检不带 `Authorization` 头。
   若被拦截器拦下返回 401，浏览器报出的却是「CORS 错误」，排查方向会被彻底带偏。

3. **每个查询都必须带 `user_id` 条件。** 例如附件下载若不校验归属，
   任何人改一下 URL 里的数字就能下载他人文件（水平越权 / IDOR）。
   Repository 层一律使用 `findByIdAndUserId(...)` 这类方法，
   禁止直接 `findById(...)` 后返回给调用方。

4. **上传文件名不能直接落盘。** 用户传 `../../application.yml` 会造成路径穿越。
   落盘用 UUID 重命名（存 `stored_name`），原始名只存数据库字段。
   下载响应必须带 `Content-Disposition: attachment` 与
   `Content-Type: application/octet-stream`，防止上传 HTML 后诱导他人访问形成 XSS。

### 5.6 限流与配额

**限流**：`RateLimiter` 手写滑动窗口，`ConcurrentHashMap<String, Deque<Long>>`，
key 为客户端 IP。

| 接口 | 限制 |
|---|---|
| `POST /api/auth/register` | 同一 IP 1 小时内最多 3 次 |
| `POST /api/auth/login` | 同一 IP 15 分钟内最多 10 次 |

超过返回 429。需启动一个定时任务（每 10 分钟）清理过期窗口，
否则 map 会随 IP 数无限增长——该内存泄漏点本身是重要的学习内容。

**配额**：

| 项 | 值 | 实现 |
|---|---|---|
| 单文件大小 | 10 MB | `spring.servlet.multipart.max-file-size` |
| 单请求大小 | 12 MB | `spring.servlet.multipart.max-request-size` |
| 每用户总附件容量 | 200 MB | `users.storage_used` 记账，超限返回 413 |

上传时先校验配额再落盘。附件落盘路径 `data/attachments/{userId}/{uuid}`。

**删除时的磁盘清理**（容易漏掉，漏掉会导致磁盘只增不减）：数据库的
`ON DELETE CASCADE` 只删表记录，**不会删磁盘文件**。因此以下三个操作都必须在
Service 层显式收集待删附件、删除磁盘文件、并从 `storage_used` 中扣减：

| 操作 | 需要做的事 |
|---|---|
| `DELETE /api/attachments/{id}` | 删文件 + 扣减 `storage_used` |
| `DELETE /api/tasks/{id}` | 删该任务所有附件文件 + 按总量扣减 |
| `DELETE /api/tasks?before=...` | 同上，对每个被删任务处理 |

删除磁盘文件失败（文件已被手工删除等）不应导致接口报错，记录日志后继续。
`storage_used` 的扣减放在同一事务内，保证与附件记录一致。

### 5.7 配置

`application.yml` 中的敏感值走环境变量，不写进版本库：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/deadline?useUnicode=true&characterEncoding=utf8mb4&serverTimezone=Asia/Shanghai
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 12MB
app:
  jwt:
    secret: ${JWT_SECRET}
    expire-days: 7
  upload:
    dir: ./data/attachments
    user-quota-bytes: 209715200
  cors:
    allowed-origin: https://xiaojiu-aaa.github.io
```

VM 上通过 systemd 的 `Environment=` 或启动脚本注入这三个变量。

### 5.8 CORS 配置

`WebConfig` 中放行 `allowed-origin`，并设置：

- 允许的方法：GET、POST、PUT、PATCH、DELETE、OPTIONS
- 允许的头：`Content-Type`、`Authorization`
- 允许携带凭证：否（不使用 Cookie，JWT 走请求头）

## 6. 前端改造设计

### 6.1 新增文件

```
src/api/client.js     唯一的网络出口：baseURL、token 注入、401 跳登录、错误提取
src/api/index.js      所有接口函数（getTasks / createTask / uploadAttachment ...）
src/session.js        当前用户与 token 的响应式状态（用 ref，不引入 Pinia store）
```

规则：**所有网络请求只允许从 `client.js` 出去。** 组件里只写 `await api.createTask(payload)`。
这样隧道 URL 变化或接口调整都只影响一处。

### 6.2 本地存储键

| 键 | 用途 |
|---|---|
| `deadline_token` | JWT |
| `deadline_username` | 当前用户名，仅用于界面显示 |
| `deadline_api_base` | 后端地址，运行时配置 |

`deadline_api_base` 为空时，登录页需明确提示用户先配置服务器地址。

### 6.3 要删除或修改的文件

| 文件 | 处理 |
|---|---|
| `src/utils/storage.js` | 删除，能力拆进 `api/` 与 `session.js` |
| `src/utils/db.js` | 删除（Dexie 不再使用） |
| `src/router/index.js` | 守卫从「读 localStorage 的 currentUser」改为「读 `deadline_token`」 |
| `src/main.js` | `__resetAll()` 改为只清 token、用户名与 API 地址；它不再有能力清空数据库 |
| `src/components/SettingsPanel.vue` | 增加「服务器地址」菜单项 |
| `src/components/LoginPage.vue` | 登录/注册改 async；页脚增加「服务器地址」入口 |

**`LoginPage.vue` 的服务器地址入口是必须的**：用户首次访问线上站点时还没有 token，
如果只能在登录后才能改服务器地址，将无法完成首次登录。

### 6.4 MainPage.vue 的重构

现在的方式是「改内存数组 → 整个数组写回 localStorage」。改为后端后必须变成细粒度调用：

| 现有函数 | 改为 |
|---|---|
| `onTaskCreate` 本地生成 id 后整表保存 | `POST /api/tasks`，使用后端返回的 id |
| `onTaskUpdate` 改数组后整表保存 | `PUT /api/tasks/{id}` |
| `onTaskDelete` 过滤数组后整表保存 | `DELETE /api/tasks/{id}` |
| `onTaskToggleComplete` | `PATCH /api/tasks/{id}/complete` |
| `clearArchive` | `DELETE /api/tasks?before=<cutoff>` |
| `persistTasks()` | 删除 |
| `loadTasks()` | `GET /api/tasks` |

**等后端响应再更新界面**（按钮加 loading 态），不做乐观更新。乐观更新需要处理失败回滚，
会额外引入大量状态，等主链路跑通后再考虑。

注意：`generateId('t')` / `generateId('att')` 不再用于任务和附件 id，改由数据库生成。
`generateId` 若在别处仍有使用则保留，否则删除。

### 6.5 附件流程

**上传顺序变化**：现在是本地生成 id 即可挂附件；改为后端后必须先
`POST /api/tasks` 拿到 taskId，再 `POST /api/tasks/{id}/attachments` 逐个上传。
`TaskEditPanel.vue` 的提交顺序需要相应调整：先建任务，再传文件，最后刷新任务对象。

**下载不能用 `<a href>`**：浏览器直接跳转不会带上 `Authorization` 头，会稳定返回 401。
必须用 `fetch` 取回 blob，再 `URL.createObjectURL()` 生成临时链接触发下载，用后 `revokeObjectURL`。
该坑不提前知道会卡很久。

### 6.6 导出与导入

- 导出：逻辑基本不变（JSZip 打包），只是数据源从 localStorage/IndexedDB 换成 API 与 blob 下载。
- 导入：**复用现有的逐个创建接口**，不新增批量接口。任务量小时完全够用，少写一套代码。
  这是有意为之的简化，不是疏漏。

### 6.7 已知简化（有意为之）

| 简化 | 现状 | 正规做法 |
|---|---|---|
| `time_label` 存展示字符串（如 `"09:00 – 10:00"`） | 保持与前端一致，避免改动 TaskEditPanel | 拆成 `start_time` / `end_time` 两个 TIME 列 |
| `weather` / `mood` 存逗号分隔字符串 | JPA 实体里映射为 String，Service 层拆分 | 用 JSON 列或建关联表 |
| 导入逐条调用接口 | 实现简单 | 单个批量接口 + 事务 |

这三项都不影响功能正确性，且都是可以在后续迭代中自然改进的点。

## 7. 部署设计

### 7.1 CentOS 7 的三个陷阱

1. **yum 源已下线。** CentOS 7 于 2024-06-30 停止维护，`mirrorlist.centos.org` 不可用，
   `yum install` 会全部报错。须先切换到 `vault.centos.org`。
2. **源里没有 JDK 17。** CentOS 7 源最高到 JDK 11，而 Spring Boot 3 要求 JDK 17+。
   **不走 yum**，直接从 Adoptium 下载 JDK 17 的 tar.gz 解压到 `/opt` 并配置 `JAVA_HOME`。
3. **数据库账号不用 root。** 建专用账号 `deadline_app`，只授权 `deadline` 库。

### 7.2 本地开发期的数据库连通

Windows 上的 IDEA 需连接 VM 的 MySQL 调试，需要：

- MySQL `bind-address = 0.0.0.0`
- 授权 `deadline_app` 从 Windows 主机网段访问
- CentOS 防火墙开放 3306

**3306 仅在 VMware NAT 内网开放，绝不通过隧道暴露。** 隧道只暴露 8080。

### 7.3 部署流程

前端：`git push` 即可，`.github/workflows/deploy.yml` 已配置好。

后端：

1. 本地 `mvn package` 生成 jar
2. `scp` 传到 VM
3. 通过环境变量注入 `DB_USERNAME` / `DB_PASSWORD` / `JWT_SECRET`
4. 启动：先用 `nohup java -jar ... &`（能亲眼看到日志、理解进程），
   跑通后再换成 systemd 服务
5. 安装 cloudflared，执行 `cloudflared tunnel --url http://localhost:8080`
6. 把输出的 `https://xxx.trycloudflare.com` 填入前端「服务器地址」

### 7.4 隧道 URL 变化

cloudflared 快速隧道的 URL 在每次重启后变化。因为前端 API 地址是运行时可配的，
变化时只需在前端设置面板更新一次，前端与后端代码都不需要改动。

## 8. 错误处理

**后端**：`GlobalExceptionHandler`（`@RestControllerAdvice`）把 `BizException` 转成
`{ "message": "..." }` 加合适的状态码。

| 状态码 | 场景 |
|---|---|
| 400 | 参数校验失败 |
| 401 | token 缺失 / 过期 / 无效 |
| 404 | 资源不存在，**或存在但不属于当前用户** |
| 409 | 用户名已存在 |
| 413 | 超过文件大小或用户配额 |
| 429 | 触发限流 |

**统一用 404 而非 403 表示「不属于当前用户」。** 如果返回 403，攻击者就能据此判断
「这个 id 确实存在，只是不属于我」，从而枚举出系统里有哪些资源。
返回 404 让「不存在」和「不属于你」无法区分。本设计中 403 不用于资源归属判断。

**前端**：`client.js` 统一拦截。

- 401 → 清除 token 与用户名，跳转登录页
- 网络请求失败（fetch reject）→ 提示「连不上后端，请检查虚拟机与隧道是否在运行」
- 其余 → 弹出后端返回的 `message`

网络失败的明确提示是必需的：否则 VM 关机时用户看到的是各种莫名其妙的报错。

## 9. 后续可选升级

### 9.1 固定 URL
购买域名并接入 Cloudflare，改用命名隧道。前端只需修改「服务器地址」一项。

### 9.2 其他
- 密码强度校验与修改密码接口
- 附件类型白名单
- 结构化导入接口与事务
- 6.7 中列出的三项数据模型正规化
- 后端改用 systemd 托管并配置日志轮转

## 10. 测试策略

按性价比排序，不要求全部实现。

1. **越权测试（最值得写）**：用用户 A 的 token 请求用户 B 的任务与附件，
   断言返回 404。这是唯一能自动抓住 IDOR 的手段。
2. **`RateLimiter` 单元测试**：模拟同一 IP 连续请求，断言第 N 次后被拒；
   断言过期窗口被清理。
3. **JPA 层测试**：用 H2 内存库，不依赖 VM 上的 MySQL。
4. **前端手动验证**：`vite dev` 连本机后端，走完
   注册 → 登录 → 建任务 → 传附件 → 下载附件 → 导出 整条链路。

## 11. 实施阶段

每个阶段都独立可验证，避免「全部写完才发现连不上」。

| 阶段 | 内容 | 验证方式 |
|---|---|---|
| 0 | VM 装 JDK 17、MySQL 就绪；Windows 的 IDEA 能连上 VM 的 MySQL | IDEA 测试数据库连接 |
| 1 | 后端骨架 + `users` 表 + 注册/登录/JWT | `curl` 拿到 token |
| 2 | `tasks` CRUD + 拦截器 + 越权防护 | `curl` 用 A 的 token 读 B 的任务，应 404 |
| 3 | `marked_days` + `diaries` | `curl` |
| 4 | 附件上传下载 + 配额 + 限流 | `curl -F` 传文件；超配额应 413 |
| 5 | 前端改造（client.js → 登录 → 任务 → 日期 → 日记 → 附件） | 本地 `vite dev` 连 VM 后端 |
| 6 | 隧道 + 部署 + 线上联调 | 手机上打开 GitHub Pages 真实走一遍 |
| 7 | 导出/导入改造 | 导出 zip 再导入回来 |

阶段 5 之前，前端在 GitHub Pages 上保持原样运行、不受影响。后端全部做好后再切前端，风险可控。

## 12. 已知风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| VM / Windows / 家宽任一环节中断 | 线上站点不可用 | 前端明确提示；接受该代价 |
| 隧道 URL 公开后遭扫描 | 陌生人注册并写入数据 | 限流 + 文件大小限制 + 用户配额 |
| 陌生人在用户本机写入内容 | 用户是运营者，也是唯一能查看全部数据的人 | 用户已明确知悉并接受 |
| 磁盘被附件占满 | 服务不可用 | 200MB/用户配额；必要时命令行清理 `data/attachments` |
| JWT 泄露 | 他人可冒充该用户 | 7 天过期；HTTPS 传输 |
| 快速隧道 URL 变化 | 线上站点暂时连不上 | 运行时配置，改一次即可 |

## 13. 明确不做（Non-goals）

- 不做密码找回、邮箱验证、第三方登录
- 不做多端实时同步 / WebSocket
- 不做离线可用与本地缓存
- 不做管理后台
- 不引入 Docker（先用 `nohup` 与 systemd，让进程与部署细节可见）
- 不重构与本次改造无关的前端样式与动画
