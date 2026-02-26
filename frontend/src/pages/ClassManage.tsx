import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Space, message, Popconfirm, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { classApi, teacherApi } from '../api';

// 班级管理页面
const ClassManage: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [classData, teacherData]: any = await Promise.all([
        classApi.getAll(),
        teacherApi.getAll(),
      ]);
      setClasses(classData);
      setTeachers(teacherData);
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 打开编辑弹窗
  const handleEdit = (record: any) => {
    setEditingClass(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  // 保存班级
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingClass) {
        await classApi.update(editingClass.id, values);
        message.success('更新成功');
      } else {
        await classApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingClass(null);
      loadData();
    } catch (error: any) {
      // API 层已经显示了具体错误信息，这里只处理表单验证错误
      if (error?.errorFields) {
        // 表单验证错误，不需要额外提示
        return;
      }
      // API 错误已在拦截器中处理，无需重复提示
    }
  };

  // 删除班级
  const handleDelete = async (id: number) => {
    try {
      await classApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch (error) {
      // API 层已经显示了具体错误信息
    }
  };

  // 批量创建班级
  const handleBatchCreate = async () => {
    try {
      const values = await batchForm.validateFields();
      await classApi.batchCreate(values.grades, values.classCountPerGrade);
      message.success('批量创建成功');
      setBatchModalVisible(false);
      batchForm.resetFields();
      loadData();
    } catch (error: any) {
      // API 层已经显示了具体错误信息
      if (error?.errorFields) {
        return;
      }
    }
  };

  // 设置班主任
  const handleSetHeadTeacher = async (classId: number, teacherId: number) => {
    try {
      await classApi.setHeadTeacher(classId, teacherId);
      message.success('设置成功');
      loadData();
    } catch (error) {
      // API 层已经显示了具体错误信息
    }
  };

  // 表格列配置
  const columns = [
    { title: '班级名称', dataIndex: 'name', key: 'name' },
    { title: '年级', dataIndex: 'grade', key: 'grade' },
    { title: '班级序号', dataIndex: 'classNumber', key: 'classNumber' },
    {
      title: '班主任',
      key: 'headTeacher',
      render: (_: any, record: any) => (
        <Select
          style={{ width: 120 }}
          value={record.headTeacherId}
          onChange={(value) => handleSetHeadTeacher(record.id, value)}
          placeholder="选择班主任"
          allowClear
        >
          {teachers.map((t) => (
            <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
          ))}
        </Select>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 年级选项
  const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

  return (
    <div>
      <Card
        title={<><TeamOutlined /> 班级管理</>}
        extra={
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBatchModalVisible(true)}>
              批量创建
            </Button>
            <Button icon={<PlusOutlined />} onClick={() => { setEditingClass(null); form.resetFields(); setModalVisible(true); }}>
              添加班级
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={classes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title={editingClass ? '编辑班级' : '添加班级'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingClass(null); }}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="班级名称" rules={[{ required: true, message: '请输入班级名称' }]}>
            <Input placeholder="如：一年级1班" />
          </Form.Item>
          <Form.Item name="grade" label="年级" rules={[{ required: true, message: '请选择年级' }]}>
            <Select placeholder="选择年级">
              {gradeOptions.map((g) => (
                <Select.Option key={g} value={g}>{g}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="classNumber" label="班级序号" rules={[{ required: true, message: '请输入班级序号' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量创建弹窗 */}
      <Modal
        title="批量创建班级"
        open={batchModalVisible}
        onOk={handleBatchCreate}
        onCancel={() => { setBatchModalVisible(false); batchForm.resetFields(); }}
      >
        <Form form={batchForm} layout="vertical">
          <Form.Item name="grades" label="选择年级" rules={[{ required: true, message: '请选择年级' }]}>
            <Select mode="multiple" placeholder="选择要创建的年级">
              {gradeOptions.map((g) => (
                <Select.Option key={g} value={g}>{g}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="classCountPerGrade" label="每年级班级数" rules={[{ required: true, message: '请输入班级数' }]}>
            <InputNumber min={1} max={20} style={{ width: '100%' }} placeholder="如：6" />
          </Form.Item>
        </Form>
        <div style={{ color: '#999', fontSize: 12 }}>
          注意：批量创建会清除现有班级数据
        </div>
      </Modal>
    </div>
  );
};

export default ClassManage;
