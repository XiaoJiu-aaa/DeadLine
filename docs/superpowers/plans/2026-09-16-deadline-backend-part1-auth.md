# DeadLine 后端实现计划 · 第一部分：环境与认证

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 CentOS 7 虚拟机上搭好 Java 运行环境，并交付一个能注册、能登录、能校验令牌的 Spring Boot 后端。

**Architecture:** 独立 Maven 项目 `deadline-server`（不属于前端仓库）。分层结构
Controller → Service → Repository → MySQL。认证用手写 JWT 放在 `Authorization` 请求头，
由 `HandlerInterceptor` 统一校验，不使用 Spring Security。

**Tech Stack:** Java 17、Spring Boot 3.x、Spring Data JPA、MySQL 8、jjwt 0.12.x、
spring-security-crypto（仅取 BCrypt）、JUnit 5 + MockMvc + H2（测试用）

**依据文档：** `docs/superpowers/specs/2026-09-16-deadline-backend-design.md`

---

## 前置说明

**本计划覆盖 spec 的阶段 0–1。** 阶段 2–4（tasks / marked_days / diaries / 附件 / 限流）
在第二部分，阶段 5–7（前端改造与部署）在第三部分。

**执行环境约定：**
- 「Windows 上」= 在 `C:\Users\Lenovo\Desktop` 下用 Git Bash 操作（写代码用 IDEA）
- 「VM 上」= SSH 登录 CentOS 7 虚拟机后执行

**项目根目录：** `C:\Users\Lenovo\Desktop\deadline-server`

**已确认的环境事实（2026-09-16 核对）：**
VM 是 CentOS 7.6，yum 源可用（无需切 vault），MySQL 8.0.46 已装并运行，
原 JDK 8 保留不动、另装 JDK 17 到 `/opt/jdk17`，VM 内网地址 `192.168.88.130`。

---

## Spring Boot 4 与计划原稿的差异

Spring Initializr 当前只提供 **Spring Boot 4.x**。Boot 4 相对 Boot 3 有一批破坏性改动，
本计划已按 Boot 4 调整，执行时**不要套用网上 Spring Boot 3 的教程**。

| 变化 | 对本次实现的影响 |
|---|---|
| Jackson 2 → 3，包名 `com.fasterxml.jackson` → `tools.jackson`，`ObjectMapper` 被 `JsonMapper` 取代 | **已规避**：拦截器与测试中不再使用任何 Jackson 类型，改为写 JSON 字符串字面量 |
| `spring-boot-starter-web` 拆分为更细粒度的 starter | 由 IDEA 向导自动填写正确的依赖，不要手改 |
| `@SpringBootTest` 不再自动装配 MockMvc | **已规避**：`ApiTestSupport` 中显式声明 `@AutoConfigureMockMvc` |
| `@MockBean` / `@SpyBean` → `@MockitoBean` / `@MockitoSpyBean` | 本部分未使用 mock Bean |
| Hibernate 6 → 7 | `ddl-auto: validate` 语义不变；`LocalDateTime` 仍映射为 `datetime(6)` |
| JUnit 5 → 6 | `org.junit.jupiter.*` 包名与断言 API 不变 |
| Java 基线仍为 **17** | VM 上的 JDK 17 可用，无需升到 21 |

**开发机 JDK 必须选 17。** 用户 Windows 上环境变量指向 JDK 25，但 VM 运行时是 JDK 17。
如果在 IDEA 里用 JDK 25 构建，产出的 class 文件版本是 69，传到 VM 上会报
`UnsupportedClassVersionError`。IDEA 项目 SDK 选 17，且 pom 中
`<java.version>17</java.version>`（向导会按 SDK 自动写入，需核对）。
以 `java -version` 看到的 VM 版本为准。

---

## Task 0: 准备 CentOS 7 环境

CentOS 7 已于 2024-06-30 停止维护，yum 源下线，且源里最高只有 JDK 11（Spring Boot 3 要求 17+）。
本任务修复源并用 tarball 方式安装 JDK 17，同时确认 MySQL 可用。

**Files:** 无（纯环境操作）

- [ ] **Step 1: SSH 登录虚拟机，确认系统版本**

VM 上执行：

```bash
cat /etc/redhat-release
```

Expected: `CentOS Linux release 7.9.2009 (Core)` 或类似 7.x 版本。
如果输出不是 7.x，停下来告诉用户，后续命令需要调整。

- [ ] **Step 2: 备份 yum 源配置**

VM 上执行：

```bash
mkdir -p ~/yum-backup && cp /etc/yum.repos.d/CentOS-*.repo ~/yum-backup/ && ls ~/yum-backup/
```

Expected: 列出若干 `.repo` 文件，说明备份成功。

- [ ] **Step 3: 把 yum 源切换到 vault.centos.org**

VM 上执行：

```bash
sed -i 's/^mirrorlist=/#mirrorlist=/g; s|^#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-*.repo
grep -h '^baseurl' /etc/yum.repos.d/CentOS-*.repo | head -5
```

Expected: 输出若干行 `baseurl=http://vault.centos.org/centos/7/...`。

如果输出为空，说明替换没生效，改用手工编辑：
`vi /etc/yum.repos.d/CentOS-Base.repo`，把 `baseurl` 那几行的注释去掉，
并把 `mirror.centos.org` 全部改成 `vault.centos.org`。

- [ ] **Step 4: 验证 yum 可用**

VM 上执行：

```bash
yum clean all && yum makecache
```

Expected: 最后一行出现 `Metadata cache created.`，且过程中没有
`Could not resolve host` 或 `Cannot find a valid baseurl` 错误。

- [ ] **Step 5: 安装基础工具**

VM 上执行：

```bash
yum install -y curl wget tar which
```

Expected: 出现 `Complete!`。

- [ ] **Step 6: 下载 JDK 17（不从 yum 装，源里没有）**

VM 上执行：

```bash
curl -L -o /tmp/jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
ls -lh /tmp/jdk17.tar.gz
```

Expected: 文件大小约 180–200 MB。

**如果下载极慢或失败**（国内网络访问 GitHub 受限），改用清华镜像：

```bash
curl -L -o /tmp/jdk17.tar.gz "https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jdk/x64/linux/OpenJDK17U-jdk_x64_linux_hotspot_17.0.13_11.tar.gz"
```

- [ ] **Step 7: 解压 JDK 到 /opt**

VM 上执行：

```bash
mkdir -p /opt/jdk17
tar -xzf /tmp/jdk17.tar.gz -C /opt/jdk17 --strip-components=1
/opt/jdk17/bin/java -version
```

Expected:

```
openjdk version "17.0.13" 2024-10-15
OpenJDK Runtime Environment Temurin-17.0.13+11 (build 17.0.13+11)
OpenJDK 64-Bit Server VM Temurin-17.0.13+11 (build 17.0.13+11, mixed mode, sharing)
```

版本号的具体小版本可能不同，只要是 17.x 即可。

- [ ] **Step 8: 配置 JAVA_HOME**

VM 上执行：

