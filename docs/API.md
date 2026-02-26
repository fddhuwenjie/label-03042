# API 接口文档

## 概述

本文档描述了课后服务排班管理系统的 RESTful API 接口。

- **基础 URL**: `http://localhost:8042/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON

## 认证说明

除登录接口外，所有接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <token>
```

## 统一响应格式

所有接口响应均采用统一格式：

**成功响应**
```json
{
  "code": 0,
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**
```json
{
  "code": 1001,
  "data": null,
  "message": "错误描述"
}
```

**错误码说明**
| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1000 | 未知错误 |
| 1001 | 参数验证错误 |
| 2001 | 未授权（未登录） |
| 2002 | Token 已过期 |
| 2003 | 权限不足 |
| 3001 | 资源不存在 |
| 3002 | 资源已存在 |
| 3003 | 数据冲突 |
| 4001 | 数据库错误 |
| 4002 | 数据重复 |
| 5001 | 业务错误 |

---

## 1. 认证模块 (Auth)

### 1.1 用户登录

登录系统获取访问令牌。

**请求**
```
POST /auth/login
```

**请求体**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应**
```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    }
  },
  "message": "操作成功"
}
```

**错误响应示例**
```json
{
  "code": 2001,
  "data": null,
  "message": "用户名或密码错误"
}
```

---

### 1.2 获取当前用户信息

获取当前登录用户的详细信息。

**请求**
```
GET /auth/profile
```

**响应**
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  },
  "message": "操作成功"
}
```

---

## 2. 班级管理模块 (Classes)

### 2.1 获取班级列表

获取所有班级信息，支持分页。

