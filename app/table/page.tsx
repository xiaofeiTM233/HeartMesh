// app/table/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, Card, Spin, App, Popconfirm } from 'antd';
import { EditableProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import type { PointData } from '@/models/Point';
import type { LineData } from '@/models/Line';
import type { GroupData } from '@/models/Group';

type DataSource = {
  points: PointData[];
  lines: LineData[];
  groups: GroupData[];
};

export default function TablePage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>({
    points: [],
    lines: [],
    groups: [],
  });

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const result = await res.json();
      if (result.success) {
        setDataSource(result.data);
      } else {
        message.error(result.message || '获取数据失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // API 操作
  const createRecord = useCallback(async (type: 'point' | 'line' | 'group', data: Record<string, unknown>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'create', data }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '创建失败');
    return result.data;
  }, []);

  const updateRecord = useCallback(async (type: 'point' | 'line' | 'group', id: string, data: Record<string, unknown>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'update', id, data }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '更新失败');
    return result.data;
  }, []);

  const deleteRecord = useCallback(async (type: 'point' | 'line' | 'group', id: string) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'delete', id }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '删除失败');
    return result.data;
  }, []);

  // Point 列定义
  const pointColumns = useMemo<ProColumns<PointData>[]>(() => [
    { title: 'ID', dataIndex: '_id', width: 80, editable: false, copyable: true },
    { title: '名字', dataIndex: ['heart', '名字'], width: 100, formItemProps: { rules: [{ required: true, message: '请输入名字' }] } },
    { title: 'X坐标', dataIndex: ['position', 'x'], width: 80, valueType: 'digit', formItemProps: { rules: [{ required: true, message: '请输入X坐标' }] } },
    { title: 'Y坐标', dataIndex: ['position', 'y'], width: 80, valueType: 'digit', formItemProps: { rules: [{ required: true, message: '请输入Y坐标' }] } },
    { title: '性别', dataIndex: ['heart', '性别'], width: 100, valueEnum: { 男: { text: '男' }, 女: { text: '女' } } },
    { title: '关系', dataIndex: ['heart', '关系'], width: 100 },
    { title: '辈分', dataIndex: ['heart', '辈分'], width: 80 },
    { title: '身份', dataIndex: ['heart', '身份'], width: 100 },
    { title: '称呼', dataIndex: ['heart', '称呼'], width: 80 },
    { title: '阵营', dataIndex: ['heart', '阵营'], width: 100 },
    { title: '生日', dataIndex: ['heart', '生日'], width: 120, valueType: 'date' },
    { title: '初识', dataIndex: ['heart', '初识'], width: 120, valueType: 'date' },
    { title: '备注', dataIndex: ['heart', '备注'], width: 200, valueType: 'textarea' },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record, index, action) => [
        <a key="edit" onClick={() => action?.startEditable?.(record._id)}>编辑</a>,
        <Popconfirm
          key="delete"
          title="确定删除?"
          onConfirm={async () => {
            try {
              await deleteRecord('point', record._id);
              message.success('删除成功');
              fetchData();
            } catch (err) {
              message.error(err instanceof Error ? err.message : '删除失败');
            }
          }}
        >
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ], [deleteRecord, fetchData, message]);

  // Line 列定义
  const lineColumns = useMemo<ProColumns<LineData>[]>(() => [
    { title: 'ID', dataIndex: '_id', width: 80, editable: false, copyable: true },
    { title: '点1', dataIndex: ['points', 0], width: 120, formItemProps: { rules: [{ required: true, message: '请输入点1的ID' }] } },
    { title: '点2', dataIndex: ['points', 1], width: 120, formItemProps: { rules: [{ required: true, message: '请输入点2的ID' }] } },
    { title: '关系1', dataIndex: ['relations', 0], width: 120, formItemProps: { rules: [{ required: true, message: '请输入关系描述' }] } },
    { title: '关系2', dataIndex: ['relations', 1], width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        unchanged: { text: '未改变', status: 'Default' },
        changed: { text: '已改变', status: 'Warning' },
        unknown: { text: '未知', status: 'Error' },
      },
      formItemProps: { rules: [{ required: true, message: '请选择状态' }] },
    },
    { title: '颜色', dataIndex: 'color', width: 100, valueType: 'color', formItemProps: { rules: [{ required: true, message: '请选择颜色' }] } },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record, index, action) => [
        <a key="edit" onClick={() => action?.startEditable?.(record._id)}>编辑</a>,
        <Popconfirm
          key="delete"
          title="确定删除?"
          onConfirm={async () => {
            try {
              await deleteRecord('line', record._id);
              message.success('删除成功');
              fetchData();
            } catch (err) {
              message.error(err instanceof Error ? err.message : '删除失败');
            }
          }}
        >
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ], [deleteRecord, fetchData, message]);

  // Group 列定义
  const groupColumns = useMemo<ProColumns<GroupData>[]>(() => [
    { title: 'ID', dataIndex: '_id', width: 80, editable: false, copyable: true },
    { title: '名称', dataIndex: 'name', width: 150, formItemProps: { rules: [{ required: true, message: '请输入名称' }] } },
    { title: '颜色', dataIndex: 'color', width: 100, valueType: 'color', formItemProps: { rules: [{ required: true, message: '请选择颜色' }] } },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        unchanged: { text: '未改变', status: 'Default' },
        changed: { text: '已改变', status: 'Warning' },
        unknown: { text: '未知', status: 'Error' },
      },
      formItemProps: { rules: [{ required: true, message: '请选择状态' }] },
    },
    { title: '父分组', dataIndex: 'parent', width: 120 },
    { title: '包含点', dataIndex: 'points', width: 200, render: (_, record) => record.points?.join(', ') || '-' },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record, index, action) => [
        <a key="edit" onClick={() => action?.startEditable?.(record._id)}>编辑</a>,
        <Popconfirm
          key="delete"
          title="确定删除?"
          onConfirm={async () => {
            try {
              await deleteRecord('group', record._id);
              message.success('删除成功');
              fetchData();
            } catch (err) {
              message.error(err instanceof Error ? err.message : '删除失败');
            }
          }}
        >
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ], [deleteRecord, fetchData, message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card>
        <Tabs
          defaultActiveKey="points"
          items={[
            {
              key: 'points',
              label: `人物 (${dataSource.points.length})`,
              children: (
                <EditableProTable<PointData>
                  rowKey="_id"
                  columns={pointColumns}
                  value={dataSource.points}
                  recordCreatorProps={{
                    record: () => ({
                      _id: `temp_${Date.now()}`,
                      position: { x: 0, y: 0 },
                      heart: {
                        名字: '',
                        头像: [],
                        外号: [],
                        性别: null,
                        生日: null,
                        关系: null,
                        辈分: null,
                        身份: null,
                        初识: null,
                        联系: null,
                        联系方式: [],
                        称呼: null,
                        阵营: null,
                        标签: [],
                        备注: '',
                      },
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    } as PointData),
                  }}
                  editable={{
                    type: 'multiple',
                    actionRender: (row, config, defaultDom) => [
                      defaultDom.save,
                      defaultDom.cancel,
                      defaultDom.delete,
                    ],
                    onSave: async (rowKey, data) => {
                      const id = rowKey as string;
                      const isNew = id.startsWith('temp_');
                      const updateData = { position: data.position, heart: data.heart };
                      if (isNew) {
                        await createRecord('point', updateData);
                      } else {
                        await updateRecord('point', id, updateData);
                      }
                      message.success('保存成功');
                      fetchData();
                    },
                    onDelete: async (rowKey) => {
                      const id = rowKey as string;
                      if (!id.startsWith('temp_')) {
                        await deleteRecord('point', id);
                        message.success('删除成功');
                        fetchData();
                      }
                    },
                  }}
                  search={false}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1600 }}
                />
              ),
            },
            {
              key: 'lines',
              label: `连线 (${dataSource.lines.length})`,
              children: (
                <EditableProTable<LineData>
                  rowKey="_id"
                  columns={lineColumns}
                  value={dataSource.lines}
                  recordCreatorProps={{
                    record: () => ({
                      _id: `temp_${Date.now()}`,
                      points: ['', ''],
                      relations: [''],
                      status: 'unchanged',
                      color: '#808080',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    } as LineData),
                  }}
                  editable={{
                    type: 'multiple',
                    actionRender: (row, config, defaultDom) => [
                      defaultDom.save,
                      defaultDom.cancel,
                      defaultDom.delete,
                    ],
                    onSave: async (rowKey, data) => {
                      const id = rowKey as string;
                      const isNew = id.startsWith('temp_');
                      const updateData = { points: data.points, relations: data.relations, status: data.status, color: data.color };
                      if (isNew) {
                        await createRecord('line', updateData);
                      } else {
                        await updateRecord('line', id, updateData);
                      }
                      message.success('保存成功');
                      fetchData();
                    },
                    onDelete: async (rowKey) => {
                      const id = rowKey as string;
                      if (!id.startsWith('temp_')) {
                        await deleteRecord('line', id);
                        message.success('删除成功');
                        fetchData();
                      }
                    },
                  }}
                  search={false}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1200 }}
                />
              ),
            },
            {
              key: 'groups',
              label: `分组 (${dataSource.groups.length})`,
              children: (
                <EditableProTable<GroupData>
                  rowKey="_id"
                  columns={groupColumns}
                  value={dataSource.groups}
                  recordCreatorProps={{
                    record: () => ({
                      _id: `temp_${Date.now()}`,
                      name: '',
                      color: '#3b82f6',
                      status: 'unchanged',
                      parent: null,
                      points: [],
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    } as GroupData),
                  }}
                  editable={{
                    type: 'multiple',
                    actionRender: (row, config, defaultDom) => [
                      defaultDom.save,
                      defaultDom.cancel,
                      defaultDom.delete,
                    ],
                    onSave: async (rowKey, data) => {
                      const id = rowKey as string;
                      const isNew = id.startsWith('temp_');
                      const updateData = { name: data.name, color: data.color, status: data.status, parent: data.parent, points: data.points };
                      if (isNew) {
                        await createRecord('group', updateData);
                      } else {
                        await updateRecord('group', id, updateData);
                      }
                      message.success('保存成功');
                      fetchData();
                    },
                    onDelete: async (rowKey) => {
                      const id = rowKey as string;
                      if (!id.startsWith('temp_')) {
                        await deleteRecord('group', id);
                        message.success('删除成功');
                        fetchData();
                      }
                    },
                  }}
                  search={false}
                  pagination={{ pageSize: 10 }}
                  scroll={{ x: 1100 }}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