```bash
cat > /etc/profile.d/jdk17.sh <<'EOF'
export JAVA_HOME=/opt/jdk17
export PATH=$JAVA_HOME/bin:$PATH
EOF
chmod +x /etc/profile.d/jdk17.sh
source /etc/profile.d/jdk17.sh
java -version && echo "JAVA_HOME=$JAVA_HOME"
```

Expected: 打印出 java 版本，且 `JAVA_HOME=/opt/jdk17`。

- [ ] **Step 9: 确认 MySQL 版本**

VM 上执行：

```bash
mysql --version
systemctl status mysqld 2>/dev/null | head -3 || systemctl status mariadb | head -3
```

Expected: 形如 `mysql  Ver 8.0.xx for Linux on x86_64 (MySQL Community Server - GPL)`。

**分支处理：**
- 如果输出是 `MariaDB 10.x`：可以继续，MariaDB 10.x 兼容本项目的 JDBC 用法。
  后续文档中出现 `mysql` 命令时用 `mariadb` 代替。
- 如果输出是 `MariaDB 5.5`：版本过旧，且 `DATETIME(6)` 等特性支持不佳。
  停下来告诉用户，需要先升级数据库。
- 如果命令不存在：MySQL 未安装，停下来告诉用户，需要先安装 MySQL 8。

- [ ] **Step 10: 创建数据库与专用账号**

VM 上执行（把 `换成你自己的强密码` 替换成一个真实密码，记住它，后面要用）：

```bash
mysql -uroot -p
```

进入 MySQL 提示符后执行：

```sql
CREATE DATABASE IF NOT EXISTS deadline
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'deadline_app'@'localhost' IDENTIFIED BY '换成你自己的强密码';
CREATE USER IF NOT EXISTS 'deadline_app'@'%'         IDENTIFIED BY '换成你自己的强密码';

GRANT ALL PRIVILEGES ON deadline.* TO 'deadline_app'@'localhost';
GRANT ALL PRIVILEGES ON deadline.* TO 'deadline_app'@'%';
FLUSH PRIVILEGES;

SELECT user, host FROM mysql.user WHERE user = 'deadline_app';
EXIT;
```

Expected: 列出两行，host 分别是 `localhost` 和 `%`。

`'%'` 这个账号是给 Windows 上的 IDEA 连过来调试用的，只在 VM 的内网里可达。

- [ ] **Step 11: 允许 MySQL 监听内网地址**

VM 上执行：

```bash
grep -rn "bind-address" /etc/my.cnf /etc/my.cnf.d/ 2>/dev/null
```

如果没有输出，或输出是 `bind-address = 127.0.0.1`，则执行：

```bash
echo "[mysqld]" > /etc/my.cnf.d/deadline-remote.cnf
echo "bind-address = 0.0.0.0" >> /etc/my.cnf.d/deadline-remote.cnf
systemctl restart mysqld 2>/dev/null || systemctl restart mariadb
ss -lntp | grep 3306
```

Expected: 输出中 3306 的监听地址是 `0.0.0.0:3306` 或 `*:3306`，
而不是 `127.0.0.1:3306`。

- [ ] **Step 12: 在 VM 内网放行 3306**

VM 上执行：

```bash
firewall-cmd --permanent --add-port=3306/tcp && firewall-cmd --reload && firewall-cmd --list-ports
```

Expected: 输出中包含 `3306/tcp`。

如果报 `FirewallD is not running`，说明防火墙没开，跳过此步即可。

- [ ] **Step 13: 从 Windows 验证能连上 VM 的 MySQL**

先在 VM 上查它的 IP：

```bash
ip addr | grep 'inet ' | grep -v 127.0.0.1
```

记下形如 `192.168.x.x` 的地址。

然后在 **Windows 的 Git Bash** 里执行（`192.168.x.x` 换成上面查到的地址）：

```bash
ping -n 2 192.168.x.x
```

Expected: 有回复，丢包率 0%。

用 IDEA 验证实际连接：IDEA 右侧 `Database` 面板 → `+` → `Data Source` → `MySQL`，
填入 Host `192.168.x.x`、Port `3306`、User `deadline_app`、Password（Step 10 设的）、
Database `deadline`，点 `Test Connection`。

Expected: 显示 `Successful`。

如果超时，按顺序排查：VM 是否开机 → `ping` 是否通 → `ss -lntp | grep 3306` 是否监听
`0.0.0.0` → 防火墙是否放行 → 账号 host 是否为 `%`。

---

## Task 1: 创建 Spring Boot 工程骨架

**Files:**
- Create: `C:\Users\Lenovo\Desktop\deadline-server\pom.xml`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/DeadlineApplication.java`
- Create: `deadline-server/src/main/resources/application.yml`

- [ ] **Step 1: 用 IDEA 向导创建工程**

在 IDEA 中 `File` → `New` → `Project`，左侧选 `Spring Initializr`，按下表填写：

| 字段 | 值 |
|---|---|
| Name | `deadline-server` |
| Location | `C:\Users\Lenovo\Desktop` |
| Language | Java |
| Type | Maven |
| Group | `com.xiaojiu` |
| Artifact | `deadline-server` |
| Package name | `com.xiaojiu.deadline` |
| JDK | **17**（下拉里选 Emulator 17；若没有，用 `Download JDK...` 装 Eclipse Temurin 17） |
| Java | 17 |
| Packaging | Jar |
| Spring Boot | 最新的 4.x |

`Dependencies` 中勾选：`Spring Web`、`Spring Data JPA`、`MySQL Driver`、`Validation`。

**JDK 必须选 17，不能选 25。** 用户 Windows 上环境变量指向 JDK 25，
但 VM 上运行的是 JDK 17。用 25 构建出的 class 文件版本过高，传过去会报
`UnsupportedClassVersionError: class file version 69`。

**Spring Boot 版本选 4.x。** 不要试图降级到 3.x——3.5 已超出 OSS 支持期，
且 Spring Initializr 已不再提供。

- [ ] **Step 2: 核对 pom.xml 的 Java 版本**

打开 `deadline-server/pom.xml`，确认 `<properties>` 块中有：

```xml
	<properties>
		<java.version>17</java.version>
	</properties>
```

不是 17 就改成 17。这一项决定编译产物的字节码版本，是能否在 VM 上运行的关键。

在 IDEA 终端或 Git Bash 中确认目录结构：

```bash
ls "C:/Users/Lenovo/Desktop/deadline-server"
```

Expected: 看到 `pom.xml`、`src`、`mvnw`、`mvnw.cmd`。

- [ ] **Step 3: 把 jjwt 和 BCrypt 依赖加入 pom.xml**

打开 `deadline-server/pom.xml`，在 `<dependencies>` 块内、
`</dependencies>` 之前加入以下内容：

```xml
		<!-- JWT 签发与校验 -->
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-api</artifactId>
			<version>0.12.6</version>
		</dependency>
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-impl</artifactId>
			<version>0.12.6</version>
			<scope>runtime</scope>
		</dependency>
		<dependency>
			<groupId>io.jsonwebtoken</groupId>
			<artifactId>jjwt-jackson</artifactId>
			<version>0.12.6</version>
			<scope>runtime</scope>
		</dependency>

		<!-- 只取 BCryptPasswordEncoder，不引入完整的 Spring Security -->
		<dependency>
			<groupId>org.springframework.security</groupId>
			<artifactId>spring-security-crypto</artifactId>
		</dependency>

		<!-- 测试用内存数据库 -->
		<dependency>
			<groupId>com.h2database</groupId>
			<artifactId>h2</artifactId>
			<scope>test</scope>
		</dependency>
