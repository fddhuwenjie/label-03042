# 学校课后服务排班管理系统

## How to Run

### Docker 启动（推荐）

```bash
# 克隆项目后，在根目录执行
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

启动后访问：
- 前端：http://localhost:8081
- 后端 API：http://localhost:8042

### 本地启动

#### 1. 启动数据库
```bash
# 使用 Docker 启动 PostgreSQL
docker run -d --name postgres-scheduling \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=scheduling \
  -p 5432:5432 \
  postgres:15-alpine
```

#### 2. 启动后端
```bash
cd backend
npm install
npm run start:dev
```

#### 3. 启动前端
```bash
cd frontend
npm install
npm start
```

## Services

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 8081 | React 前端应用 |
| Backend | 8042 | NestJS 后端 API |
| PostgreSQL | 5432 | 数据库服务 |

## 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |

## 题目内容

开发一个学校课后服务排班管理软件，实现以下核心功能和技术要求： 

1. 基础配置模块 
- 支持自定义设置学校班级总数及班级信息 
- 实现教师信息管理，支持自定义教师任教学科配置 
- 提供学科校验日设置功能，配置后系统应自动过滤相应学科教师在指定日期的课后服务安排 

2. 课后服务阶段管理 
- 将课后服务划分为3个独立阶段 
- 支持为每个阶段自定义配置班级数量 
- 实现阶段间数据关联与约束管理 

3. 智能排班引擎 
- 实现三级优先级排班算法： 
* 第一优先级：班主任优先安排1次到自己班级 
* 第二优先级：语文、数学、英语学科教师安排1次到自己任教班级 
* 第三优先级：其他学科教师安排1次到空余班级 
- 特殊规则实现： 
* 第三阶段仅限指定教师参与 
* 被安排第三阶段的教师必须从第一阶段连续安排至第三阶段，确保排班连续性 

4. 统计分析功能 
- 实现每周教师课后服务总次数统计 
- 单独统计第二阶段教师参与次数 
- 开发教师第二阶段安排均衡性分析功能，自动统计历史排班数据并提供均衡性建议 
- 生成可视化统计报表，支持数据导出 

5. 数据管理与界面要求 
- 采用按周排班模式，支持周视图展示与管理 
- 提供排班结果预览、编辑与确认功能 
- 实现排班历史记录存储与查询 
- 界面设计应简洁直观，操作流程符合学校行政人员使用习惯 

系统应确保数据准确性、排班规则执行严格性，并提供友好的用户体验和完善的异常处理机制。

---

## 项目介绍

### 技术栈

- **前端**: React + TypeScript + Ant Design
- **后端**: Node.js + NestJS + TypeScript
- **数据库**: PostgreSQL


### 项目结构

```
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                 # API 接口封装
│   │   ├── pages/               # 页面组件
│   │   └── App.tsx              # 主应用组件
│   └── package.json
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── controllers/         # 控制器层
│   │   ├── services/            # 服务层
│   │   ├── entities/            # 数据实体
│   │   ├── dto/                 # 数据传输对象
│   │   ├── filters/             # 异常过滤器
│   │   ├── guards/              # 认证守卫
│   │   └── strategies/          # JWT 策略
│   └── package.json
├── docs/                        # 项目文档
│   └── API.md                   # API 接口文档
├── docker-compose.yml           # Docker 编排文件
└── README.md                    # 项目说明
```

### 数据初始化

首次启动后，可以运行种子脚本初始化示例数据：

```bash
cd backend
npm run seed
```

初始化数据包括：
- 管理员账号（admin/admin123）
- 课后服务阶段配置（3个阶段）
- 学科数据（语文、数学、英语等7个学科）
- 班级数据（一至三年级各2个班，共6个班）
- 教师数据（10名教师，含班主任和任教关系）
- 学科排除日期示例（体育周三不排班）

> 注意：种子脚本会检查数据是否已存在，重复运行不会创建重复数据。

### API 文档

详细的 API 接口文档请参阅 [docs/API.md](docs/API.md)，包含：
- 认证接口（登录、获取用户信息）
- 班级管理接口（增删改查、批量创建、设置班主任）
- 教师管理接口（增删改查、第三阶段教师配置）
- 学科管理接口（增删改查、排除日期配置）
- 阶段配置接口（查询、更新班级数量）
- 排班管理接口（创建周、生成排班、调整、确认）
- 统计分析接口（周度统计、均衡性分析、数据导出）

### 排班算法说明

系统实现了三级优先级排班算法：

1. **第一优先级**：班主任每天优先安排1次到自己班级
2. **第二优先级**：主科教师（语数英）每天优先安排1次到任教班级
3. **第三优先级**：其他教师安排到空余班级
4. **第三阶段特殊规则**：仅限指定教师参与，且必须当天从第一阶段连续安排至第三阶段

### 单元测试

```bash
cd backend

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:cov

# 监听模式运行测试
npm run test:watch
```

测试覆盖：
- `scheduling-engine.service.spec.ts` - 排班引擎核心算法测试
- `auth.service.spec.ts` - 认证服务测试
- `statistics.service.spec.ts` - 统计服务测试
- `class.dto.spec.ts` - DTO 验证测试