**请求**
```
GET /classes?page=1&pageSize=10
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认返回全部 |
| pageSize | number | 否 | 每页数量，默认 10 |

**响应**
```json
[
  {
    "id": 1,
    "name": "一年级1班",
    "grade": "一年级",
    "classNumber": 1,
    "headTeacherId": 1,
    "headTeacher": {
      "id": 1,
      "name": "张老师"
    }
  }
]
```

---

### 2.2 获取单个班级

**请求**
```
GET /classes/:id
```

**路径参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 班级 ID |

**响应**
```json
{
  "id": 1,
  "name": "一年级1班",
  "grade": "一年级",
  "classNumber": 1,
  "headTeacherId": 1,
  "headTeacher": {
    "id": 1,
    "name": "张老师",
    "subject": {
      "id": 1,
      "name": "语文"
    }
  }
}
```

---

### 2.3 创建班级

**请求**
```
POST /classes
```

**请求体**
```json
{
  "name": "一年级1班",
  "grade": "一年级",
  "classNumber": 1
}
```

**字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 班级名称 |
| grade | string | 是 | 年级 |
| classNumber | number | 是 | 班级序号 |

---

### 2.4 批量创建班级

根据年级和每年级班级数批量创建班级。

**请求**
```
POST /classes/batch
```

**请求体**
```json
{
  "grades": ["一年级", "二年级", "三年级"],
  "classCountPerGrade": 6
}
```

**字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| grades | string[] | 是 | 年级列表 |
| classCountPerGrade | number | 是 | 每年级班级数 |

**注意**: 此操作会清除现有班级数据。

---

### 2.5 更新班级

**请求**
```
PUT /classes/:id
```

**请求体**
```json
{
  "name": "一年级1班",
  "grade": "一年级",
  "classNumber": 1
}
```

---

### 2.6 删除班级

**请求**
```
DELETE /classes/:id
```

---

### 2.7 设置班主任

为班级指定班主任。

**请求**
```
PUT /classes/:id/head-teacher
```

**请求体**
```json
{
  "teacherId": 1
}
```

---

## 3. 教师管理模块 (Teachers)

### 3.1 获取教师列表

**请求**
```
GET /teachers?page=1&pageSize=10
```

**响应**
```json
[
  {
    "id": 1,
    "name": "张老师",
    "canStage3": true,
    "subject": {
      "id": 1,
      "name": "语文",
      "isMain": true
    },
    "teachingClasses": [
      {
        "id": 1,
        "name": "一年级1班"
      }
    ]
  }
]
```

---

### 3.2 获取单个教师

**请求**
```
GET /teachers/:id
```

---

### 3.3 获取第三阶段教师列表

获取可参与第三阶段课后服务的教师。

**请求**
```
GET /teachers/stage3/list
```

---

### 3.4 创建教师

**请求**
```
POST /teachers
```

**请求体**
```json
{
  "name": "张老师",
  "subjectId": 1,
  "teachingClassIds": [1, 2, 3],
  "canStage3": false
}
```

**字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 教师姓名 |
| subjectId | number | 否 | 任教学科 ID |
| teachingClassIds | number[] | 否 | 任教班级 ID 列表 |
| canStage3 | boolean | 否 | 是否可参与第三阶段，默认 false |

---

### 3.5 更新教师

**请求**
```
PUT /teachers/:id
```

---

### 3.6 删除教师

**请求**
```
DELETE /teachers/:id
```

---

### 3.7 批量设置第三阶段教师

**请求**
```
POST /teachers/stage3/batch
```

**请求体**
```json
{
  "teacherIds": [1, 2, 3, 4, 5]
}
```

---

## 4. 学科管理模块 (Subjects)

### 4.1 获取学科列表

**请求**
```
GET /subjects
```

**响应**
```json
[
  {
    "id": 1,
    "name": "语文",
    "isMain": true
  },
  {
    "id": 2,
    "name": "数学",
    "isMain": true
  },
  {
    "id": 3,
    "name": "体育",
    "isMain": false
  }
]
```

---

### 4.2 创建学科

**请求**
```
POST /subjects
```

**请求体**
```json
{
  "name": "语文",
  "isMain": true
}
```

**字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 学科名称 |
| isMain | boolean | 否 | 是否主科（语数英），默认 false |

---

### 4.3 获取学科校验日配置

获取所有学科的校验日配置，配置后该学科教师在指定日期不参与排班。

**请求**
```
GET /subjects/exclude-dates/list
```

**响应**
```json
[
  {
    "id": 1,
    "subjectId": 3,
    "dayOfWeek": 3,
    "remark": "周三体育教研活动",
    "subject": {
      "id": 3,
      "name": "体育"
    }
  }
]
```

---

### 4.4 设置学科校验日

**请求**
```
POST /subjects/exclude-dates
```

**请求体**
```json
{
  "subjectId": 3,
  "dayOfWeek": 3,
  "remark": "周三体育教研活动"
}
```

**字段说明**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| subjectId | number | 是 | 学科 ID |
| dayOfWeek | number | 是 | 星期几（1-5，周一到周五） |
| remark | string | 否 | 备注说明 |

---

### 4.5 删除学科校验日

**请求**
```
DELETE /subjects/exclude-dates/:id
```

---

## 5. 阶段配置模块 (Stages)

### 5.1 获取阶段列表

**请求**
```
GET /stages
```

**响应**
```json
[
  {
    "id": 1,
    "stageNumber": 1,
    "name": "第一阶段",
    "description": "作业辅导",
    "classCount": 36
  },
  {
    "id": 2,
    "stageNumber": 2,
    "name": "第二阶段",
    "description": "兴趣活动",
    "classCount": 36
  },
  {
    "id": 3,
    "stageNumber": 3,
    "name": "第三阶段",
    "description": "延时托管",
    "classCount": 18
  }
]
```

---

### 5.2 批量更新阶段班级数量

**请求**
```
PUT /stages/class-counts/batch
```

**请求体**
```json
{
  "data": [
    { "stageNumber": 1, "classCount": 36 },
    { "stageNumber": 2, "classCount": 36 },
    { "stageNumber": 3, "classCount": 18 }
  ]
}
```

---

## 6. 排班管理模块 (Schedules)

### 6.1 获取所有排班周

**请求**
```
GET /schedules/weeks
```

**响应**
```json
[
  {
    "id": 1,
    "year": 2024,
    "weekNumber": 1,
    "startDate": "2024-01-01",
    "endDate": "2024-01-05",
    "status": "confirmed"
  }
]
```

**状态说明**
| 状态 | 说明 |
|------|------|
| draft | 草稿，可编辑 |
| confirmed | 已确认，不可编辑 |

---

### 6.2 获取当前周信息

**请求**
```
GET /schedules/current-week
```

---

### 6.3 获取指定周的排班详情

**请求**
```
GET /schedules/weeks/:weekId
```

**响应**
```json
{
  "week": {
    "id": 1,
    "year": 2024,
    "weekNumber": 1,
    "startDate": "2024-01-01",
    "endDate": "2024-01-05",
    "status": "draft"
  },
  "schedules": [
    {
      "id": 1,
      "dayOfWeek": 1,
      "stageId": 1,
      "teacherId": 1,
      "classId": 1,
      "scheduleType": "headTeacher",
      "teacher": {
        "id": 1,
        "name": "张老师"
      },
      "class": {
        "id": 1,
        "name": "一年级1班"
      }
    }
  ],
  "warnings": []
}
```

**排班类型说明**
| 类型 | 说明 |
|------|------|
| headTeacher | 班主任排班 |
| mainSubject | 主科教师排班 |
| other | 其他教师排班 |
| stage3 | 第三阶段排班 |
| fill | 补充排班 |

---

### 6.4 创建排班周

**请求**
```
POST /schedules/weeks
```

**请求体**
```json
{
  "year": 2024,
  "weekNumber": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-01-05"
}
```

---

### 6.5 生成排班

根据排班算法自动生成指定周的排班。

**请求**
```
POST /schedules/weeks/:weekId/generate
```

**响应**
```json
{
  "success": true,
  "scheduleCount": 180,
  "warnings": [
    {
      "type": "teacherOverload",
      "message": "教师张老师本周排班次数较多"
    }
  ]
}
```

---

### 6.6 更新单个排班

**请求**
```
PUT /schedules/:id
```

**请求体**
```json
{
  "teacherId": 2,
  "classId": 3
}
```

---

### 6.7 确认排班

确认后排班不可再编辑。

**请求**
```
POST /schedules/weeks/:weekId/confirm
```

---

### 6.8 删除排班周

**请求**
```
DELETE /schedules/weeks/:weekId
```

---

## 7. 统计分析模块 (Statistics)

### 7.1 获取周统计数据

**请求**
```
GET /statistics/weekly/:weekId
```

**响应**
```json
{
  "summary": {
    "totalSchedules": 180,
    "teacherCount": 50,
    "avgSchedulesPerTeacher": 3.6
  },
  "statistics": [
    {
      "teacherId": 1,
      "teacherName": "张老师",
      "subjectName": "语文",
      "totalCount": 5,
      "stage2Count": 2
    }
  ]
}
```

---

### 7.2 获取第二阶段均衡性分析

**请求**
```
GET /statistics/stage2-balance?startWeekId=1&endWeekId=10
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startWeekId | number | 否 | 起始周 ID |
| endWeekId | number | 否 | 结束周 ID |