```

`spring-security-crypto` 的版本由 Spring Boot 的 BOM 管理，所以不写 `<version>`。
`h2` 同理。

注意 `spring-security-crypto` **不是** `spring-boot-starter-security`。前者只是一个
提供 `BCryptPasswordEncoder` 的独立小工具包，引入它不会触发 Spring Security 的
自动配置（否则所有接口都会默认被拦，还会在 Boot 4 里因 CSRF 默认开启而出现 403）。

加了依赖后执行一次，确认版本能解析出来：

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw -q dependency:tree -Dincludes=org.springframework.security:spring-security-crypto
```

Expected: 输出中该依赖带有一个具体版本号（如 `7.0.x`）。
若报 `'dependencies.dependency.version' for ... is missing`，说明 BOM 没管这个包，
需要手动补 `<version>7.0.0</version>` 之类的版本号。

- [ ] **Step 4: 生成 JWT 密钥**

JWT 用 HS256 算法，密钥长度必须 **至少 32 字节（256 位）**，否则 jjwt 会抛
`WeakKeyException`。生成一个：

Windows 的 Git Bash 执行：

```bash
openssl rand -base64 48
```

Expected: 输出一串约 64 字符的 Base64 字符串。**把它记下来，Step 6 要用。**

如果 `openssl` 不可用，改用：

```bash
head -c 48 /dev/urandom | base64
```

- [ ] **Step 5: 写 application.yml**

替换 `deadline-server/src/main/resources/application.yml` 的全部内容为：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/deadline?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: ${DB_USERNAME:deadline_app}
    password: ${DB_PASSWORD:}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        format_sql: true

app:
  jwt:
    secret: ${JWT_SECRET:}
    expire-days: 7
  cors:
    allowed-origin: https://xiaojiu-aaa.github.io

logging:
  level:
    org.hibernate.SQL: debug
```

三个 `${...}` 占位符从环境变量读取，密码和密钥不会进版本库。

`ddl-auto: validate` 表示 Hibernate 只校验实体与表是否匹配、不自动建表，
表结构由 Task 2 的 `schema.sql` 手工维护。

- [ ] **Step 6: 在 IDEA 里配置运行环境变量**

IDEA 中打开 `Run` → `Edit Configurations` → 选中 `DeadlineServerApplication`
→ 在 `Environment variables` 填入：

```
DB_USERNAME=deadline_app;DB_PASSWORD=你的MySQL密码;JWT_SECRET=Step4生成的密钥
```

注意 IDEA 这一栏用分号分隔，不是冒号。

**把这份配置存为项目级配置**，避免以后每次重配。

- [ ] **Step 7: 启动应用验证骨架可用**

IDEA 中点击运行 `DeadlineServerApplication`。

Expected: 控制台出现 `Started DeadlineApplication in x.xxx seconds`。

**此时一定会启动失败**，因为还没有建表，`validate` 会报
`Schema-validation: missing table [users]` 之类的错误。这是**预期内的**——
本步骤只验证「依赖下载成功、能编译、能跑到数据库校验这一步」。

如果报的是 `Communications link failure` 或 `Access denied`，
说明 Step 6 的环境变量或 Task 0 的数据库配置有问题，先解决那个。

- [ ] **Step 8: 提交**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
git init
cat > .gitignore <<'EOF'
target/
*.iml
.idea/
data/
*.log
EOF
git add pom.xml .gitignore src/
git commit -m "初始化 Spring Boot 骨架 — 加入 jjwt、BCrypt、H2 依赖"
```

---

## Task 2: 建表并让 JPA 校验通过

**Files:**
- Create: `deadline-server/src/main/resources/schema.sql`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/entity/User.java`

- [ ] **Step 1: 写 schema.sql**

创建 `deadline-server/src/main/resources/schema.sql`：

```sql
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  storage_used  BIGINT       NOT NULL DEFAULT 0,
  created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**为什么是 `DATETIME(6)` 而不是 `DATETIME`：** Hibernate 6 把 Java 的
`LocalDateTime` 映射为数据库的 `datetime(6)`（带微秒精度）。如果这里写 `DATETIME`，
`validate` 会因为精度不匹配而报错。这是 Hibernate 6 最常见的踩坑点之一。

- [ ] **Step 2: 在 VM 上执行建表 SQL**

先在 VM 上建目录并把文件传过去。Windows 的 Git Bash 执行：

```bash
scp "C:/Users/Lenovo/Desktop/deadline-server/src/main/resources/schema.sql" root@192.168.x.x:/tmp/schema.sql
```

（`192.168.x.x` 换成 Task 0 Step 13 查到的 VM 地址，用户按你实际的 SSH 账号改）

VM 上执行：

```bash
mysql -udeadline_app -p deadline < /tmp/schema.sql
mysql -udeadline_app -p deadline -e "SHOW TABLES; DESCRIBE users;"
```

Expected: 列出 `users` 表，字段与 schema.sql 一致。

