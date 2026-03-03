import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Card, Tag, Switch, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BookOutlined } from '@ant-design/icons';
import { subjectApi } from '../api';

// 星期选项
const dayOptions = [
  { value: 1, label: '周一' },
  { value: 2, label: '周二' },
  { value: 3, label: '周三' },
  { value: 4, label: '周四' },
  { value: 5, label: '周五' },
];

// 学科管理页面
const SubjectManage: React.FC = () => {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [excludeDates, setExcludeDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [excludeModalVisible, setExcludeModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [form] = Form.useForm();
  const [excludeForm] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [subjectData, excludeData]: any = await Promise.all([
        subjectApi.getAll(),
        subjectApi.getExcludeDates(),
      ]);
      setSubjects(subjectData);
      setExcludeDates(excludeData);
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 保存学科
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingSubject) {
        await subjectApi.update(editingSubject.id, values);
        message.success('更新成功');
      } else {
        await subjectApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingSubject(null);
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      // API 拦截器已处理错误提示
    }
  };

  // 删除学科
  const handleDelete = async (id: number) => {
    try {
      await subjectApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 添加校验日
  const handleAddExcludeDate = async () => {
    try {
      const values = await excludeForm.validateFields();
      await subjectApi.setExcludeDate(values);
      message.success('添加成功');
      setExcludeModalVisible(false);
      excludeForm.resetFields();
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      // API 拦截器已处理错误提示
    }
  };

  // 删除校验日
  const handleDeleteExcludeDate = async (id: number) => {
    try {
      await subjectApi.removeExcludeDate(id);
      message.success('删除成功');
      loadData();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 学科表格列
  const subjectColumns = [
    { title: '学科名称', dataIndex: 'name', key: 'name' },
    {
      title: '是否主科',
      key: 'isMain',
      render: (_: any, record: any) => (
        <Tag color={record.isMain ? 'blue' : 'default'}>
          {record.isMain ? '主科' : '副科'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingSubject(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 校验日表格列
  const excludeColumns = [
    {
      title: '学科',
      key: 'subject',
      render: (_: any, record: any) => record.subject?.name || '-',
    },
    {
      title: '校验日',
      key: 'dayOfWeek',
      render: (_: any, record: any) => dayOptions.find(d => d.value === record.dayOfWeek)?.label || '-',
    },
    { title: '备注', dataIndex: 'remark', key: 'remark' },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Popconfirm title="确定删除？" onConfirm={() => handleDeleteExcludeDate(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Card title={<><BookOutlined /> 学科管理</>}>
        <Tabs
          items={[
            {
              key: 'subjects',
              label: '学科列表',
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { setEditingSubject(null); form.resetFields(); setModalVisible(true); }}
                    >
                      添加学科
                    </Button>
                  </div>
                  <Table
                    columns={subjectColumns}
                    dataSource={subjects}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    style={{ width: '100%' }}
                  />
                </>
              ),
            },
            {
              key: 'excludeDates',
              label: '学科校验日',
              children: (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => { excludeForm.resetFields(); setExcludeModalVisible(true); }}
                    >
                      添加校验日
                    </Button>
                    <span style={{ marginLeft: 16, color: '#999' }}>
                      配置后，该学科教师在指定日期不参与课后服务排班
                    </span>
                  </div>
                  <Table
                    columns={excludeColumns}
                    dataSource={excludeDates}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    style={{ width: '100%' }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* 学科编辑弹窗 */}
      <Modal
        title={editingSubject ? '编辑学科' : '添加学科'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingSubject(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="学科名称" rules={[{ required: true, message: '请输入学科名称' }]}>
            <Input placeholder="请输入学科名称" />
          </Form.Item>
          <Form.Item name="isMain" label="是否主科" valuePropName="checked">
            <Switch checkedChildren="主科" unCheckedChildren="副科" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 校验日编辑弹窗 */}
      <Modal
        title="添加学科校验日"
        open={excludeModalVisible}
        onOk={handleAddExcludeDate}
        onCancel={() => { setExcludeModalVisible(false); excludeForm.resetFields(); }}
      >
        <Form form={excludeForm} layout="vertical">
          <Form.Item name="subjectId" label="学科" rules={[{ required: true, message: '请选择学科' }]}>
            <Select placeholder="选择学科">
              {subjects.map((s) => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dayOfWeek" label="校验日" rules={[{ required: true, message: '请选择校验日' }]}>
            <Select placeholder="选择校验日">
              {dayOptions.map((d) => (
                <Select.Option key={d.value} value={d.value}>{d.label}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input placeholder="备注说明（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SubjectManage;