**响应**
```json
{
  "weekCount": 10,
  "balance": {
    "maxCount": 15,
    "minCount": 8,
    "avgCount": 12.5,
    "variance": 2.3
  },
  "statistics": [
    {
      "teacherId": 1,
      "teacherName": "张老师",
      "subjectName": "语文",
      "stage2Count": 15
    }
  ],
  "suggestions": [
    "教师张老师第二阶段排班次数偏高，建议适当减少",
    "教师李老师第二阶段排班次数偏低，建议适当增加"
  ]
}
```

---

### 7.3 获取历史排班记录

**请求**
```
GET /statistics/history?page=1&pageSize=10
```

---

### 7.4 导出统计数据

导出指定周的统计数据，支持 Excel 和 CSV 格式。

**请求**
```
GET /statistics/export/:weekId?format=xlsx
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| format | string | 否 | 导出格式：xlsx（默认）或 csv |

**响应**: 文件下载（Excel 或 CSV）

---

### 7.5 获取多维度统计分析

获取按学科、星期、阶段、排班类型等多维度的统计分析数据。

**请求**
```
GET /statistics/multi-dimension/:weekId
```

**响应**
```json
{
  "weekId": 1,
  "totalSchedules": 180,
  "bySubject": [
    {
      "subjectName": "语文",
      "scheduleCount": 45,
      "teacherCount": 10
    }
  ],
  "byDayOfWeek": [
    {
      "dayOfWeek": 1,
      "dayName": "周一",
      "scheduleCount": 36,
      "teacherCount": 36,
      "classCount": 36
    }
  ],
  "byStage": [
    {
      "stageId": 1,
      "stageName": "第一阶段",
      "stageNumber": 1,
      "scheduleCount": 180,
      "teacherCount": 36,
      "classCount": 36
    }
  ],
  "workloadDistribution": [
    {
      "scheduleCount": 3,
      "teacherCount": 15
    }
  ],
  "byScheduleType": [
    {
      "type": "headTeacher",
      "typeName": "班主任优先",
      "count": 50,
      "percentage": "27.8"
    }
  ]
}
```

---

### 7.6 获取教师工作量趋势

分析指定教师在多周内的工作量变化趋势。

**请求**
```
GET /statistics/workload-trend/:teacherId?weekCount=4
```

**查询参数**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| weekCount | number | 否 | 统计周数，默认 4 |

**响应**
```json
{
  "teacher": {
    "id": 1,
    "name": "张老师",
    "subjectName": "语文"
  },
  "summary": {
    "avgCount": "4.50",
    "maxCount": 6,
    "minCount": 3,
    "trend": "stable",
    "trendLabel": "稳定"
  },
  "data": [
    {
      "weekId": 1,
      "year": 2024,
      "weekNumber": 1,
      "weekLabel": "2024年第1周",
      "totalCount": 5,
      "stage2Count": 2,
      "byDay": [1, 1, 1, 1, 1]
    }
  ]
}
```

**趋势说明**
| 趋势 | 说明 |
|------|------|
| increasing | 上升趋势 |
| decreasing | 下降趋势 |
| stable | 稳定 |

---

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

**常见错误码**
| 状态码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或 Token 过期） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