- [ ] **Step 3: 写 User 实体**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/entity/User.java`：

```java
package com.xiaojiu.deadline.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, unique = true)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "storage_used", nullable = false)
    private Long storageUsed = 0L;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Long getStorageUsed() { return storageUsed; }
    public void setStorageUsed(Long storageUsed) { this.storageUsed = storageUsed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

`insertable = false, updatable = false` 让 `created_at` 完全交给数据库的
`DEFAULT CURRENT_TIMESTAMP(6)` 生成，Java 侧只读。

- [ ] **Step 4: 启动应用验证校验通过**

IDEA 中运行 `DeadlineServerApplication`。

Expected: `Started DeadlineApplication in x.xxx seconds`，
且**控制台中没有** `Schema-validation` 相关的错误。

如果报 `wrong column type`，仔细对比报错里期望的类型和 schema.sql 里写的类型，
修改 schema.sql 后在 VM 上重新执行建表语句（先 `DROP TABLE users;`）。

- [ ] **Step 5: 提交**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
git add src/main/resources/schema.sql src/main/java/com/xiaojiu/deadline/entity/User.java
git commit -m "添加 users 表结构与对应实体 — JPA validate 通过"
```

---

## Task 3: 统一异常处理

先建立异常基础设施，后面的接口才能用统一格式返回错误。

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/exception/BizException.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/exception/GlobalExceptionHandler.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/dto/ApiError.java`

- [ ] **Step 1: 写 ApiError**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/dto/ApiError.java`：

```java
package com.xiaojiu.deadline.dto;

public record ApiError(String message) {
}
```

所有错误响应统一为 `{"message": "..."}`。

- [ ] **Step 2: 写 BizException**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/exception/BizException.java`：

```java
package com.xiaojiu.deadline.exception;

import org.springframework.http.HttpStatus;

public class BizException extends RuntimeException {

    private final HttpStatus status;

    public BizException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static BizException badRequest(String message) {
        return new BizException(HttpStatus.BAD_REQUEST, message);
    }

    public static BizException unauthorized(String message) {
        return new BizException(HttpStatus.UNAUTHORIZED, message);
    }

    public static BizException notFound(String message) {
        return new BizException(HttpStatus.NOT_FOUND, message);
    }

    public static BizException conflict(String message) {
        return new BizException(HttpStatus.CONFLICT, message);
    }
}
```

- [ ] **Step 3: 写 GlobalExceptionHandler**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/exception/GlobalExceptionHandler.java`：

```java
package com.xiaojiu.deadline.exception;

import com.xiaojiu.deadline.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BizException.class)
    public ResponseEntity<ApiError> handleBiz(BizException e) {
        return ResponseEntity.status(e.getStatus()).body(new ApiError(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + " " + err.getDefaultMessage())
                .orElse("参数校验失败");
        return ResponseEntity.badRequest().body(new ApiError(message));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleOther(Exception e) {
        log.error("未预期的异常", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError("服务器内部错误"));
    }
}
```

最后一个 `handleOther` 很重要：它保证任何未预期的异常也返回 `{"message": ...}`
而不把 Java 堆栈泄露给客户端。堆栈只写进服务端日志。

- [ ] **Step 4: 编译验证**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw -q compile
```

Expected: 没有输出，退出码 0。

- [ ] **Step 5: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/exception src/main/java/com/xiaojiu/deadline/dto
git commit -m "添加统一异常处理 — 错误响应统一为 {message}"
```

---

## Task 4: 密码哈希与用户仓储

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/repository/UserRepository.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/config/PasswordConfig.java`
- Modify: `deadline-server/src/main/java/com/xiaojiu/deadline/DeadlineApplication.java`（加 `@ConfigurationPropertiesScan` 不需要，但需要确认已有 `@SpringBootApplication`）
- Test: `deadline-server/src/test/resources/application-test.yml`
- Test: `deadline-server/src/test/java/com/xiaojiu/deadline/TestSupport.java`

- [ ] **Step 1: 写 Repository**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/repository/UserRepository.java`：

```java
package com.xiaojiu.deadline.repository;

import com.xiaojiu.deadline.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);
}
```

只声明方法名，SQL 由 Spring Data JPA 自动生成。

- [ ] **Step 2: 写 BCrypt 配置**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/config/PasswordConfig.java`：

```java
package com.xiaojiu.deadline.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

把它交给 Spring 管理，Service 里注入 `PasswordEncoder` 而不是直接 `new`，这样测试时可以替换。

- [ ] **Step 3: 写测试环境的 H2 配置**

创建 `deadline-server/src/test/resources/application-test.yml`：

```yaml
spring:
  datasource:
    url: jdbc:h2:mem:deadline;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
    driver-class-name: org.h2.Driver
    username: sa
    password: ""
  jpa:
    hibernate:
      ddl-auto: create-drop
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect

app:
  jwt:
    secret: dGVzdC1vbmx5LXNlY3JldC1rZXktZm9yLWp3dC11bml0LXRlc3RzLTEyMzQ1Ng==
    expire-days: 7
  cors:
    allowed-origin: https://xiaojiu-aaa.github.io
```

测试用 H2 内存库，`MODE=MySQL` 让 H2 接受 MySQL 风格的 SQL，
`ddl-auto: create-drop` 让 Hibernate 按实体自动建表。
**测试因此不会校验 `schema.sql`** —— 真实表结构与实体的匹配由 Task 2 Step 4 的
`validate` 保证。

- [ ] **Step 4: 写测试基类**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/TestSupport.java`：

```java
package com.xiaojiu.deadline;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@ActiveProfiles("test")
public @interface TestSupport {
}
```

用自定义注解统一测试配置，避免每个测试类重复写三行注解。

- [ ] **Step 5: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/RepositorySmokeTest.java`：

```java
package com.xiaojiu.deadline;

import com.xiaojiu.deadline.entity.User;
import com.xiaojiu.deadline.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;

@TestSupport
class RepositorySmokeTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void 能保存用户并按用户名查回() {
        User user = new User();
        user.setUsername("alice");
        user.setPasswordHash(passwordEncoder.encode("secret123"));
        userRepository.save(user);

        assertThat(user.getId()).isNotNull();
        assertThat(userRepository.findByUsername("alice")).isPresent();
    }

    @Test
    void 密码哈希不是明文且能被校验() {
        String hash = passwordEncoder.encode("secret123");

        assertThat(hash).isNotEqualTo("secret123");
        assertThat(passwordEncoder.matches("secret123", hash)).isTrue();
        assertThat(passwordEncoder.matches("wrong", hash)).isFalse();
    }
}
```

- [ ] **Step 6: 运行测试**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=RepositorySmokeTest
```

Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0` 和 `BUILD SUCCESS`。

如果报 `Table "USERS" not found`，检查 `application-test.yml` 里的
`DATABASE_TO_LOWER=TRUE` 是否写对。

- [ ] **Step 7: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/repository src/main/java/com/xiaojiu/deadline/config/PasswordConfig.java src/test/
git commit -m "添加 UserRepository 与 BCrypt 密码编码器 — 含测试基类与 H2 测试环境"
```

---

## Task 5: JWT 工具类

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/config/JwtProperties.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/security/JwtUtil.java`
- Modify: `deadline-server/src/main/java/com/xiaojiu/deadline/DeadlineApplication.java`
- Test: `deadline-server/src/test/java/com/xiaojiu/deadline/security/JwtUtilTest.java`

- [ ] **Step 1: 开启配置属性扫描**

修改 `deadline-server/src/main/java/com/xiaojiu/deadline/DeadlineApplication.java`，
在 `@SpringBootApplication` 下面加一行：

```java
package com.xiaojiu.deadline;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class DeadlineApplication {

    public static void main(String[] args) {
        SpringApplication.run(DeadlineApplication.class, args);
    }
}
```

- [ ] **Step 2: 写配置属性类**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/config/JwtProperties.java`：

```java
package com.xiaojiu.deadline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {

    private String secret;
    private int expireDays = 7;

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }

    public int getExpireDays() { return expireDays; }
    public void setExpireDays(int expireDays) { this.expireDays = expireDays; }
}
```

- [ ] **Step 3: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/security/JwtUtilTest.java`：

```java
package com.xiaojiu.deadline.security;

