import React, { useState, useEffect } from 'react';
import { Card, Table, Select, Space, Button, message, Tabs, Tag, Alert, Row, Col, Modal } from 'antd';
import { BarChartOutlined, DownloadOutlined, PieChartOutlined, LineChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { statisticsApi, scheduleApi, teacherApi } from '../api';

// 统计分析页面
const Statistics: React.FC = () => {
  const [weeks, setWeeks] = useState<any[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<number | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<any>(null);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [multiDimensionStats, setMultiDimensionStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [workloadTrend, setWorkloadTrend] = useState<any>(null);
  const [trendModalVisible, setTrendModalVisible] = useState(false);

  // 加载排班周列表
  const loadWeeks = async () => {
    try {
      const data: any = await scheduleApi.getAllWeeks();
      setWeeks(data);
      if (data.length > 0) {
        setSelectedWeekId(data[0].id);
      }
    } catch (error) {
      console.error('加载排班周失败', error);
    }
  };

  // 加载教师列表
  const loadTeachers = async () => {
    try {
      const data: any = await teacherApi.getAll();
      setTeachers(data);
    } catch (error) {
      console.error('加载教师列表失败', error);
    }
  };

  // 加载周统计数据
  const loadWeeklyStats = async (weekId: number) => {
    setLoading(true);
    try {
      const data: any = await statisticsApi.getWeeklyStatistics(weekId);
      setWeeklyStats(data);
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  // 加载多维度统计
  const loadMultiDimensionStats = async (weekId: number) => {
    try {
      const data: any = await statisticsApi.getMultiDimensionStats(weekId);
      setMultiDimensionStats(data);
    } catch (error) {
      console.error('加载多维度统计失败', error);
    }
  };

  // 加载均衡性分析
  const loadBalanceData = async () => {
    setLoading(true);
    try {
      const data: any = await statisticsApi.getStage2Balance();
      setBalanceData(data);
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  // 加载教师工作量趋势
  const loadWorkloadTrend = async (teacherId: number) => {
    try {
      const data: any = await statisticsApi.getWorkloadTrend(teacherId, 8);
      setWorkloadTrend(data);
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  useEffect(() => {
    loadWeeks();
    loadBalanceData();
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedWeekId) {
      loadWeeklyStats(selectedWeekId);
      loadMultiDimensionStats(selectedWeekId);
    }
  }, [selectedWeekId]);

  // 导出数据
  const handleExport = async () => {
    if (!selectedWeekId) return;
    
    try {
      const blob = (await statisticsApi.exportData(selectedWeekId, exportFormat)) as unknown as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statistics-week-${selectedWeekId}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('导出成功');
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 查看教师工作量趋势
  const handleViewTrend = (teacherId: number) => {
    setSelectedTeacherId(teacherId);
    loadWorkloadTrend(teacherId);
    setTrendModalVisible(true);
  };

  // 周统计表格列
  const weeklyColumns = [
    { title: '教师姓名', dataIndex: 'teacherName', key: 'teacherName' },
    { title: '任教学科', dataIndex: 'subjectName', key: 'subjectName' },
    { 
      title: '总排班次数', 
      dataIndex: 'totalCount', 
      key: 'totalCount',
      sorter: (a: any, b: any) => a.totalCount - b.totalCount,
    },
    { 
      title: '第二阶段次数', 
      dataIndex: 'stage2Count', 
      key: 'stage2Count',
      sorter: (a: any, b: any) => a.stage2Count - b.stage2Count,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Button 
          type="link" 
          icon={<LineChartOutlined />}
          onClick={() => handleViewTrend(record.teacherId)}
        >
          趋势
        </Button>
      ),
    },
  ];

  // 均衡性表格列（整体工作量）
  const balanceColumns = [
    { title: '教师姓名', dataIndex: 'teacherName', key: 'teacherName' },
    { title: '任教学科', dataIndex: 'subjectName', key: 'subjectName' },
    { 
      title: '总排班次数', 
      dataIndex: 'totalCount', 
      key: 'totalCount',
      sorter: (a: any, b: any) => a.totalCount - b.totalCount,
    },
    { 
      title: '第一阶段', 
      dataIndex: 'stage1Count', 
      key: 'stage1Count',
      sorter: (a: any, b: any) => (a.stage1Count || 0) - (b.stage1Count || 0),
    },
    { 
      title: '第二阶段', 
      dataIndex: 'stage2Count', 
      key: 'stage2Count',
      sorter: (a: any, b: any) => (a.stage2Count || 0) - (b.stage2Count || 0),
    },
    { 
      title: '第三阶段', 
      dataIndex: 'stage3Count', 
      key: 'stage3Count',
      sorter: (a: any, b: any) => (a.stage3Count || 0) - (b.stage3Count || 0),
    },
  ];

  // 周统计图表配置
  const getWeeklyChartOption = () => {
    if (!weeklyStats?.statistics) return {};
    
    const data = weeklyStats.statistics.slice(0, 15); // 取前15个
    
    return {
      title: { text: '教师排班次数统计', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((s: any) => s.teacherName),
        axisLabel: { rotate: 45 },
      },
      yAxis: { type: 'value', name: '次数' },
      series: [
        {
          name: '总次数',
          type: 'bar',
          data: data.map((s: any) => s.totalCount),
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '第二阶段',
          type: 'bar',
          data: data.map((s: any) => s.stage2Count),
          itemStyle: { color: '#52c41a' },
        },
      ],
      legend: { data: ['总次数', '第二阶段'], bottom: 0 },
    };
  };

  // 均衡性图表配置（整体工作量）
  const getBalanceChartOption = () => {
    if (!balanceData?.overallStatistics) return {};
    
    const data = balanceData.overallStatistics.slice(0, 20);
    const overallAvg = parseFloat(balanceData.overallBalance?.avgCount || 0);
    
    return {
      title: { text: '全阶段排班均衡性分析', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((s: any) => s.teacherName),
        axisLabel: { rotate: 45 },
      },
      yAxis: { type: 'value', name: '累计次数' },
      series: [
        {
          name: '第一阶段',
          type: 'bar',
          stack: 'total',
          data: data.map((s: any) => s.stage1Count || 0),
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '第二阶段',
          type: 'bar',
          stack: 'total',
          data: data.map((s: any) => s.stage2Count || 0),
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '第三阶段',
          type: 'bar',
          stack: 'total',
          data: data.map((s: any) => s.stage3Count || 0),
          itemStyle: { color: '#faad14' },
        },
      ],
      legend: { data: ['第一阶段', '第二阶段', '第三阶段'], bottom: 0 },
    };
  };

  // 学科分布饼图配置
  const getSubjectPieOption = () => {
    if (!multiDimensionStats?.bySubject) return {};
    
    return {
      title: { text: '学科排班分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: multiDimensionStats.bySubject.map((s: any) => ({
          name: s.subjectName,
          value: s.scheduleCount,
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }],
    };
  };

  // 星期分布图表配置
  const getDayOfWeekChartOption = () => {
    if (!multiDimensionStats?.byDayOfWeek) return {};
    
    const data = multiDimensionStats.byDayOfWeek;
    
    return {
      title: { text: '每日排班分布', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((d: any) => d.dayName),
      },
      yAxis: { type: 'value', name: '排班数' },
      series: [
        {
          name: '排班数',
          type: 'bar',
          data: data.map((d: any) => d.scheduleCount),
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '教师数',
          type: 'line',
          yAxisIndex: 0,
          data: data.map((d: any) => d.teacherCount),
          itemStyle: { color: '#52c41a' },
        },
      ],
      legend: { data: ['排班数', '教师数'], bottom: 0 },
    };
  };

  // 排班类型分布图表
  const getScheduleTypeOption = () => {
    if (!multiDimensionStats?.byScheduleType) return {};
    
    return {
      title: { text: '排班类型分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      series: [{
        type: 'pie',
        radius: '60%',
        data: multiDimensionStats.byScheduleType.map((s: any) => ({
          name: s.typeName,
          value: s.count,
        })),
      }],
    };
  };

  // 工作量趋势图表配置
  const getWorkloadTrendOption = () => {
    if (!workloadTrend?.data) return {};
    
    const data = workloadTrend.data;
    
    return {
      title: { text: `${workloadTrend.teacher?.name} 工作量趋势`, left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((d: any) => `第${d.weekNumber}周`),
      },
      yAxis: { type: 'value', name: '排班次数' },
      series: [
        {
          name: '总排班',
          type: 'line',
          data: data.map((d: any) => d.totalCount),
          smooth: true,
          itemStyle: { color: '#1890ff' },
        },
        {
          name: '第二阶段',
          type: 'line',
          data: data.map((d: any) => d.stage2Count),
          smooth: true,
          itemStyle: { color: '#52c41a' },
        },
      ],
      legend: { data: ['总排班', '第二阶段'], bottom: 0 },
    };
  };

  return (
    <div>
      <Card title={<><BarChartOutlined /> 统计分析</>}>
        <Tabs
          items={[
            {
              key: 'weekly',
              label: '周统计',
              children: (
                <>
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
                        </Select.Option>
                      ))}
                    </Select>
                    <Select
                      style={{ width: 100 }}
                      value={exportFormat}
                      onChange={setExportFormat}
                    >
                      <Select.Option value="xlsx">Excel</Select.Option>
                      <Select.Option value="csv">CSV</Select.Option>
                    </Select>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>
                      导出
                    </Button>
                  </Space>

                  {weeklyStats?.summary && (
                    <div style={{ marginBottom: 16 }}>
                      <Tag>总排班数：{weeklyStats.summary.totalSchedules}</Tag>
                      <Tag>教师数：{weeklyStats.summary.teacherCount}</Tag>
                      <Tag>人均排班：{weeklyStats.summary.avgSchedulesPerTeacher} 次</Tag>
                    </div>
                  )}

                  {weeklyStats?.statistics && (
                    <ReactECharts option={getWeeklyChartOption()} style={{ height: 400 }} />
                  )}

                  <Table
                    columns={weeklyColumns}
                    dataSource={weeklyStats?.statistics || []}
                    rowKey="teacherId"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    style={{ marginTop: 16 }}
                  />
                </>
              ),
            },
            {
              key: 'multiDimension',
              label: <><PieChartOutlined /> 多维度分析</>,
              children: (
                <>
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
                        </Select.Option>
                      ))}
                    </Select>
                  </Space>

                  {multiDimensionStats && (
                    <>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Card size="small" title="学科分布">
                            <ReactECharts option={getSubjectPieOption()} style={{ height: 300 }} />
                          </Card>
                        </Col>
                        <Col span={12}>
                          <Card size="small" title="排班类型分布">
                            <ReactECharts option={getScheduleTypeOption()} style={{ height: 300 }} />
                          </Card>
                        </Col>
                      </Row>
                      <Row gutter={16} style={{ marginTop: 16 }}>
                        <Col span={24}>
                          <Card size="small" title="每日排班分布">
                            <ReactECharts option={getDayOfWeekChartOption()} style={{ height: 300 }} />
                          </Card>
                        </Col>
                      </Row>
                      
                      {multiDimensionStats.byStage && (
                        <Card size="small" title="阶段统计" style={{ marginTop: 16 }}>
                          <Table
                            size="small"
                            dataSource={multiDimensionStats.byStage}
                            rowKey="stageId"
                            pagination={false}
                            columns={[
                              { title: '阶段', dataIndex: 'stageName', key: 'stageName' },
                              { title: '排班数', dataIndex: 'scheduleCount', key: 'scheduleCount' },
                              { title: '教师数', dataIndex: 'teacherCount', key: 'teacherCount' },
                              { title: '班级数', dataIndex: 'classCount', key: 'classCount' },
                            ]}
                          />
                        </Card>
                      )}
                    </>
                  )}
                </>
              ),
            },
            {
              key: 'balance',
              label: '全阶段均衡性分析',
              children: (
                <>
                  {balanceData?.suggestions && (
                    <Alert
                      message="均衡性建议"
                      description={
                        <ul style={{ margin: 0, paddingLeft: 20 }}>
                          {balanceData.suggestions.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      }
                      type={balanceData.overallBalance?.variance > 3 ? 'warning' : 'success'}
                      showIcon
                      style={{ marginBottom: 16 }}
                    />
                  )}

                  {balanceData?.overallBalance && (
                    <div style={{ marginBottom: 16 }}>
                      <Tag>统计周数：{balanceData.weekCount}</Tag>
                      <Tag>最高总次数：{balanceData.overallBalance.maxCount}</Tag>
                      <Tag>最低总次数：{balanceData.overallBalance.minCount}</Tag>
                      <Tag>平均总次数：{balanceData.overallBalance.avgCount}</Tag>
                      <Tag color={balanceData.overallBalance.variance > 3 ? 'red' : 'green'}>
                        差异值：{balanceData.overallBalance.variance}
                      </Tag>
                    </div>
                  )}

                  {balanceData?.overallStatistics && (
                    <ReactECharts option={getBalanceChartOption()} style={{ height: 400 }} />
                  )}

                  <Table
                    columns={balanceColumns}
                    dataSource={balanceData?.overallStatistics || []}
                    rowKey="teacherId"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    style={{ marginTop: 16 }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 工作量趋势弹窗 */}
      <Modal
        title="教师工作量趋势"
        open={trendModalVisible}
        onCancel={() => setTrendModalVisible(false)}
        footer={null}
        width={700}
      >
        {workloadTrend && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Tag>教师：{workloadTrend.teacher?.name}</Tag>
              <Tag>学科：{workloadTrend.teacher?.subjectName}</Tag>
              {workloadTrend.summary && (
                <>
                  <Tag>平均排班：{workloadTrend.summary.avgCount} 次/周</Tag>
                  <Tag color={
                    workloadTrend.summary.trend === 'increasing' ? 'red' :
                    workloadTrend.summary.trend === 'decreasing' ? 'green' : 'blue'
                  }>
                    趋势：{workloadTrend.summary.trendLabel}
                  </Tag>
                </>
              )}
            </div>
            <ReactECharts option={getWorkloadTrendOption()} style={{ height: 350 }} />
          </>
        )}
      </Modal>
    </div>
  );
};

export default Statistics;
