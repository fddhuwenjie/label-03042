import React, { useState, useEffect } from 'react';
import { Card, Row, Col, List, Tag, Spin, Alert, Typography } from 'antd';
import { 
  TeamOutlined, 
  UserOutlined, 
  BookOutlined, 
  CalendarOutlined,
  CheckCircleOutlined, 
  ClockCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { classApi, teacherApi, subjectApi, scheduleApi, statisticsApi } from '../api';

const { Title, Text } = Typography;

// 统计卡片组件
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <Card 
    style={{ borderRadius: 12 }} 
    bodyStyle={{ padding: 20 }}
    hoverable
  >
    <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
    <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
      <span style={{ color, fontSize: 22, marginRight: 8 }}>{icon}</span>
      <span style={{ color, fontSize: 32, fontWeight: 600, lineHeight: 1 }}>{value}</span>
    </div>
  </Card>
);

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    classCount: 0,
    teacherCount: 0,
    subjectCount: 0,
    weekCount: 0,
    confirmedWeekCount: 0,
    stage3TeacherCount: 0,
  });
  const [recentWeeks, setRecentWeeks] = useState<any[]>([]);
  const [balanceData, setBalanceData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classes, teachers, subjects, weeks, balance]: any = await Promise.all([
          classApi.getAll(),
          teacherApi.getAll(),
          subjectApi.getAll(),
          scheduleApi.getAllWeeks(),
          statisticsApi.getStage2Balance(),
        ]);
        
        setStats({
          classCount: classes.length,
          teacherCount: teachers.length,
          subjectCount: subjects.length,
          weekCount: weeks.length,
          confirmedWeekCount: weeks.filter((w: any) => w.status === 'confirmed').length,
          stage3TeacherCount: teachers.filter((t: any) => t.canStage3).length,
        });
        
        setRecentWeeks(weeks.slice(0, 5));
        setBalanceData(balance);
      } catch (error) {
        console.error('加载数据失败', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const getBalanceChartOption = () => {
    if (!balanceData?.statistics || balanceData.statistics.length === 0) return {};
    
    const data = balanceData.statistics.slice(0, 10);
    const avg = parseFloat(balanceData.balance?.avgCount || 0);
    
    return {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: data.map((s: any) => s.teacherName),
        axisLabel: { rotate: 30, fontSize: 11, interval: 0 },
      },
      yAxis: { type: 'value', name: '次数' },
      series: [{
        type: 'bar',
        data: data.map((s: any) => ({
          value: s.stage2Count,
          itemStyle: {
            color: s.stage2Count > avg + 1 ? '#ff4d4f' : 
                   s.stage2Count < avg - 1 ? '#faad14' : '#52c41a',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '50%',
      }],
      grid: { left: 50, right: 20, bottom: 60, top: 30 },
    };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 8 }}>
      <Title level={4} style={{ marginBottom: 24 }}>系统概览</Title>
      
      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} md={6}>
          <StatCard title="班级总数" value={stats.classCount} icon={<TeamOutlined />} color="#1890ff" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="教师总数" value={stats.teacherCount} icon={<UserOutlined />} color="#52c41a" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="学科总数" value={stats.subjectCount} icon={<BookOutlined />} color="#faad14" />
        </Col>
        <Col xs={12} md={6}>
          <StatCard title="排班周数" value={stats.weekCount} icon={<CalendarOutlined />} color="#722ed1" />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 最近排班 */}
        <Col xs={24} lg={10}>
          <Card title="最近排班记录" style={{ borderRadius: 12, minHeight: 380 }}>
            <List
              dataSource={recentWeeks}
              locale={{ emptyText: '暂无排班记录' }}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      item.status === 'confirmed' ? 
                        <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} /> :
                        <ClockCircleOutlined style={{ fontSize: 20, color: '#faad14' }} />
                    }
                    title={`${item.year}年 第${item.weekNumber}周`}
                    description={`${item.startDate?.split('T')[0]} 至 ${item.endDate?.split('T')[0]}`}
                  />
                  <Tag color={item.status === 'confirmed' ? 'success' : 'warning'}>
                    {item.status === 'confirmed' ? '已确认' : '草稿'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 均衡性分析 */}
        <Col xs={24} lg={14}>
          <Card title="第二阶段排班均衡性" style={{ borderRadius: 12, minHeight: 380 }}>
            {balanceData?.suggestions?.[0] && (
              <Alert
                message={balanceData.suggestions[0]}
                type={balanceData.balance?.variance > 3 ? 'warning' : 'success'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            {balanceData?.balance && (
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={8}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#f6ffed', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>平均次数</Text>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#52c41a' }}>
                      {balanceData.balance.avgCount}
                    </div>
                  </div>
                </Col>
                <Col xs={8}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#fff2f0', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>最高次数</Text>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#ff4d4f' }}>
                      {balanceData.balance.maxCount}
                    </div>
                  </div>
                </Col>
                <Col xs={8}>
                  <div style={{ textAlign: 'center', padding: 12, background: '#e6f7ff', borderRadius: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>最低次数</Text>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#1890ff' }}>
                      {balanceData.balance.minCount}
                    </div>
                  </div>
                </Col>
              </Row>
            )}
            
            {balanceData?.statistics?.length > 0 ? (
              <ReactECharts option={getBalanceChartOption()} style={{ height: 180 }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无统计数据</div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