import com.xiaojiu.deadline.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRET =
            "dGVzdC1vbmx5LXNlY3JldC1rZXktZm9yLWp3dC11bml0LXRlc3RzLTEyMzQ1Ng==";

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        JwtProperties props = new JwtProperties();
        props.setSecret(SECRET);
        props.setExpireDays(7);
        jwtUtil = new JwtUtil(props);
    }

    @Test
    void 签发的令牌能解出用户id和用户名() {
        String token = jwtUtil.generate(42L, "alice");

        assertThat(jwtUtil.parseUserId(token)).isEqualTo(42L);
        assertThat(jwtUtil.parseUsername(token)).isEqualTo("alice");
    }

    @Test
    void 签名被换掉的令牌校验失败() {
        String token = jwtUtil.generate(42L, "alice");
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1]
                + ".AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        assertThat(jwtUtil.isValid(tampered)).isFalse();
        assertThatThrownBy(() -> jwtUtil.parseUserId(tampered))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void 用别的密钥签发的令牌校验失败() {
        JwtProperties other = new JwtProperties();
        other.setSecret("YW5vdGhlci1zZWNyZXQta2V5LXRoYXQtaXMtbG9uZy1lbm91Z2gtZm9yLWhzMjU2");
        other.setExpireDays(7);
        String foreignToken = new JwtUtil(other).generate(42L, "alice");

        assertThat(jwtUtil.isValid(foreignToken)).isFalse();
    }

    @Test
    void 空字符串和乱码都判为无效而不是抛异常() {
        assertThat(jwtUtil.isValid("")).isFalse();
        assertThat(jwtUtil.isValid("not-a-jwt")).isFalse();
        assertThat(jwtUtil.isValid(null)).isFalse();
    }
}
```

- [ ] **Step 4: 运行测试确认失败**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=JwtUtilTest
```

Expected: 编译失败，提示找不到 `JwtUtil` 类。这是预期的。

- [ ] **Step 5: 实现 JwtUtil**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/security/JwtUtil.java`：

```java
package com.xiaojiu.deadline.security;

import com.xiaojiu.deadline.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final int expireDays;

    public JwtUtil(JwtProperties props) {
        byte[] secretBytes = decodeSecret(props.getSecret());
        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET 解码后不足 32 字节，HS256 要求至少 256 位密钥。请用 openssl rand -base64 48 重新生成。");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.expireDays = props.getExpireDays();
    }

    private static byte[] decodeSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("缺少 JWT_SECRET 配置");
        }
        try {
            return Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException e) {
            return secret.getBytes(StandardCharsets.UTF_8);
        }
    }

    public String generate(Long userId, String username) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("name", username)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expireDays, ChronoUnit.DAYS)))
                .signWith(key)
                .compact();
    }

    public Long parseUserId(String token) {
        return Long.valueOf(claims(token).getSubject());
    }

    public String parseUsername(String token) {
        return claims(token).get("name", String.class);
    }

    public boolean isValid(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            claims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims claims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

**密钥长度校验是必须的**：jjwt 在密钥不足 256 位时会抛 `WeakKeyException`，
报错信息不会告诉你「密钥太短」，而是抛在很靠后的位置。这里的显式检查
把问题在启动阶段就暴露出来。

- [ ] **Step 6: 运行测试确认通过**

```bash
./mvnw test -Dtest=JwtUtilTest
```

Expected: `Tests run: 4, Failures: 0, Errors: 0` 和 `BUILD SUCCESS`。

- [ ] **Step 7: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/config/JwtProperties.java src/main/java/com/xiaojiu/deadline/security/JwtUtil.java src/main/java/com/xiaojiu/deadline/DeadlineApplication.java src/test/java/com/xiaojiu/deadline/security/
git commit -m "添加 JWT 工具类 — HS256 签发校验，含密钥长度前置校验"
```

---

## Task 6: 注册与登录业务逻辑

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/dto/RegisterRequest.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/dto/LoginRequest.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/dto/AuthResponse.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/service/AuthService.java`
- Create: `deadline-server/src/test/java/com/xiaojiu/deadline/service/AuthServiceTest.java`

- [ ] **Step 1: 写请求与响应 DTO**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/dto/RegisterRequest.java`：

```java
package com.xiaojiu.deadline.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "不能为空")
        @Size(min = 3, max = 50, message = "长度必须在 3 到 50 之间")
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "只能包含字母、数字和下划线")
        String username,

        @NotBlank(message = "不能为空")
        @Size(min = 6, max = 64, message = "长度必须在 6 到 64 之间")
        String password
) {
}
```

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/dto/LoginRequest.java`：

```java
package com.xiaojiu.deadline.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "不能为空") String username,
        @NotBlank(message = "不能为空") String password
) {
}
```

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/dto/AuthResponse.java`：

```java
package com.xiaojiu.deadline.dto;

public record AuthResponse(String token, String username) {
}
```

- [ ] **Step 2: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/service/AuthServiceTest.java`：

```java
package com.xiaojiu.deadline.service;

import com.xiaojiu.deadline.TestSupport;
import com.xiaojiu.deadline.dto.AuthResponse;
import com.xiaojiu.deadline.exception.BizException;
import com.xiaojiu.deadline.repository.UserRepository;
import com.xiaojiu.deadline.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@TestSupport
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    @Test
    void 注册成功后返回可用令牌且密码以哈希存储() {
        AuthResponse res = authService.register("alice", "secret123");

        assertThat(res.username()).isEqualTo("alice");
        assertThat(jwtUtil.isValid(res.token())).isTrue();
        assertThat(jwtUtil.parseUsername(res.token())).isEqualTo("alice");

        String stored = userRepository.findByUsername("alice").orElseThrow().getPasswordHash();
        assertThat(stored).isNotEqualTo("secret123");
        assertThat(stored).startsWith("$2");
    }

    @Test
    void 用户名重复返回409() {
        authService.register("alice", "secret123");

        assertThatThrownBy(() -> authService.register("alice", "another123"))
                .isInstanceOf(BizException.class)
                .satisfies(e -> assertThat(((BizException) e).getStatus())
                        .isEqualTo(HttpStatus.CONFLICT));
    }

    @Test
    void 登录成功返回令牌() {
        authService.register("alice", "secret123");

        AuthResponse res = authService.login("alice", "secret123");

        assertThat(jwtUtil.parseUsername(res.token())).isEqualTo("alice");
    }

    @Test
    void 密码错误返回401() {
        authService.register("alice", "secret123");

        assertThatThrownBy(() -> authService.login("alice", "wrongpass"))
                .isInstanceOf(BizException.class)
                .satisfies(e -> assertThat(((BizException) e).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void 用户名不存在也返回401且提示与密码错误相同() {
        assertThatThrownBy(() -> authService.login("nobody", "secret123"))
                .isInstanceOf(BizException.class)
                .satisfies(e -> {
                    assertThat(((BizException) e).getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    assertThat(e.getMessage()).isEqualTo("用户名或密码错误");
                });
    }
}
```

最后一条测试很关键：**用户名不存在和密码错误必须返回完全相同的响应**。
如果两者提示不同，攻击者就能靠遍历用户名找出系统里注册了哪些账号
（用户名枚举漏洞）。

- [ ] **Step 3: 运行测试确认失败**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=AuthServiceTest
```

Expected: 编译失败，提示找不到 `AuthService`。

- [ ] **Step 4: 实现 AuthService**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/service/AuthService.java`：

