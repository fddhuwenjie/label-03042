import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Button, message, Descriptions, Space, Alert } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import { stageApi, classApi } from '../api';

// 阶段配置页面
const StageManage: React.FC = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [classCount, setClassCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [stageData, classData]: any = await Promise.all([
        stageApi.getAll(),
        classApi.getAll(),
      ]);
      setStages(stageData);
      setClassCount(classData.length);
      
      // 设置表单初始值
      const formValues: any = {};
      stageData.forEach((s: any) => {
        formValues[`stage${s.stageNumber}`] = s.classCount;
      });
      form.setFieldsValue(formValues);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存配置
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const data = [
        { stageNumber: 1, classCount: values.stage1 || 0 },
        { stageNumber: 2, classCount: values.stage2 || 0 },
        { stageNumber: 3, classCount: values.stage3 || 0 },
      ];
      
      await stageApi.updateClassCounts(data);
      message.success('保存成功');
      loadData();
    } catch (error) {
      message.error('保存失败');
    }
  };

  return (
    <div>
      <Card title={<><SettingOutlined /> 课后服务阶段配置</>}>
        <Alert
          message="配置说明"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>课后服务分为3个阶段，每个阶段可配置需要安排的班级数量</li>
              <li>第三阶段仅限指定教师参与（在教师管理中设置）</li>
              <li>被安排第三阶段的教师必须从第一阶段连续安排至第三阶段</li>
              <li>当前系统共有 <strong>{classCount}</strong> 个班级</li>
            </ul>
          }
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical" style={{ maxWidth: 600 }}>
          {stages.map((stage) => (
            <Form.Item
              key={stage.id}
              name={`stage${stage.stageNumber}`}
              label={
                <Space>
                  <span>{stage.name}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>
                    {stage.description}
                  </span>
                </Space>
              }
              rules={[{ required: true, message: '请输入班级数量' }]}
            >
              <InputNumber
                min={0}
                max={classCount}
                style={{ width: 200 }}
                placeholder="输入班级数量"
                addonAfter="个班级"
              />
            </Form.Item>
          ))}

          <Form.Item>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
            >
              保存配置
            </Button>
          </Form.Item>
        </Form>

        <Descriptions title="当前配置" bordered style={{ marginTop: 24 }}>
          {stages.map((stage) => (
            <Descriptions.Item key={stage.id} label={stage.name}>
              {stage.classCount} 个班级
            </Descriptions.Item>
          ))}
        </Descriptions>
      </Card>
    </div>
  );
};

export default StageManage;
