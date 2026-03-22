// components/EditSidebar.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Form, Input, Button, Select, Collapse, Tag, Space, App, Drawer, Modal, Divider, Empty, ColorPicker, DatePicker, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, FolderOutlined, LogoutOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PointData } from '@/models/Point';
import type { LineData } from '@/models/Line';
import type { GroupData } from '@/models/Group';

interface EditSidebarProps {
  points: PointData[];
  lines: LineData[];
  groups: GroupData[];
  selectedPoint: PointData | null;
  onClose: () => void;
  onUpdatePoint: (point: PointData, data: Partial<PointData>) => Promise<void>;
  onUpdateLine: (line: LineData, data: Partial<LineData>) => Promise<void>;
  onUpdateGroup: (group: GroupData, data: Partial<GroupData>) => Promise<void>;
  onCreatePoint: (pointData: PointData) => Promise<void>;
  onCreateLine: (data: { startPointId: string; endPointId: string; relations?: string[]; status?: string; color?: string }) => Promise<void>;
  onCreateGroup: (data: { name: string; color: string; status?: string; parent?: string | null }) => Promise<GroupData | null>;
  onDeletePoint: (pointId: string) => Promise<void>;
  onDeleteLine: (lineId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
}

export default function EditSidebar({
  points,
  lines,
  groups,
  selectedPoint,
  onClose,
  onUpdatePoint,
  onUpdateLine,
  onUpdateGroup,
  onCreatePoint,
  onCreateLine,
  onCreateGroup,
  onDeletePoint,
  onDeleteLine,
  onDeleteGroup,
}: EditSidebarProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [addLineModalOpen, setAddLineModalOpen] = useState(false);
  const [addLineForm] = Form.useForm();
  const [editLineModalOpen, setEditLineModalOpen] = useState(false);
  const [editLineForm] = Form.useForm();
  const [editingLine, setEditingLine] = useState<LineData | null>(null);
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [addGroupForm] = Form.useForm();
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editGroupForm] = Form.useForm();
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);

  // 获取当前点关联的线（起点或终点是当前点）
  const pointLines = useMemo(() => {
    if (!selectedPoint) return [];
    return lines.filter(line =>
      line.points.includes(selectedPoint._id)
    );
  }, [lines, selectedPoint]);

  // 获取当前点所属的组
  const pointGroup = useMemo(() => {
    if (!selectedPoint || !selectedPoint.heart.阵营) return null;
    return groups.find(g => g._id === selectedPoint.heart.阵营) || null;
  }, [groups, selectedPoint]);

  // 填充表单值
  const fillForm = useCallback((point: PointData) => {
    form.setFieldsValue({
      positionX: point.position.x,
      positionY: point.position.y,
      name: point.heart.名字 || '',
      avatars: point.heart.头像 || [],
      nicknames: point.heart.外号 || [],
      gender: point.heart.性别 || undefined,
      birthday: point.heart.生日 ? dayjs(point.heart.生日) : undefined,
      relation: point.heart.关系 || '',
      generation: point.heart.辈分 || '',
      identity: point.heart.身份 || '',
      firstMet: point.heart.初识 ? dayjs(point.heart.初识) : undefined,
      contact: typeof point.heart.联系 === 'number' ? point.heart.联系 : (point.heart.联系 ? 1 : 0),
      contacts: point.heart.联系方式 || [],
      salutation: point.heart.称呼 || '',
      tags: point.heart.标签 || [],
      notes: point.heart.备注 || '',
    });
  }, [form]);

  // Drawer 打开动画结束后填充表单，确保 Form 已挂载
  const handleAfterOpenChange = useCallback((open: boolean) => {
    if (open && selectedPoint) {
      fillForm(selectedPoint);
    }
  }, [selectedPoint, fillForm]);

  // selectedPoint 变化时（非首次挂载）也更新表单
  useEffect(() => {
    if (selectedPoint && drawerOpen) {
      fillForm(selectedPoint);
    }
  }, [selectedPoint, drawerOpen, fillForm]);

  // 关闭抽屉
  const handleClose = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 处理点编辑表单提交
  const handlePointSubmit = async (values: Record<string, any>) => {
    if (!selectedPoint) return;

    // 构建更新数据
    const updateData: Partial<PointData> = {
      position: {
        x: values.positionX ?? selectedPoint.position.x,
        y: values.positionY ?? selectedPoint.position.y,
      },
      heart: {
        ...selectedPoint.heart,
        名字: values.name ?? selectedPoint.heart.名字,
        头像: values.avatars ?? selectedPoint.heart.头像,
        外号: values.nicknames ?? selectedPoint.heart.外号,
        性别: values.gender ?? selectedPoint.heart.性别,
        生日: values.birthday ? values.birthday.valueOf() : selectedPoint.heart.生日,
        关系: values.relation ?? selectedPoint.heart.关系,
        辈分: values.generation ?? selectedPoint.heart.辈分,
        身份: values.identity ?? selectedPoint.heart.身份,
        初识: values.firstMet ? values.firstMet.valueOf() : selectedPoint.heart.初识,
        联系: values.contact ?? selectedPoint.heart.联系,
        联系方式: values.contacts ?? selectedPoint.heart.联系方式,
        称呼: values.salutation ?? selectedPoint.heart.称呼,
        标签: values.tags ?? selectedPoint.heart.标签,
        备注: values.notes ?? selectedPoint.heart.备注,
      },
    };

    // 如果是新建点（ID为空），先创建
    if (!selectedPoint._id) {
      try {
        const { _id, createdAt, updatedAt, ...createData } = selectedPoint as any;
        await onCreatePoint({
          ...createData,
          ...updateData,
        });
        message.success('创建成功');
      } catch (error) {
        console.error('创建失败:', error);
        message.error('创建失败');
      }
      return;
    }

    // 如果是更新已有点
    try {
      await onUpdatePoint(selectedPoint, updateData);
      message.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 删除点
  const handleDeletePoint = async () => {
    if (!selectedPoint) return;
    try {
      await onDeletePoint(selectedPoint._id);
      message.success('删除成功');
      handleClose();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // ===== 线操作 =====
  const handleOpenAddLineModal = () => {
    addLineForm.resetFields();
    if (selectedPoint) {
      addLineForm.setFieldsValue({ startPointId: selectedPoint._id });
    }
    setAddLineModalOpen(true);
  };

  const handleAddLine = async (values: { endPointId: string; relations?: string[]; status?: string; color?: string }) => {
    if (!selectedPoint) return;

    // 检查是否已存在连接
    const existingLine = lines.find(line =>
      line.points.includes(selectedPoint._id) && line.points.includes(values.endPointId)
    );

    if (existingLine) {
      message.warning('两点之间已存在连接');
      return;
    }

    try {
      await onCreateLine({
        startPointId: selectedPoint._id,
        endPointId: values.endPointId,
        relations: values.relations && values.relations.length > 0
          ? values.relations
          : [`${selectedPoint.heart.名字} → ${points.find(p => p._id === values.endPointId)?.heart.名字 || values.endPointId}`],
        status: values.status || 'unchanged',
        color: values.color || '#FFD700',
      });
      message.success('线创建成功');
      setAddLineModalOpen(false);
      addLineForm.resetFields();
    } catch (error) {
      console.error('创建线失败:', error);
      message.error('创建线失败');
    }
  };

  const handleOpenEditLineModal = (line: LineData) => {
    setEditingLine(line);
    editLineForm.setFieldsValue({
      startPointId: line.points[0],
      endPointId: line.points[1],
      relations: line.relations,
      status: line.status,
      color: line.color,
    });
    setEditLineModalOpen(true);
  };

  const handleEditLine = async (values: { startPointId: string; endPointId: string; relations?: string[]; status?: string; color?: string }) => {
    if (!editingLine) return;
    try {
      await onUpdateLine(editingLine, {
        points: [values.startPointId, values.endPointId],
        relations: values.relations || editingLine.relations,
        status: (values.status || editingLine.status) as LineData['status'],
        color: values.color || editingLine.color,
      });
      message.success('线更新成功');
      setEditLineModalOpen(false);
      setEditingLine(null);
    } catch (error) {
      console.error('更新线失败:', error);
      message.error('更新线失败');
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await onDeleteLine(lineId);
      message.success('线删除成功');
    } catch (error) {
      console.error('删除线失败:', error);
      message.error('删除线失败');
    }
  };

  // ===== 组操作 =====
  const handleOpenAddGroupModal = () => {
    addGroupForm.resetFields();
    addGroupForm.setFieldsValue({ color: '#3b82f6', status: 'unchanged', parent: null });
    setAddGroupModalOpen(true);
  };

  const handleAddGroup = async (values: { name: string; color: string; status: string; parent: string | null }) => {
    try {
      const newGroup = await onCreateGroup({
        name: values.name,
        color: values.color,
        status: values.status,
        parent: values.parent || null,
      });
      // 创建组后更新当前点的阵营属性
      if (newGroup && selectedPoint) {
        await onUpdatePoint(selectedPoint, {
          heart: {
            ...selectedPoint.heart,
            阵营: newGroup._id,
          },
        });
      }
      message.success('组创建成功');
      setAddGroupModalOpen(false);
      addGroupForm.resetFields();
    } catch (error) {
      console.error('创建组失败:', error);
      message.error('创建组失败');
    }
  };

  const handleOpenEditGroupModal = (group: GroupData) => {
    setEditingGroup(group);
    editGroupForm.setFieldsValue({
      name: group.name,
      color: group.color,
      status: group.status,
      parent: group.parent || null,
    });
    setEditGroupModalOpen(true);
  };

  const handleEditGroup = async (values: { name: string; color: string; status: string; parent: string | null }) => {
    if (!editingGroup) return;
    try {
      await onUpdateGroup(editingGroup, {
        name: values.name,
        color: values.color,
        status: values.status as GroupData['status'],
        parent: values.parent || null,
      });
      message.success('组更新成功');
      setEditGroupModalOpen(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('更新组失败:', error);
      message.error('更新组失败');
    }
  };

  return (
    <>
      <Drawer
        title="编辑面板"
        placement="right"
        onClose={handleClose}
        open={drawerOpen}
        afterOpenChange={handleAfterOpenChange}
        size="large"
        styles={{
          body: {
            paddingBottom: 80,
          },
        }}
        extra={
          <Space>
            <Button onClick={handleClose}>取消</Button>
            <Button type="primary" onClick={() => form.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        {/* 始终渲染点编辑表单 */}
        <Form
          form={form}
          layout="vertical"
          onFinish={handlePointSubmit}
          preserve={false}
        >
          {selectedPoint ? (
            <>
              {/* 点基本信息 */}
              <div className="mb-4">
                <div>
                  <span className="text-gray-500 text-sm">ID:</span>
                  <Tag color="blue">{selectedPoint._id}</Tag>
                </div>
              </div>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit">
                    保存
                  </Button>
                  <Button danger onClick={handleDeletePoint}>
                    <DeleteOutlined />
                    删除
                  </Button>
                </Space>
              </Form.Item>

              <Divider />

              <Collapse
                defaultActiveKey={['position', 'heart']}
                items={[
                  {
                    key: 'position',
                    label: 'position',
                    children: (
                      <Space style={{ width: '100%' }}>
                        <Form.Item name="positionX" label="x" style={{ marginBottom: 0 }}>
                          <InputNumber style={{ width: 100 }} />
                        </Form.Item>
                        <Form.Item name="positionY" label="y" style={{ marginBottom: 0 }}>
                          <InputNumber style={{ width: 100 }} />
                        </Form.Item>
                      </Space>
                    ),
                  },
                  {
                    key: 'heart',
                    label: 'heart',
                    children: (
                      <>
                        <Form.Item name="name" label="名字" rules={[{ required: true, message: '请输入名字' }]}>
                          <Input placeholder="请输入名字" />
                        </Form.Item>
                        <Form.Item name="avatars" label="头像">
                          <Select mode="tags" placeholder="输入头像URL后按回车" />
                        </Form.Item>
                        <Form.Item name="nicknames" label="外号">
                          <Select mode="tags" placeholder="输入外号后按回车" />
                        </Form.Item>
                        <Form.Item name="gender" label="性别">
                          <Select
                            allowClear
                            placeholder="请选择性别"
                            options={[
                              { label: '男', value: '男' },
                              { label: '女', value: '女' },
                              { label: '未知', value: '未知' },
                              { label: '伪男', value: '伪男' },
                              { label: '伪娘', value: '伪娘' },
                            ]}
                          />
                        </Form.Item>
                        <Form.Item name="firstMet" label="初识">
                          <DatePicker style={{ width: '100%' }} placeholder="请选择初识日期" />
                        </Form.Item>
                        <Form.Item name="contact" label="联系">
                          <InputNumber
                            min={0}
                            max={10}
                            style={{ width: '100%' }}
                            placeholder="时间戳或0-10"
                          />
                        </Form.Item>
                        <Form.Item name="birthday" label="生日">
                          <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
                        </Form.Item>
                        <Form.Item name="identity" label="身份">
                          <Input placeholder="请输入身份" />
                        </Form.Item>
                        <Form.Item name="salutation" label="称呼">
                          <Input placeholder="请输入称呼" />
                        </Form.Item>
                        <Form.Item name="generation" label="辈分">
                          <Input placeholder="请输入辈分" />
                        </Form.Item>
                        <Form.Item name="relation" label="关系">
                          <Input placeholder="请输入关系" />
                        </Form.Item>
                        <Form.Item name="contacts" label="联系方式">
                          <Form.List name="contacts">
                            {(fields, { add, remove }) => (
                              <>
                                {fields.map(({ key, name, ...restField }) => (
                                  <div key={key} style={{ marginBottom: 12 }}>
                                    <Space align="start" wrap>
                                      <Form.Item {...restField} name={[name, '账号名']} label="账号名" style={{ marginBottom: 0 }}>
                                        <Input placeholder="账号名" style={{ width: 120 }} />
                                      </Form.Item>
                                      <Form.Item {...restField} name={[name, '曾用名']} label="曾用名" style={{ marginBottom: 0 }}>
                                        <Select mode="tags" placeholder="曾用名" style={{ width: 120 }} />
                                      </Form.Item>
                                    </Space>
                                    <Space align="start" wrap>
                                      <Form.Item {...restField} name={[name, '账号']} label="账号" style={{ marginBottom: 0 }}>
                                        <Input placeholder="账号" style={{ width: 120 }} />
                                      </Form.Item>
                                      <Form.Item {...restField} name={[name, '平台']} label="平台" style={{ marginBottom: 0 }}>
                                        <Select placeholder="平台" style={{ width: 100 }} options={[
                                          { label: '微信', value: '微信' },
                                          { label: 'QQ', value: 'QQ' },
                                          { label: '手机', value: '手机' },
                                          { label: '邮箱', value: '邮箱' },
                                          { label: '微博', value: '微博' },
                                          { label: '抖音', value: '抖音' },
                                          { label: '小红书', value: '小红书' },
                                          { label: '其他', value: '其他' },
                                        ]} />
                                      </Form.Item>
                                      <Form.Item {...restField} name={[name, 'status']} label="status" style={{ marginBottom: 0 }}>
                                        <Select placeholder="状态" style={{ width: 100 }} options={[
                                          { label: '正常', value: '正常' },
                                          { label: '已注销', value: '已注销' },
                                          { label: '已冻结', value: '已冻结' },
                                        ]} />
                                      </Form.Item>
                                      <MinusCircleOutlined
                                        style={{ marginTop: 8 }}
                                        onClick={() => remove(name)}
                                      />
                                    </Space>
                                  </div>
                                ))}
                                <Button type="dashed" onClick={() => add({ 账号名: '', 曾用名: null, 账号: '', 平台: '', status: '正常' })} block icon={<PlusOutlined />}>
                                  添加
                                </Button>
                              </>
                            )}
                          </Form.List>
                        </Form.Item>
                        <Form.Item name="tags" label="标签">
                          <Form.List name="tags">
                            {(fields, { add, remove }) => (
                              <>
                                {fields.map(({ key, name, ...restField }) => (
                                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                    <Form.Item {...restField} name={[name, 'name']} style={{ marginBottom: 0 }}>
                                      <Input placeholder="标签名" />
                                    </Form.Item>
                                    <Form.Item {...restField} name={[name, 'status']} style={{ marginBottom: 0 }}>
                                      <Select placeholder="status" style={{ width: 100 }} options={[
                                        { label: '有效', value: '有效' },
                                        { label: '无效', value: '无效' },
                                      ]} />
                                    </Form.Item>
                                    <MinusCircleOutlined
                                      style={{ marginTop: 8 }}
                                      onClick={() => remove(name)}
                                    />
                                  </Space>
                                ))}
                                <Button type="dashed" onClick={() => add({ name: '', status: '有效', timestamp: Date.now() })} block icon={<PlusOutlined />}>
                                  添加
                                </Button>
                              </>
                            )}
                          </Form.List>
                        </Form.Item>
                        <Form.Item name="notes" label="备注">
                          <Input.TextArea rows={4} placeholder="请输入备注" />
                        </Form.Item>
                      </>
                    ),
                  },
                ]}
              />

              <Divider />

              {/* 线和组的折叠面板 */}
              <Collapse
                defaultActiveKey={['lines', 'group']}
                items={[
                  {
                    key: 'lines',
                    label: (
                      <Space>
                        <LinkOutlined />
                        <span>关联线</span>
                        <Tag color="blue">{pointLines.length}</Tag>
                      </Space>
                    ),
                    children: (
                      <>
                        {pointLines.length > 0 ? (
                          <div className="space-y-2">
                            {pointLines.map(line => (
                              <div key={line._id} className="p-2 border rounded hover:bg-gray-50">
                                <div className="flex items-center justify-between mb-1">
                                  <Space size={4}>
                                    <div
                                      style={{
                                        width: 12,
                                        height: 12,
                                        borderRadius: '50%',
                                        backgroundColor: line.color,
                                        border: '1px solid #d9d9d9',
                                        display: 'inline-block',
                                      }}
                                    />
                                    <Tag
                                      color={
                                        line.status === 'unchanged' ? 'green' :
                                        line.status === 'changed' ? 'orange' : 'default'
                                      }
                                    >
                                      {line.status === 'unchanged' ? '未变化' :
                                       line.status === 'changed' ? '已变化' : '未知'}
                                    </Tag>
                                  </Space>
                                  <Space size="small">
                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<EditOutlined />}
                                      onClick={() => handleOpenEditLineModal(line)}
                                    />
                                    <Button
                                      type="link"
                                      size="small"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => handleDeleteLine(line._id)}
                                    />
                                  </Space>
                                </div>
                                <div className="text-sm text-gray-600">
                                  {line.points[0].slice(-4)} → {line.points[1].slice(-4)}
                                  {line.relations[0] && <span className="ml-2 text-gray-400">({line.relations[0]})</span>}
                                </div>
                                {line.relations.length > 1 && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {line.relations.slice(1).map((r, i) => <Tag key={i} style={{ fontSize: 11 }}>{r}</Tag>)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Empty description="暂无线" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                        <Button
                          type="dashed"
                          block
                          icon={<PlusOutlined />}
                          onClick={handleOpenAddLineModal}
                          style={{ marginTop: 12 }}
                        >
                          添加线
                        </Button>
                      </>
                    ),
                  },
                  {
                    key: 'group',
                    label: (
                      <Space>
                        <FolderOutlined />
                        <span>关联组</span>
                        <Tag color="blue">{pointGroup ? 1 : 0}</Tag>
                      </Space>
                    ),
                    children: (
                      <>
                        {pointGroup ? (
                          <div className="p-2 border rounded hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-1">
                              <Tag color={pointGroup.color}>{pointGroup.name}</Tag>
                              <Space size="small">
                                <Button
                                  type="link"
                                  size="small"
                                  icon={<EditOutlined />}
                                  onClick={() => handleOpenEditGroupModal(pointGroup)}
                                />
                                  <Button
                                    type="link"
                                    size="small"
                                    danger
                                    icon={<LogoutOutlined />}
                                    onClick={async () => {
                                      // 退出组（移除点的阵营属性）
                                      if (selectedPoint) {
                                        try {
                                          await onUpdatePoint(selectedPoint, {
                                            heart: {
                                              ...selectedPoint.heart,
                                              阵营: '',
                                            },
                                          });
                                          message.success('已退出组');
                                        } catch (error) {
                                          console.error('退出组失败:', error);
                                          message.error('退出组失败');
                                        }
                                      }
                                    }}
                                  />
                              </Space>
                            </div>
                            <div className="text-sm text-gray-600">
                              成员点: {pointGroup.points.length} 个
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Select
                              showSearch
                              placeholder="搜索并选择组"
                              style={{ width: '100%' }}
                              optionFilterProp="label"
                              options={groups.map(g => ({
                                label: g.name,
                                value: g._id,
                              }))}
                              notFoundContent={
                                groups.length === 0 ? (
                                  <span className="text-gray-400">暂无组，请创建新组</span>
                                ) : null
                              }
                              onChange={async (groupId) => {
                                if (groupId && selectedPoint) {
                                  await onUpdatePoint(selectedPoint, {
                                    heart: {
                                      ...selectedPoint.heart,
                                      阵营: groupId,
                                    },
                                  });
                                  message.success('已加入组');
                                }
                              }}
                            />
                            <div className="text-center text-gray-400 text-sm">或</div>
                            <Button
                              type="dashed"
                              block
                              icon={<PlusOutlined />}
                              onClick={handleOpenAddGroupModal}
                            >
                              创建组
                            </Button>
                          </div>
                        )}
                      </>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <Empty description="请选择一个点进行编辑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Form>

        {/* 底部信息 */}
        <Divider />
        <div className="text-sm text-gray-500">
          <p>已加载 {points.length} 个点, {lines.length} 条线, {groups.length} 个组</p>
        </div>
      </Drawer>

      {/* 添加线弹窗 */}
      <Modal
        title="添加线"
        open={addLineModalOpen}
        onCancel={() => setAddLineModalOpen(false)}
        footer={null}
      >
        <Form form={addLineForm} layout="vertical" onFinish={handleAddLine} initialValues={{ status: 'unchanged', color: '#FFD700' }}>
          <Form.Item label="起点">
            <Tag color="blue">{selectedPoint?.heart.名字 || selectedPoint?._id}</Tag>
          </Form.Item>
          <Form.Item name="endPointId" label="终点" rules={[{ required: true, message: '请选择终点' }]}>
            <Select
              showSearch
              placeholder="搜索并选择终点"
              optionFilterProp="label"
              options={points
                .filter(p => p._id !== selectedPoint?._id)
                .map(p => ({
                  label: p.heart.名字 || p._id,
                  value: p._id,
                }))}
            />
          </Form.Item>
          <Form.Item name="relations" label="关系描述">
            <Select
              mode="tags"
              placeholder="输入关系描述后按回车添加"
              tokenSeparators={[',']}
              maxCount={2}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { label: '未变化', value: 'unchanged' },
                { label: '已变化', value: 'changed' },
                { label: '未知', value: 'unknown' },
              ]}
            />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setAddLineModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑线弹窗 */}
      <Modal
        title="编辑线"
        open={editLineModalOpen}
        onCancel={() => { setEditLineModalOpen(false); setEditingLine(null); }}
        footer={null}
      >
        <Form form={editLineForm} layout="vertical" onFinish={handleEditLine}>
          <Form.Item name="startPointId" label="起点 ID" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="选择起点"
              optionFilterProp="label"
              options={points.map(p => ({
                label: p.heart.名字 || p._id,
                value: p._id,
              }))}
            />
          </Form.Item>
          <Form.Item name="endPointId" label="终点 ID" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="选择终点"
              optionFilterProp="label"
              options={points.map(p => ({
                label: p.heart.名字 || p._id,
                value: p._id,
              }))}
            />
          </Form.Item>
          <Form.Item name="relations" label="关系描述">
            <Select
              mode="tags"
              placeholder="输入关系描述后按回车添加"
              tokenSeparators={[',']}
              maxCount={2}
            />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { label: '未变化', value: 'unchanged' },
                { label: '已变化', value: 'changed' },
                { label: '未知', value: 'unknown' },
              ]}
            />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => { setEditLineModalOpen(false); setEditingLine(null); }}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加组弹窗 */}
      <Modal
        title="添加组"
        open={addGroupModalOpen}
        onCancel={() => setAddGroupModalOpen(false)}
        footer={null}
      >
        <Form form={addGroupForm} layout="vertical" onFinish={handleAddGroup}>
          <Form.Item name="name" label="name" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="color" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="status" label="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { label: '未变化', value: 'unchanged' },
                { label: '已变化', value: 'changed' },
                { label: '未知', value: 'unknown' },
              ]}
            />
          </Form.Item>
          <Form.Item name="parent" label="parent">
            <Select
              allowClear
              showSearch
              placeholder="选择父组（可选）"
              options={groups.map(g => ({
                label: g.name,
                value: g._id,
              }))}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setAddGroupModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑组弹窗 */}
      <Modal
        title="编辑组"
        open={editGroupModalOpen}
        onCancel={() => { setEditGroupModalOpen(false); setEditingGroup(null); }}
        footer={null}
      >
        <Form form={editGroupForm} layout="vertical" onFinish={handleEditGroup}>
          <Form.Item name="name" label="name" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="color" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="status" label="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select
              options={[
                { label: '未变化', value: 'unchanged' },
                { label: '已变化', value: 'changed' },
                { label: '未知', value: 'unknown' },
              ]}
            />
          </Form.Item>
          <Form.Item name="parent" label="parent">
            <Select
              allowClear
              showSearch
              placeholder="选择父组（可选）"
              options={groups.map(g => ({
                label: g.name,
                value: g._id,
              }))}
            />
          </Form.Item>
          {editingGroup?.parent && (
            <Form.Item>
              <Button
                type="link"
                onClick={() => {
                  const parentGroup = groups.find(g => g._id === editingGroup.parent);
                  if (parentGroup) {
                    setEditGroupModalOpen(false);
                    handleOpenEditGroupModal(parentGroup);
                  } else {
                    message.warning('找不到父组');
                  }
                }}
              >
                进入父组编辑页
              </Button>
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button onClick={() => { setEditGroupModalOpen(false); setEditingGroup(null); }}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button
                danger
                onClick={async () => {
                  if (!editingGroup) return;
                  try {
                    await onDeleteGroup(editingGroup._id);
                    message.success('组删除成功');
                    setEditGroupModalOpen(false);
                    setEditingGroup(null);
                  } catch (error) {
                    console.error('删除组失败:', error);
                    message.error('删除组失败');
                  }
                }}
              >
                删除组
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