```java
package com.xiaojiu.deadline.service;

import com.xiaojiu.deadline.dto.AuthResponse;
import com.xiaojiu.deadline.entity.User;
import com.xiaojiu.deadline.exception.BizException;
import com.xiaojiu.deadline.repository.UserRepository;
import com.xiaojiu.deadline.security.JwtUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private static final String LOGIN_FAILED = "用户名或密码错误";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Transactional
    public AuthResponse register(String username, String rawPassword) {
        if (userRepository.existsByUsername(username)) {
            throw BizException.conflict("用户名已存在");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setStorageUsed(0L);

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // 两个请求同时注册同一用户名时，唯一索引会拦住后到的那个
            throw BizException.conflict("用户名已存在");
        }

        return new AuthResponse(jwtUtil.generate(user.getId(), user.getUsername()), username);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String username, String rawPassword) {
        User user = userRepository.findByUsername(username).orElse(null);

        // 无论用户不存在还是密码错误，都返回同一句话，避免用户名枚举
        if (user == null || !passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            throw BizException.unauthorized(LOGIN_FAILED);
        }

        return new AuthResponse(jwtUtil.generate(user.getId(), user.getUsername()), username);
    }
}
```

`saveAndFlush` 而非 `save`：需要立刻拿到自增主键 `id` 来签 JWT，
并让唯一索引冲突在此刻就抛出而不是拖到事务提交时。

- [ ] **Step 5: 运行测试确认通过**

```bash
./mvnw test -Dtest=AuthServiceTest
```

Expected: `Tests run: 5, Failures: 0, Errors: 0` 和 `BUILD SUCCESS`。

- [ ] **Step 6: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/dto src/main/java/com/xiaojiu/deadline/service/AuthService.java src/test/java/com/xiaojiu/deadline/service/
git commit -m "添加注册与登录业务逻辑 — 用户名重复返回409，登录失败不区分用户是否存在"
```

---

## Task 7: 注册接口

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/controller/AuthController.java`
- Create: `deadline-server/src/test/java/com/xiaojiu/deadline/controller/AuthControllerTest.java`
- Create: `deadline-server/src/test/java/com/xiaojiu/deadline/ApiTestSupport.java`

- [ ] **Step 1: 写 MockMvc 测试基类**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/ApiTestSupport.java`：

```java
package com.xiaojiu.deadline;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public @interface ApiTestSupport {
}
```

- [ ] **Step 2: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/controller/AuthControllerTest.java`：

```java
package com.xiaojiu.deadline.controller;

import com.xiaojiu.deadline.ApiTestSupport;
import com.xiaojiu.deadline.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ApiTestSupport
class AuthControllerTest {

    private static final String VALID_BODY =
            "{\"username\":\"alice\",\"password\":\"secret123\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    @Test
    void 注册成功返回201和令牌() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void 用户名重复返回409() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(VALID_BODY));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void 密码过短返回400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void 用户名含非法字符返回400() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"al ice!\",\"password\":\"secret123\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void 缺少字段返回400而不是500() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\"}"))
                .andExpect(status().isBadRequest());
    }
}
```

**两处刻意的设计，解释一下：**

1. **请求体直接写 JSON 字符串，不用 ObjectMapper 序列化。** Boot 4 的 Jackson 3
   改了包名，手动序列化会引入版本问题；而且直接写字符串能让你一眼看到
   「究竟发出去了什么字节」，调试接口时这点很有用。

2. **不在这里断言中文错误文案，只断言状态码和「message 非空」。**
   MockMvc 读响应体时用的字符集不一定是 UTF-8，断言中文有概率假失败。
   错误文案的精确断言放在 `AuthServiceTest`（那里直接断言异常消息，不受编码影响），
   两层测试各管各的：Service 层管「说了什么」，Controller 层管「HTTP 层面对不对」。

- [ ] **Step 3: 运行测试确认失败**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=AuthControllerTest
```

Expected: 编译失败，提示找不到 `AuthController`。

- [ ] **Step 4: 实现 AuthController**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/controller/AuthController.java`：

```java
package com.xiaojiu.deadline.controller;

import com.xiaojiu.deadline.dto.AuthResponse;
import com.xiaojiu.deadline.dto.LoginRequest;
import com.xiaojiu.deadline.dto.RegisterRequest;
import com.xiaojiu.deadline.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request.username(), request.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.username(), request.password());
    }
}
```

先把注册接口建出来。登录接口的测试在 Task 8。

- [ ] **Step 5: 运行测试**

```bash
./mvnw test -Dtest=AuthControllerTest
```

Expected: 注册相关的 5 个测试全部 PASS。登录接口还不存在，但本测试类没测它，
所以不影响。

- [ ] **Step 6: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/controller/AuthController.java src/test/java/com/xiaojiu/deadline/ApiTestSupport.java src/test/java/com/xiaojiu/deadline/controller/
git commit -m "添加注册接口 — 参数校验与用户名重复处理"
```

---

## Task 8: 登录接口

**Files:**
- Modify: `deadline-server/src/main/java/com/xiaojiu/deadline/controller/AuthController.java`（已含 login 方法，本任务只需补测试）
- Test: `deadline-server/src/test/java/com/xiaojiu/deadline/controller/LoginControllerTest.java`

- [ ] **Step 1: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/controller/LoginControllerTest.java`：

```java
package com.xiaojiu.deadline.controller;

import com.xiaojiu.deadline.ApiTestSupport;
import com.xiaojiu.deadline.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ApiTestSupport
class LoginControllerTest {

    private static final String REGISTER_BODY =
            "{\"username\":\"alice\",\"password\":\"secret123\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY));
    }

    @Test
    void 登录成功返回200和令牌() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void 密码错误返回401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void 用户不存在与密码错误返回完全相同的响应() throws Exception {
        String notExist = loginResponseBody("nobody", "secret123");
        String wrongPwd = loginResponseBody("alice", "wrongpass");

        assertThat(notExist).isEqualTo(wrongPwd);
        assertThat(notExist).contains("message");
    }

    private String loginResponseBody(String username, String password) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username
                                + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
    }
}
```

最后一个测试是防用户名枚举漏洞的：用户不存在和密码错误必须返回**逐字节相同**的
响应。这里用 `getContentAsString(StandardCharsets.UTF_8)` 显式指定字符集，
既避开编码问题，又保证两次读取方式一致、比较才有意义。

- [ ] **Step 2: 运行测试**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=LoginControllerTest
```

Expected: `Tests run: 3, Failures: 0, Errors: 0` 和 `BUILD SUCCESS`。
`AuthController` 里已有 `login` 方法，所以这一步应当直接通过。

- [ ] **Step 3: 提交**

```bash
git add src/test/java/com/xiaojiu/deadline/controller/LoginControllerTest.java
git commit -m "添加登录接口测试 — 断言用户不存在与密码错误响应一致"
```

---

## Task 9: JWT 拦截器与当前用户注入

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/security/CurrentUserId.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/security/CurrentUserIdResolver.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/security/AuthInterceptor.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/config/WebMvcConfig.java`
- Test: `deadline-server/src/test/java/com/xiaojiu/deadline/security/AuthInterceptorTest.java`

- [ ] **Step 1: 写注解与解析器**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/security/CurrentUserId.java`：

```java
package com.xiaojiu.deadline.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {
}
```

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/security/CurrentUserIdResolver.java`：

```java
package com.xiaojiu.deadline.security;

import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserIdResolver implements HandlerMethodArgumentResolver {

    public static final String ATTRIBUTE = "userId";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class)
                && Long.class.equals(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        return webRequest.getAttribute(ATTRIBUTE, NativeWebRequest.SCOPE_REQUEST);
    }
}
```

