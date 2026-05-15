// app/groups/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Tree, Button, Modal, Form, Input, Select, ColorPicker, Space, Popconfirm, Tag, App, Spin, Typography, Tooltip, Empty, message } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  ArrowRightOutlined,

} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { GroupData, PointData } from '@/models/types';

const { Text, Title } = Typography;

interface TreeNodeData extends DataNode {
  group: GroupData;
  children?: TreeNodeData[];
}

export default function GroupsPage() {
  const { modal: modalApi } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [points, setPoints] = useState<PointData[]>([]);

  // 弹窗状态
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);
  const [parentGroupId, setParentGroupId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 展开/选中状态
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const result = await res.json();
      if (result.success) {
        setGroups(result.data.groups);
        setPoints(result.data.points);
      } else {
        message.error(result.message || '获取数据失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 构建树形结构
  const buildTree = useCallback((groupList: GroupData[]): TreeNodeData[] => {
    const map = new Map<string, TreeNodeData>();
    const roots: TreeNodeData[] = [];

    groupList.forEach(g => {
      map.set(g._id, {
        key: g._id,
        title: g.name,
        group: g,
        children: [],
      });
    });

    groupList.forEach(g => {
      const node = map.get(g._id)!;
      if (g.parent && map.has(g.parent)) {
        map.get(g.parent)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    // 排序：先按名称排序
    const sortNodes = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.sort((a, b) => a.group.name.localeCompare(b.group.name, 'zh-CN'))
        .map(n => ({ ...n, children: n.children?.length ? sortNodes(n.children) : [] }));
    };

    return sortNodes(roots);
  }, []);

  const treeData = useMemo(() => buildTree(groups), [groups, buildTree]);

  useEffect(() => {
    if (treeData.length > 0 && expandedKeys.length === 0) {
      setExpandedKeys(treeData.map(n => n.key));
    }
  }, [treeData]);

  // 获取组的成员点信息
  const getPointNames = useCallback((pointIds: string[]) => {
    return pointIds.map(pid => {
      const p = points.find(p => p._id === pid);
      return p ? p.heart.名字 || pid.slice(-4) : pid.slice(-4);
    });
  }, [points]);

  // 获取组在树中的路径
  const getGroupPath = useCallback((groupId: string): string[] => {
    const path: string[] = [];
    let current: GroupData | undefined = groups.find(g => g._id === groupId);
    while (current) {
      path.unshift(current.name);
      current = groups.find(g => g._id === current!.parent);
    }
    return path;
  }, [groups]);

  // API 操作
  const createGroup = useCallback(async (data: Record<string, unknown>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group', action: 'create', data }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '创建失败');
    return result.data;
  }, []);

  const updateGroup = useCallback(async (id: string, data: Record<string, unknown>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group', action: 'update', id, data }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '更新失败');
    return result.data;
  }, []);

  const deleteGroup = useCallback(async (id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'group', action: 'delete', id }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '删除失败');
    return result.data;
  }, []);

  // 打开创建弹窗
  const openCreateModal = useCallback((parentId?: string | null) => {
    setModalMode('create');
    setEditingGroup(null);
    setParentGroupId(parentId ?? null);
    form.resetFields();
    form.setFieldsValue({
      color: '#3b82f6',
      status: 'unchanged',
      parent: parentId ?? null,
    });
    setModalVisible(true);
  }, [form]);

  // 打开编辑弹窗
  const openEditModal = useCallback((group: GroupData) => {
    setModalMode('edit');
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      color: group.color,
      status: group.status,
      parent: group.parent,
    });
    setModalVisible(true);
  }, [form]);

  // 提交表单
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      // ColorPicker 返回的是 Color 对象，需要转为 hex 字符串
      if (values.color && typeof values.color === 'object' && values.color.toHexString) {
        values.color = values.color.toHexString();
      }
      if (modalMode === 'create') {
        await createGroup(values);
        message.success('创建成功');
      } else if (editingGroup) {
        await updateGroup(editingGroup._id, values);
        message.success('更新成功');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    }
  }, [form, modalMode, editingGroup, createGroup, updateGroup, fetchData]);

  // 删除组
  const handleDelete = useCallback((group: GroupData) => {
    // 检查是否有子组
    const childGroups = groups.filter(g => g.parent === group._id);
    if (childGroups.length > 0) {
      modalApi.warning({
        title: '无法删除',
        content: `该组下还有 ${childGroups.length} 个子组，请先移动或删除子组后再操作。`,
      });
      return;
    }

    modalApi.confirm({
      title: '确认删除',
      content: (
        <div>
          <p>确定要删除组 <Text strong style={{ color: group.color }}>{group.name}</Text> 吗？</p>
          {group.points.length > 0 && (
            <p className="text-yellow-600 mt-2">
              该组关联了 {group.points.length} 个点，删除后这些点的阵营引用将失效。
            </p>
          )}
        </div>
      ),
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteGroup(group._id);
          message.success('删除成功');
          fetchData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '删除失败');
        }
      },
    });
  }, [groups, deleteGroup, fetchData, modalApi]);

  // 移动组到新的父节点
  const handleMoveGroup = useCallback((group: GroupData, newParentId: string | null) => {
    // 阻止将组移动到自己的子组中
    if (newParentId) {
      let checkId: string | null = newParentId;
      while (checkId) {
        if (checkId === group._id) {
          message.warning('不能将组移动到自己的子组中');
          return;
        }
        const parentGroup = groups.find(g => g._id === checkId);
        checkId = parentGroup?.parent ?? null;
      }
    }

    modalApi.confirm({
      title: '确认移动',
      content: (
        <div>
          <p>将 <Text strong style={{ color: group.color }}>{group.name}</Text></p>
          {newParentId ? (
            <p>移动到 <Text strong>{groups.find(g => g._id === newParentId)?.name}</Text> 下</p>
          ) : (
            <p>提升为顶级组</p>
          )}
        </div>
      ),
      onOk: async () => {
        try {
          await updateGroup(group._id, { parent: newParentId });
          message.success('移动成功');
          fetchData();
        } catch (err) {
          message.error(err instanceof Error ? err.message : '移动失败');
        }
      },
    });
  }, [groups, updateGroup, fetchData, modalApi]);

  // 自定义渲染树节点
  const renderTreeNode = useCallback((node: TreeNodeData): DataNode => {
    const { group } = node;

    return {
      ...node,
      icon: node.children?.length
        ? (expandedKeys.includes(node.key as string) ? <FolderOpenOutlined /> : <FolderOutlined />)
        : <FolderOutlined />,
      title: (
        <div className="flex items-center justify-between w-full group-node py-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: group.color }}
            />
            <Text
              ellipsis={{ tooltip: group.name }}
              className="font-medium"
              style={{ maxWidth: 180 }}
            >
              {group.name}
            </Text>
            <Tag
              color={
                group.status === 'unchanged' ? 'green' :
                group.status === 'changed' ? 'orange' : 'default'
              }
              className="flex-shrink-0 text-xs"
            >
              {group.status === 'unchanged' ? '未变化' :
               group.status === 'changed' ? '已变化' : '未知'}
            </Tag>
            <Tag className="flex-shrink-0 text-xs">
              {group.points?.length || 0} 点
            </Tag>
          </div>

          {/* 操作按钮 */}
          <Space size={2} className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="添加子组">
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openCreateModal(group._id);
                }}
              />
            </Tooltip>
            <Tooltip title="编辑">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(group);
                }}
              />
            </Tooltip>
            <Tooltip title="移动">
              <Select
                size="small"
                variant="borderless"
                value={undefined}
                placeholder={<ArrowRightOutlined />}
                popupMatchSelectWidth={200}
                options={[
                  { label: '【提升为顶级】', value: '__root__' },
                  ...groups
                    .filter(g => g._id !== group._id && g.parent !== group._id)
                    .map(g => ({
                      label: `${getGroupPath(g._id).join(' / ')}`,
                      value: g._id,
                    })),
                ]}
                onChange={(value) => {
                  handleMoveGroup(group, value === '__root__' ? null : (value ?? null));
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 28 }}
              />
            </Tooltip>
            <Tooltip title="删除">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(group);
                }}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      children: node.children?.map(child => renderTreeNode(child)),
    };
  }, [expandedKeys, groups, getGroupPath, openCreateModal, openEditModal, handleDelete, handleMoveGroup]);

  // 渲染选中的组详情
  const selectedGroup = useMemo(
    () => groups.find(g => g._id === selectedKey),
    [groups, selectedKey]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <Title level={4} className="!mb-0">分组管理</Title>
          <Text type="secondary">共 {groups.length} 个分组</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openCreateModal()}
        >
          新建分组
        </Button>
      </div>

      {/* 主内容 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧树 */}
        <Card
          className="m-3 flex-1 overflow-auto"
          styles={{ body: { padding: '12px 16px' } }}
        >
          {treeData.length > 0 ? (
            <Tree
              treeData={treeData.map(renderTreeNode)}
              expandedKeys={expandedKeys}
              selectedKeys={selectedKey ? [selectedKey] : []}
              onExpand={(keys) => setExpandedKeys(keys)}
              onSelect={(keys) => setSelectedKey(keys[0] ?? null)}
              showIcon
              blockNode
              defaultExpandAll
            />
          ) : (
            <Empty description="暂无分组" className="py-12">
              <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreateModal()}>
                创建第一个分组
              </Button>
            </Empty>
          )}
        </Card>

        {/* 右侧详情面板 */}
        <Card
          className={`m-3 ml-0 transition-all duration-300 ${selectedGroup ? 'w-[420px]' : 'w-0 !p-0 !overflow-hidden'}`}
          title={
            selectedGroup ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded" style={{ backgroundColor: selectedGroup.color }} />
                <span>{selectedGroup.name}</span>
              </div>
            ) : undefined
          }
          extra={
            selectedGroup ? (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(selectedGroup)}>
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除?"
                  onConfirm={() => handleDelete(selectedGroup)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ) : undefined
          }
        >
          {selectedGroup && (
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Text type="secondary" className="text-xs">ID</Text>
                  <div><Text copyable className="text-xs">{selectedGroup._id}</Text></div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs">状态</Text>
                  <div>
                    <Tag
                      color={
                        selectedGroup.status === 'unchanged' ? 'green' :
                        selectedGroup.status === 'changed' ? 'orange' : 'default'
                      }
                    >
                      {selectedGroup.status}
                    </Tag>
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs">颜色</Text>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-5 h-5 rounded border" style={{ backgroundColor: selectedGroup.color }} />
                    <Text code>{selectedGroup.color}</Text>
                  </div>
                </div>
                <div>
                  <Text type="secondary" className="text-xs">父组</Text>
                  <div>
                    {selectedGroup.parent ? (
                      <>
                        <Text>{groups.find(g => g._id === selectedGroup.parent)?.name}</Text>
                        <Button
                          type="link"
                          size="small"
                          className="-ml-2"
                          onClick={() => {
                            setSelectedKey(selectedGroup.parent);
                            if (!expandedKeys.includes(selectedGroup.parent!)) {
                              setExpandedKeys([...expandedKeys, selectedGroup.parent!]);
                            }
                          }}
                        >
                          查看
                        </Button>
                      </>
                    ) : (
                      <Text type="secondary">(顶级)</Text>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <Text type="secondary" className="text-xs">路径</Text>
                  <div className="mt-0.5">
                    {getGroupPath(selectedGroup._id).map((name, i) => (
                      <span key={i}>
                        {i > 0 && <ArrowRightOutlined className="mx-1 text-gray-300" />}
                        <Text>{name}</Text>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 子组列表 */}
              {(() => {
                const children = groups.filter(g => g.parent === selectedGroup._id);
                if (children.length === 0) return null;
                return (
                  <div>
                    <Text strong className="text-sm">子组 ({children.length})</Text>
                    <div className="mt-2 space-y-1 max-h-[160px] overflow-y-auto">
                      {children.map(c => (
                        <div
                          key={c._id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedKey(c._id)}
                        >
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                          <Text ellipsis className="flex-1">{c.name}</Text>
                          <Tag className="m-0 text-xs" color="blue">{c.points?.length || 0}</Tag>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 成员点列表 */}
              <div>
                <Text strong className="text-sm">
                  关联成员 ({selectedGroup.points?.length || 0})
                </Text>
                {selectedGroup.points?.length > 0 ? (
                  <div className="mt-2 space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                    {selectedGroup.points.map(pid => {
                      const pt = points.find(p => p._id === pid);
                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        >
                          {pt?.mesh?.themeColor && (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pt.mesh.themeColor }} />
                          )}
                          <Text ellipsis className="flex-1" style={{ maxWidth: 240 }}>
                            {pt?.heart?.名字 || pid.slice(-6)}
                          </Text>
                          {pt?.heart?.关系 && (
                            <Tag className="m-0 text-xs" color="processing">{pt.heart.关系}</Tag>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 text-center text-gray-400 text-sm py-3">
                    暂无关联成员
                  </div>
                )}
              </div>

              {/* 时间信息 */}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <Text type="secondary">创建时间</Text>
                  <Text>{new Date(selectedGroup.createdAt).toLocaleString()}</Text>
                </div>
                <div className="flex justify-between text-xs">
                  <Text type="secondary">更新时间</Text>
                  <Text>{new Date(selectedGroup.updatedAt).toLocaleString()}</Text>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* 创建/编辑弹窗 */}
      <Modal
        title={modalMode === 'create' ? (parentGroupId ? '创建子组' : '创建分组') : '编辑分组'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText={modalMode === 'create' ? '创建' : '保存'}
        width={480}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="分组名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="请输入分组名称" showCount maxLength={50} />
          </Form.Item>

          <Form.Item name="color" label="颜色" rules={[{ required: true }]}>
            <ColorPicker format="hex" presets={[
              { label: '推荐', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'] },
              { label: '暖色系', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#dc2626'] },
              { label: '冷色系', colors: ['#3b82f6', '#06b6d4', '#0891b2', '#2563eb', '#7c3aed'] },
            ]} />
          </Form.Item>

          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '未变化', value: 'unchanged' },
                { label: '已变化', value: 'changed' },
                { label: '未知', value: 'unknown' },
              ]}
            />
          </Form.Item>

          <Form.Item name="parent" label="父分组">
            <Select
              allowClear
              showSearch
              placeholder="选择父分组（不选则为顶级）"
              optionFilterProp="label"
              options={[
                { label: '【顶级分组】', value: '__root_null__' },
                ...groups
                  .filter(g => !editingGroup || g._id !== editingGroup._id)
                  .filter(g => !editingGroup || g.parent !== editingGroup._id)
                  .map(g => ({
                    label: `${getGroupPath(g._id).join(' / ')}`,
                    value: g._id,
                  })),
              ]}
              onChange={(val) => {
                if (val === '__root_null__') {
                  form.setFieldValue('parent', null);
                }
              }}
              popupRender={menu => (
                <div>
                  {menu}
                  <div className="border-t mt-1 pt-1">
                    <Button
                      type="link"
                      size="small"
                      icon={<PlusOutlined />}
                      block
                      onClick={() => {
                        setModalVisible(false);
                        setTimeout(() => openCreateModal(null), 100);
                      }}
                    >
                      先新建一个父组
                    </Button>
                  </div>
                </div>
              )}
            />
          </Form.Item>

          {editingGroup && (
            <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
              ID: {editingGroup._id}
            </div>
          )}

          {parentGroupId && modalMode === 'create' && (
            <div className="bg-blue-50 p-3 rounded text-sm">
              将作为 <Text strong>{groups.find(g => g._id === parentGroupId)?.name}</Text> 的子组
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}
