import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Select, Space, message, Tag, Popconfirm, DatePicker, Empty, Alert, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, CheckOutlined, DeleteOutlined, ScheduleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';

dayjs.extend(weekOfYear);
import { scheduleApi, teacherApi, classApi, stageApi } from '../api';

// 星期映射
const dayNames = ['', '周一', '周二', '周三', '周四', '周五'];

// 排班类型颜色和标签
const scheduleTypeConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
  headTeacher: { color: '#1890ff', bg: '#e6f7ff', border: '#91d5ff', label: '班主任' },
  mainSubject: { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', label: '主科' },
  other: { color: '#722ed1', bg: '#f9f0ff', border: '#d3adf7', label: '副科' },
  stage3: { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591', label: '三阶段' },
  fill: { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9', label: '补充' },
};

// 排班管理页面
const ScheduleManage: React.FC = () => {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs | null>(null);

  // 加载基础数据
  const loadBaseData = async () => {
    try {
      const [teacherData, classData, stageData]: any = await Promise.all([
        teacherApi.getAll(),
        classApi.getAll(),
        stageApi.getAll(),
      ]);
      setTeachers(teacherData);
      setClasses(classData);
      setStages(stageData);
    } catch (error) {
      console.error('加载基础数据失败', error);
    }
  };

  // 加载排班周列表
  const loadWeeks = async () => {
    setLoading(true);
    try {
      const data: any = await scheduleApi.getAllWeeks();
      setWeeks(data);
      if (data.length > 0 && !selectedWeekId) {
        setSelectedWeekId(data[0].id);
      }
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  // 加载指定周的排班
  const loadSchedules = async (weekId: number) => {
    setLoading(true);
    try {
      const data: any = await scheduleApi.getByWeek(weekId);
      setCurrentWeek(data.week);
      setSchedules(data.schedules);
      setWarnings(data.warnings || []);
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBaseData();
    loadWeeks();
  }, []);

  useEffect(() => {
    if (selectedWeekId) {
      loadSchedules(selectedWeekId);
    }
  }, [selectedWeekId]);

  // 创建新的排班周
  const handleCreateWeek = async () => {
    if (!selectedDate) {
      message.error('请选择日期');
      return;
    }
    
    const monday = selectedDate.startOf('week').add(1, 'day');
    const friday = monday.add(4, 'day');
    const year = monday.year();
    const weekNumber = monday.week();
    
    try {
      const newWeek: any = await scheduleApi.createWeek({
        year,
        weekNumber,
        startDate: monday.format('YYYY-MM-DD'),
        endDate: friday.format('YYYY-MM-DD'),
      });
      message.success('创建成功');
      setCreateModalVisible(false);
      setSelectedDate(null);
      await loadWeeks();
      setSelectedWeekId(newWeek.id);
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 生成排班
  const handleGenerate = async () => {
    if (!selectedWeekId) return;
    
    try {
      const result: any = await scheduleApi.generateSchedule(selectedWeekId);
      if (result.warnings && result.warnings.length > 0) {
        message.warning(`排班生成完成，但有 ${result.warnings.length} 条警告`);
      } else {
        message.success('排班生成成功');
      }
      setWarnings(result.warnings || []);
      loadSchedules(selectedWeekId);
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 确认排班
  const handleConfirm = async () => {
    if (!selectedWeekId) return;
    
    try {
      await scheduleApi.confirmWeek(selectedWeekId);
      message.success('排班已确认');
      loadWeeks();
      loadSchedules(selectedWeekId);
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 删除排班周
  const handleDeleteWeek = async () => {
    if (!selectedWeekId) return;
    
    try {
      await scheduleApi.deleteWeek(selectedWeekId);
      message.success('删除成功');
      setSelectedWeekId(null);
      loadWeeks();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 更新单个排班
  const handleUpdateSchedule = async (scheduleId: number, field: string, value: number) => {
    try {
      await scheduleApi.updateSchedule(scheduleId, { [field]: value });
      message.success('更新成功');
      loadSchedules(selectedWeekId!);
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 按天和阶段组织数据
  const getScheduleData = () => {
    const data: any[] = [];
    
    for (let day = 1; day <= 5; day++) {
      const daySchedules = schedules.filter(s => s.dayOfWeek === day);
      const row: any = { day, dayName: dayNames[day] };
      
      stages.forEach(stage => {
        row[`stage${stage.stageNumber}`] = daySchedules.filter(s => s.stageId === stage.id);
      });
      
      data.push(row);
    }
    
    return data;
  };

  // 渲染排班单元格
  const renderScheduleCell = (scheduleList: any[]) => {
    if (!scheduleList || scheduleList.length === 0) {
      return <span style={{ color: '#999' }}>-</span>;
    }
    
    const isConfirmed = currentWeek?.status === 'confirmed';
    
    return (
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        {scheduleList.map((s: any) => {
          const config = scheduleTypeConfig[s.scheduleType] || scheduleTypeConfig.fill;
          return (
            <div key={s.id} style={{ 
              padding: '6px 10px', 
              background: config.bg, 
              borderRadius: 6,
              border: `1px solid ${config.border}`,
            }}>
              <div style={{ marginBottom: 4 }}>
                <Tag color={config.color} style={{ fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>
                  {config.label}
                </Tag>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {isConfirmed ? (
                  <Tooltip title={s.teacher?.subject?.name || '未设置学科'}>
                    <Tag color="blue" style={{ margin: 0 }}>{s.teacher?.name}</Tag>
                  </Tooltip>
                ) : (
                  <Select
                    size="small"
                    value={s.teacherId}
                    onChange={(value) => handleUpdateSchedule(s.id, 'teacherId', value)}
                    style={{ width: 85 }}
                    dropdownMatchSelectWidth={false}
                  >
                    {teachers.map(t => (
                      <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
                    ))}
                  </Select>
                )}
                <span style={{ color: '#999', fontSize: 12 }}>→</span>
                {isConfirmed ? (
                  <Tag color="green" style={{ margin: 0 }}>{s.class?.name}</Tag>
                ) : (
                  <Select
                    size="small"
                    value={s.classId}
                    onChange={(value) => handleUpdateSchedule(s.id, 'classId', value)}
                    style={{ width: 100 }}
                    dropdownMatchSelectWidth={false}
                  >
                    {classes.map(c => (
                      <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                    ))}
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </Space>
    );
  };

  // 表格列配置
  const columns = [
    { title: '日期', dataIndex: 'dayName', key: 'dayName', width: 80 },
    ...stages.map(stage => ({
      title: stage.name,
      key: `stage${stage.stageNumber}`,
      render: (_: any, record: any) => renderScheduleCell(record[`stage${stage.stageNumber}`]),
    })),
  ];

  return (
    <div>
      <Card title={<><ScheduleOutlined /> 排班管理</>}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            style={{ width: 200 }}
            placeholder="选择排班周"
            value={selectedWeekId}
            onChange={setSelectedWeekId}
          >
            {weeks.map(w => (
              <Select.Option key={w.id} value={w.id}>
                {w.year}年 第{w.weekNumber}周
                {w.status === 'confirmed' && <Tag color="green" style={{ marginLeft: 8 }}>已确认</Tag>}
              </Select.Option>
            ))}
          </Select>
          <Button icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            新建排班周
          </Button>
          {selectedWeekId && currentWeek?.status !== 'confirmed' && (
            <>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleGenerate}>
                生成排班
              </Button>
              <Button icon={<CheckOutlined />} onClick={handleConfirm}>
                确认排班
              </Button>
              <Popconfirm title="确定删除此排班周？" onConfirm={handleDeleteWeek}>
                <Button danger icon={<DeleteOutlined />}>删除</Button>
              </Popconfirm>
            </>
          )}
        </Space>

        {currentWeek && (
          <div style={{ marginBottom: 16 }}>
            <Tag color={currentWeek.status === 'confirmed' ? 'green' : 'orange'}>
              {currentWeek.status === 'confirmed' ? '已确认' : '草稿'}
            </Tag>
            <span style={{ marginLeft: 8 }}>
              {currentWeek.startDate?.split('T')[0]} 至 {currentWeek.endDate?.split('T')[0]}
            </span>
          </div>
        )}

        {/* 警告信息展示 */}
        {warnings.length > 0 && (
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message={`排班生成有 ${warnings.length} 条警告`}
            description={
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                {warnings.map((w: any, index: number) => (
                  <li key={index} style={{ marginBottom: 4 }}>{w.message}</li>
                ))}
              </ul>
            }
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setWarnings([])}
          />
        )}

        {/* 图例说明 */}
        {selectedWeekId && schedules.length > 0 && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
            <span style={{ marginRight: 16, color: '#666' }}>图例：</span>
            {Object.entries(scheduleTypeConfig).map(([key, config]) => (
              <Tag key={key} color={config.color} style={{ marginRight: 8 }}>
                {config.label}
              </Tag>
            ))}
          </div>
        )}

        {selectedWeekId ? (
          <Table
            columns={columns}
            dataSource={getScheduleData()}
            rowKey="day"
            loading={loading}
            pagination={false}
            bordered
          />
        ) : (
          <Empty description="请选择或创建排班周" />
        )}
      </Card>

      {/* 创建排班周弹窗 */}
      <Modal
        title="新建排班周"
        open={createModalVisible}
        onOk={handleCreateWeek}
        onCancel={() => { setCreateModalVisible(false); setSelectedDate(null); }}
      >
        <div style={{ marginBottom: 16 }}>
          选择该周内的任意一天，系统将自动计算周一至周五的日期范围
        </div>
        <DatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          style={{ width: '100%' }}
          placeholder="选择日期"
        />
      </Modal>
    </div>
  );
};

export default ScheduleManage;