- [ ] **Step 2: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/security/AuthInterceptorTest.java`：

先建一个仅用于测试的控制器。创建
`deadline-server/src/test/java/com/xiaojiu/deadline/security/ProbeController.java`：

```java
package com.xiaojiu.deadline.security;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/probe")
public class ProbeController {

    @GetMapping
    public Map<String, Object> probe(@CurrentUserId Long userId) {
        return Map.of("userId", userId);
    }
}
```

再建测试 `deadline-server/src/test/java/com/xiaojiu/deadline/security/AuthInterceptorTest.java`：

```java
package com.xiaojiu.deadline.security;

import com.xiaojiu.deadline.ApiTestSupport;
import com.xiaojiu.deadline.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ApiTestSupport
class AuthInterceptorTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void clean() {
        userRepository.deleteAll();
    }

    @Test
    void 无令牌访问受保护接口返回401() throws Exception {
        mockMvc.perform(get("/api/probe"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 令牌格式不对返回401() throws Exception {
        mockMvc.perform(get("/api/probe").header("Authorization", "garbage"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 用别的密钥签的令牌返回401() throws Exception {
        mockMvc.perform(get("/api/probe").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 有效令牌能把userId注入到方法参数() throws Exception {
        String token = jwtUtil.generate(99L, "alice");

        mockMvc.perform(get("/api/probe").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(99));
    }

    @Test
    void OPTIONS预检请求不被拦截() throws Exception {
        mockMvc.perform(options("/api/probe")
                        .header("Origin", "https://xiaojiu-aaa.github.io")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization"))
                .andExpect(status().isOk());
    }
}
```

最后一条测试对应 spec 5.5 的第 2 个坑：跨站请求会先发 OPTIONS 预检，
预检不带 `Authorization` 头。如果拦截器拦下它并返回 401，
浏览器报的却是「CORS 错误」，排查方向会被彻底带偏。

- [ ] **Step 3: 运行测试确认失败**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=AuthInterceptorTest
```

Expected: 失败。`无令牌访问受保护接口返回401` 会因为没人拦截而返回 200。

- [ ] **Step 4: 实现 AuthInterceptor**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/security/AuthInterceptor.java`：

```java
package com.xiaojiu.deadline.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String UNAUTHORIZED_BODY = "{\"message\":\"未登录或登录已过期\"}";

    private final JwtUtil jwtUtil;

    public AuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // 预检请求不带 Authorization 头，必须直接放行，
        // 否则浏览器会把 401 报成 CORS 错误
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return reject(response);
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        if (!jwtUtil.isValid(token)) {
            return reject(response);
        }

        request.setAttribute(CurrentUserIdResolver.ATTRIBUTE, jwtUtil.parseUserId(token));
        return true;
    }

    private boolean reject(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(UNAUTHORIZED_BODY);
        return false;
    }
}
```

**注意这里没有用 Jackson。** Spring Boot 4 把 Jackson 2 换成了 Jackson 3，
包名从 `com.fasterxml.jackson` 改成 `tools.jackson`，`ObjectMapper` 被不可变的
`JsonMapper` 取代。拦截器只需要输出一句固定的错误信息，直接写字符串字面量
比引入一套 JSON 序列化更简单，也就绕开了整个版本迁移问题。
（`dto.ApiError` 仍然保留，它由 `GlobalExceptionHandler` 使用，
Spring 会自动用当前配置的 JSON 库把它序列化，我们不需要手动处理。）

- [ ] **Step 5: 写 WebMvcConfig 注册拦截器**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/config/WebMvcConfig.java`：

```java
package com.xiaojiu.deadline.config;

import com.xiaojiu.deadline.security.AuthInterceptor;
import com.xiaojiu.deadline.security.CurrentUserIdResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final CurrentUserIdResolver currentUserIdResolver;

    public WebMvcConfig(AuthInterceptor authInterceptor,
                        CurrentUserIdResolver currentUserIdResolver) {
        this.authInterceptor = authInterceptor;
        this.currentUserIdResolver = currentUserIdResolver;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdResolver);
    }
}
```

- [ ] **Step 6: 运行测试确认通过**

```bash
./mvnw test -Dtest=AuthInterceptorTest
```

Expected: `Tests run: 5, Failures: 0, Errors: 0` 和 `BUILD SUCCESS`。

- [ ] **Step 7: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/security src/main/java/com/xiaojiu/deadline/config/WebMvcConfig.java src/test/java/com/xiaojiu/deadline/security/
git commit -m "添加 JWT 拦截器与 @CurrentUserId 参数解析器 — OPTIONS 预检直接放行"
```

---

## Task 10: 当前用户接口与 CORS

**Files:**
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/controller/MeController.java`
- Create: `deadline-server/src/main/java/com/xiaojiu/deadline/config/CorsProperties.java`
- Modify: `deadline-server/src/main/java/com/xiaojiu/deadline/config/WebMvcConfig.java`
- Test: `deadline-server/src/test/java/com/xiaojiu/deadline/controller/MeControllerTest.java`

- [ ] **Step 1: 写 CORS 配置属性**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/config/CorsProperties.java`：

```java
package com.xiaojiu.deadline.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    private String allowedOrigin;

    public String getAllowedOrigin() { return allowedOrigin; }
    public void setAllowedOrigin(String allowedOrigin) { this.allowedOrigin = allowedOrigin; }
}
```

- [ ] **Step 2: 在 WebMvcConfig 中加入 CORS**

修改 `deadline-server/src/main/java/com/xiaojiu/deadline/config/WebMvcConfig.java`，
把整个文件替换为：

```java
package com.xiaojiu.deadline.config;

import com.xiaojiu.deadline.security.AuthInterceptor;
import com.xiaojiu.deadline.security.CurrentUserIdResolver;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.List;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;
    private final CurrentUserIdResolver currentUserIdResolver;
    private final CorsProperties corsProperties;

    public WebMvcConfig(AuthInterceptor authInterceptor,
                        CurrentUserIdResolver currentUserIdResolver,
                        CorsProperties corsProperties) {
        this.authInterceptor = authInterceptor;
        this.currentUserIdResolver = currentUserIdResolver;
        this.corsProperties = corsProperties;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/auth/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdResolver);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(corsProperties.getAllowedOrigin())
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization")
                .allowCredentials(false)
                .maxAge(3600);
    }
}
```

`Authorization` 必须出现在 `allowedHeaders` 里。它是自定义头，
不放行的话预检响应不会包含它，浏览器会拦下真正的请求。

`allowCredentials(false)`：JWT 走请求头不用 Cookie，关掉携带凭证可以
避开一整套跨站 Cookie 相关的限制。

- [ ] **Step 3: 写失败测试**

创建 `deadline-server/src/test/java/com/xiaojiu/deadline/controller/MeControllerTest.java`：

```java
package com.xiaojiu.deadline.controller;

import com.xiaojiu.deadline.ApiTestSupport;
import com.xiaojiu.deadline.repository.UserRepository;
import com.xiaojiu.deadline.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ApiTestSupport
class MeControllerTest {

    private static final String REGISTER_BODY =
            "{\"username\":\"alice\",\"password\":\"secret123\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll();

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY));

        // 必须先真正建出用户，再拿数据库里的真实 id 签令牌。
        // 用伪造的 id 签令牌会得到 401，因为 /api/me 会去查库确认用户存在。
        Long userId = userRepository.findByUsername("alice").orElseThrow().getId();
        token = jwtUtil.generate(userId, "alice");
    }

    @Test
    void 带有效令牌能拿到当前用户名() throws Exception {
        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alice"));
    }

    @Test
    void 不带令牌返回401() throws Exception {
        mockMvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 令牌有效但用户已被删除返回401() throws Exception {
        userRepository.deleteAll();

        mockMvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 指定来源的请求返回CORS响应头() throws Exception {
        mockMvc.perform(get("/api/me")
                        .header("Origin", "https://xiaojiu-aaa.github.io")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin",
                        "https://xiaojiu-aaa.github.io"));
    }
}
```

- [ ] **Step 4: 运行测试确认失败**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
./mvnw test -Dtest=MeControllerTest
```

Expected: 编译失败，提示找不到 `MeController`。

- [ ] **Step 5: 实现 MeController**

创建 `deadline-server/src/main/java/com/xiaojiu/deadline/controller/MeController.java`：

```java
package com.xiaojiu.deadline.controller;

import com.xiaojiu.deadline.entity.User;
import com.xiaojiu.deadline.exception.BizException;
import com.xiaojiu.deadline.repository.UserRepository;
import com.xiaojiu.deadline.security.CurrentUserId;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {

    private final UserRepository userRepository;

    public MeController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> me(@CurrentUserId Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> BizException.unauthorized("用户不存在"));
        return Map.of("username", user.getUsername());
    }
}
```

前端在页面加载时调用这个接口，用返回的 200/401 判断本地令牌是否还有效。

- [ ] **Step 6: 运行全部测试**

```bash
./mvnw test
```

Expected: 所有测试通过，`BUILD SUCCESS`。

- [ ] **Step 7: 提交**

```bash
git add src/main/java/com/xiaojiu/deadline/config src/main/java/com/xiaojiu/deadline/controller/MeController.java src/test/java/com/xiaojiu/deadline/controller/MeControllerTest.java
git commit -m "添加 /api/me 接口与 CORS 配置 — 放行 Authorization 头"
```

---

## Task 11: 端到端验证

前面的测试都跑在 H2 上。本任务在真实 MySQL 上验证整条链路，
并确认 `schema.sql` 与实体确实匹配。

**Files:** 无

- [ ] **Step 1: 启动真实环境的应用**

IDEA 中运行 `DeadlineServerApplication`（环境变量已配好）。

Expected: `Started DeadlineApplication in x.xxx seconds`，无 `Schema-validation` 错误。

如果报 `Schema-validation: missing table`，说明 VM 上的建表语句没执行，
回到 Task 2 Step 2。

- [ ] **Step 2: 验证注册**

Windows 的 Git Bash 执行：

```bash
curl -s -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"e2euser","password":"secret123"}'
```

Expected: 第一行是 `HTTP/1.1 201`，body 形如
`{"token":"eyJhbGciOiJIUzI1NiJ9...","username":"e2euser"}`。

- [ ] **Step 3: 验证重复注册返回 409**

再执行一次上一条命令。

Expected: `HTTP/1.1 409`，body 为 `{"message":"用户名已存在"}`。

- [ ] **Step 4: 验证参数校验**

```bash
curl -s -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"x","password":"123"}'
```

Expected: `HTTP/1.1 400`，body 中的 message 指出具体哪个字段不合格。

- [ ] **Step 5: 验证登录并保存令牌**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"e2euser","password":"secret123"}' | sed -E 's/.*"token":"([^"]+)".*/\1/')
echo "$TOKEN" | head -c 40
```

Expected: 打印出令牌的前 40 个字符，形如 `eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIi...`。

- [ ] **Step 6: 验证错误密码返回 401**

```bash
curl -s -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"e2euser","password":"wrongpass"}'
```

Expected: `HTTP/1.1 401`，body 为 `{"message":"用户名或密码错误"}`。

- [ ] **Step 7: 验证带令牌访问受保护接口**

```bash
curl -s -i http://localhost:8080/api/me -H "Authorization: Bearer $TOKEN"
```

Expected: `HTTP/1.1 200`，body 为 `{"username":"e2euser"}`。

- [ ] **Step 8: 验证不带令牌被拒**

```bash
curl -s -i http://localhost:8080/api/me
```

Expected: `HTTP/1.1 401`，body 为 `{"message":"未登录或登录已过期"}`。

- [ ] **Step 9: 验证 CORS 预检通过**

```bash
curl -s -i -X OPTIONS http://localhost:8080/api/me \
  -H "Origin: https://xiaojiu-aaa.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization"
