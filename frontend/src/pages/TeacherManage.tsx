import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, message, Popconfirm, Card, Tag, Switch, Divider, Checkbox, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import { teacherApi, subjectApi, classApi } from '../api';

// 教师管理页面
const TeacherManage: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [stage3ModalVisible, setStage3ModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [selectedStage3Teachers, setSelectedStage3Teachers] = useState<number[]>([]);
  const [form] = Form.useForm();

  // 加载数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [teacherData, subjectData, classData]: any = await Promise.all([
        teacherApi.getAll(),
        subjectApi.getAll(),
        classApi.getAll(),
      ]);
      setTeachers(teacherData);
      setSubjects(subjectData);
      setClasses(classData);
      // 初始化已选中的第三阶段教师
      setSelectedStage3Teachers(teacherData.filter((t: any) => t.canStage3).map((t: any) => t.id));
    } catch {
      // API 拦截器已处理错误提示
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 打开编辑弹窗
  const handleEdit = (record: any) => {
    setEditingTeacher(record);
    form.setFieldsValue({
      ...record,
      teachingClassIds: record.teachingClasses?.map((c: any) => c.id) || [],
    });
    setModalVisible(true);
  };

  // 保存教师
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingTeacher) {
        await teacherApi.update(editingTeacher.id, values);
        message.success('更新成功');
      } else {
        await teacherApi.create(values);
        message.success('创建成功');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingTeacher(null);
      loadData();
    } catch (error: any) {
      if (error?.errorFields) return;
      // API 拦截器已处理错误提示
    }
  };

  // 删除教师
  const handleDelete = async (id: number) => {
    try {
      await teacherApi.delete(id);
      message.success('删除成功');
      loadData();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 切换第三阶段资格
  const handleToggleStage3 = async (teacher: any) => {
    try {
      await teacherApi.update(teacher.id, { canStage3: !teacher.canStage3 });
      message.success('更新成功');
      loadData();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 打开批量设置第三阶段教师弹窗
  const handleOpenStage3Modal = () => {
    setSelectedStage3Teachers(teachers.filter(t => t.canStage3).map(t => t.id));
    setStage3ModalVisible(true);
  };

  // 批量设置第三阶段教师
  const handleBatchSetStage3 = async () => {
    try {
      await teacherApi.setStage3Teachers(selectedStage3Teachers);
      message.success('批量设置成功');
      setStage3ModalVisible(false);
      loadData();
    } catch {
      // API 拦截器已处理错误提示
    }
  };

  // 表格列配置
  const columns = [
    { title: '教师姓名', dataIndex: 'name', key: 'name' },
    {
      title: '任教学科',
      key: 'subject',
      render: (_: any, record: any) => (
        record.subject ? (
          <Tag color={record.subject.isMain ? 'blue' : 'default'}>
            {record.subject.name}
          </Tag>
        ) : '-'
      ),
    },
    {
      title: '任教班级',
      key: 'teachingClasses',
      render: (_: any, record: any) => (
        record.teachingClasses?.length > 0 ? (
          <Space wrap>
            {record.teachingClasses.map((c: any) => (
              <Tag key={c.id}>{c.name}</Tag>
            ))}
          </Space>
        ) : '-'
      ),
    },
    {
      title: '可参与第三阶段',
      key: 'canStage3',
      render: (_: any, record: any) => (
        <Switch
          checked={record.canStage3}
          onChange={() => handleToggleStage3(record)}
          checkedChildren="是"
          unCheckedChildren="否"
        />
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

  return (
    <div>
      <Card
        title={<><UserOutlined /> 教师管理</>}
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={handleOpenStage3Modal}
            >
              批量设置第三阶段教师
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => { setEditingTeacher(null); form.resetFields(); setModalVisible(true); }}
            >
              添加教师
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={teachers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        />
      </Card>

      {/* 编辑弹窗 */}
      <Modal
        title={editingTeacher ? '编辑教师' : '添加教师'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => { setModalVisible(false); form.resetFields(); setEditingTeacher(null); }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="教师姓名" rules={[{ required: true, message: '请输入教师姓名' }]}>
            <Input placeholder="请输入教师姓名" />
          </Form.Item>
          <Form.Item name="subjectId" label="任教学科">
            <Select placeholder="选择任教学科" allowClear>
              {subjects.map((s) => (
                <Select.Option key={s.id} value={s.id}>
                  {s.name} {s.isMain && <Tag color="blue">主科</Tag>}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="teachingClassIds" label="任教班级">
            <Select mode="multiple" placeholder="选择任教班级" allowClear>
              {classes.map((c) => (
                <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="canStage3" label="可参与第三阶段" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 批量设置第三阶段教师弹窗 */}
      <Modal
        title="批量设置第三阶段教师"
        open={stage3ModalVisible}
        onOk={handleBatchSetStage3}
        onCancel={() => setStage3ModalVisible(false)}
        width={700}
      >
        <div style={{ marginBottom: 16, color: '#666' }}>
          选择可以参与第三阶段课后服务的教师。第三阶段教师必须当天从第一阶段连续安排至第三阶段。
        </div>
        <Divider orientation="left">已选择 {selectedStage3Teachers.length} 位教师</Divider>
        <Checkbox.Group
          value={selectedStage3Teachers}
          onChange={(values) => setSelectedStage3Teachers(values as number[])}
          style={{ width: '100%' }}
        >
          <Row gutter={[16, 12]}>
            {teachers.map((teacher) => (
              <Col span={8} key={teacher.id}>
                <Checkbox value={teacher.id}>
                  {teacher.name}
                  {teacher.subject && (
                    <Tag color={teacher.subject.isMain ? 'blue' : 'default'} style={{ marginLeft: 8 }}>
                      {teacher.subject.name}
                    </Tag>
                  )}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Modal>
    </div>
  );
};

export default TeacherManage;
