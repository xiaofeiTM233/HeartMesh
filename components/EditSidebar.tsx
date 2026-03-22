// components/EditSidebar.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Form, Input, Button, Select, Collapse, Tag, Space, App, Drawer, Modal, Divider, Empty, ColorPicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, FolderOutlined, LogoutOutlined } from '@ant-design/icons';
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
  onCreateLine: (data: { startPointId: string; endPointId: string; relations?: string[] }) => Promise<void>;
  onCreateGroup: (data: { name: string; color: string; status?: string }) => Promise<GroupData | null>;
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

  // 更新表单值
  useEffect(() => {
    if (selectedPoint) {
      form.setFieldsValue({
        name: selectedPoint.heart.名字 || '',
      });
    }
  }, [selectedPoint, form]);

  // 关闭抽屉
  const handleClose = () => {
    setDrawerOpen(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 处理点编辑表单提交
  const handlePointSubmit = async (values: { name?: string }) => {
    if (!selectedPoint) return;

    // 如果是新建点（ID为空），先创建
    if (!selectedPoint._id) {
      try {
        await onCreatePoint({
          ...selectedPoint,
          heart: {
            ...selectedPoint.heart,
            名字: values.name || selectedPoint.heart.名字,
          },
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
      await onUpdatePoint(selectedPoint, {
        heart: {
          ...selectedPoint.heart,
          名字: values.name || selectedPoint.heart.名字,
        },
      });
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

  const handleAddLine = async (values: { endPointId: string; relations?: string[] }) => {
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
        relations: values.relations || [`${selectedPoint.heart.名字} → ${points.find(p => p._id === values.endPointId)?.heart.名字 || values.endPointId}`],
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
    });
    setEditLineModalOpen(true);
  };

  const handleEditLine = async (values: { startPointId: string; endPointId: string; relations?: string[] }) => {
    if (!editingLine) return;
    try {
      await onUpdateLine(editingLine, {
        points: [values.startPointId, values.endPointId],
        relations: values.relations || editingLine.relations,
        status: editingLine.status,
        color: editingLine.color,
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
    addGroupForm.setFieldsValue({ color: '#3b82f6' });
    setAddGroupModalOpen(true);
  };

  const handleAddGroup = async (values: { name: string; color: string }) => {
    try {
      const newGroup = await onCreateGroup({
        name: values.name,
        color: values.color,
        status: 'unchanged',
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
    });
    setEditGroupModalOpen(true);
  };

  const handleEditGroup = async (values: { name: string; color: string }) => {
    if (!editingGroup) return;
    try {
      await onUpdateGroup(editingGroup, {
        name: values.name,
        color: values.color,
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
                  <span className="text-gray-500 text-sm ml-2">坐标:</span>
                  <Tag color="green">({selectedPoint.position.x}, {selectedPoint.position.y})</Tag>
                </div>
              </div>

              <Form.Item name="name" label="名字">
                <Input placeholder="请输入名字" />
              </Form.Item>

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
                                  <Tag color="blue">{line._id}</Tag>
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
        <Form form={addLineForm} layout="vertical" onFinish={handleAddLine}>
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
            <Input placeholder="请输入关系描述（可选）" />
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
            <Input placeholder="请输入关系描述（可选）" />
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
          <Form.Item name="name" label="组名称" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
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
          <Form.Item name="name" label="组名称" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
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