```

Expected: `HTTP/1.1 200`，且响应头包含：

```
Access-Control-Allow-Origin: https://xiaojiu-aaa.github.io
Access-Control-Allow-Headers: Content-Type, Authorization
```

- [ ] **Step 10: 确认密码在数据库里是哈希**

VM 上执行：

```bash
mysql -udeadline_app -p deadline -e "SELECT id, username, password_hash, storage_used, created_at FROM users;"
```

Expected: `password_hash` 是一串以 `$2a$` 开头的 60 字符哈希，
**不是** `secret123`。`storage_used` 为 0。

- [ ] **Step 11: 清理测试数据**

VM 上执行：

```bash
mysql -udeadline_app -p deadline -e "DELETE FROM users WHERE username = 'e2euser';"
```

- [ ] **Step 12: 提交**

```bash
cd "C:/Users/Lenovo/Desktop/deadline-server"
git add -A
git commit -m "完成第一部分 — 环境与认证链路端到端验证通过"
```

---

## 第一部分完成标准

全部满足才算完成：

- [ ] VM 上 `java -version` 输出 17.x，`JAVA_HOME=/opt/jdk17`
- [ ] VM 上 MySQL 有 `deadline` 库和 `deadline_app` 账号
- [ ] Windows 的 IDEA 能连上 VM 的 MySQL
- [ ] `./mvnw test` 全部通过
- [ ] 真实 MySQL 上 `ddl-auto=validate` 通过
- [ ] Task 11 的 10 条 curl 验证全部符合预期
- [ ] 数据库里的密码是 BCrypt 哈希，不是明文

---

## 第二部分预告

阶段 2–4 将在下一份计划中覆盖：
`tasks` 表与 CRUD、`task_date` 索引、`@CurrentUserId` 的实际使用、
越权返回 404 的 Repository 写法、`marked_days` 与 `diaries`、
附件上传下载与磁盘清理、`CF-Connecting-IP` 真实 IP 提取、滑动窗口限流、用户配额。

届时需要新增 `ClientIp`、`RateLimiter`、`FileService` 等组件，
并注意 `tasks.is_all_day` 这类布尔列在 Hibernate 6 + MySQL 下的类型映射
（`boolean` 会被映射为 `bit`，与 `tinyint(1)` 不匹配导致 `validate` 失败，
届时用 `@Column(columnDefinition = "tinyint(1)")` 显式声明）。
