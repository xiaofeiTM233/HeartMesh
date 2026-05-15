// app/points/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Spin, Card, App, Typography, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import Form from 'antd/es/form';
import PointEditForm from '@/components/PointEditForm';
import type { PointData, LineData, GroupData } from '@/models/types';

const { Title } = Typography;

export default function PointEditPage() {
  const router = useRouter();
  const params = useParams();
  const pointId = params.id as string;
  const { message } = App.useApp();

  const [loading, setLoading] = useState(true);
  const [point, setPoint] = useState<PointData | null>(null);
  const [points, setPoints] = useState<PointData[]>([]);
  const [lines, setLines] = useState<LineData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [form] = Form.useForm();

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const result = await res.json();
      if (result.success) {
        setPoints(result.data.points);
        setLines(result.data.lines);
        setGroups(result.data.groups);

        // 找到当前编辑的点
        const foundPoint = result.data.points.find((p: PointData) => p._id === pointId);
        if (foundPoint) {
          setPoint(foundPoint);
        } else {
          message.error('未找到该点数据');
          router.push('/table');
          return;
        }
      } else {
        message.error(result.message || '获取数据失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLoading(false);
    }
  }, [pointId, message, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // API 操作封装
  const apiRequest = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || '操作失败');
    return result.data;
  }, []);

  const handleUpdatePoint = useCallback(async (p: PointData, data: Partial<PointData>) => {
    return apiRequest({ type: 'point', action: 'update', id: p._id, data });
  }, [apiRequest]);

  const handleUpdateLine = useCallback(async (line: LineData, data: Partial<LineData>) => {
    return apiRequest({ type: 'line', action: 'update', id: line._id, data });
  }, [apiRequest]);

  const handleUpdateGroup = useCallback(async (group: GroupData, data: Partial<GroupData>) => {
    return apiRequest({ type: 'group', action: 'update', id: group._id, data });
  }, [apiRequest]);

  const handleCreateLine = useCallback(async (data: Record<string, unknown>) => {
    return apiRequest({ type: 'line', action: 'create', data });
  }, [apiRequest]);

  const handleCreateGroup = useCallback(async (data: Record<string, unknown>) => {
    return apiRequest({ type: 'group', action: 'create', data });
  }, [apiRequest]);

  const handleDeletePoint = useCallback(async (pid: string) => {
    return apiRequest({ type: 'point', action: 'delete', id: pid });
  }, [apiRequest]);

  const handleDeleteLine = useCallback(async (lid: string) => {
    return apiRequest({ type: 'line', action: 'delete', id: lid });
  }, [apiRequest]);

  const handleDeleteGroup = useCallback(async (gid: string) => {
    return apiRequest({ type: 'group', action: 'delete', id: gid });
  }, [apiRequest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" description="加载中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4 shadow-sm">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push('/table')}>
          返回列表
        </Button>
        <Title level={4} className="!mb-0">
          编辑人物 - {point?.heart.名字 || pointId.slice(-6)}
        </Title>
      </div>

      {/* 表单内容 */}
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <PointEditForm
            point={point}
            points={points}
            lines={lines}
            groups={groups}
            form={form}
            mode="page"
            onUpdatePoint={handleUpdatePoint}
            onUpdateLine={handleUpdateLine}
            onUpdateGroup={handleUpdateGroup}
            onCreatePoint={() => Promise.resolve()}
            onCreateLine={handleCreateLine}
            onCreateGroup={handleCreateGroup}
            onDeletePoint={handleDeletePoint}
            onDeleteLine={handleDeleteLine}
            onDeleteGroup={handleDeleteGroup}
            onSaved={() => {
              fetchData(); // 刷新数据
              message.success('保存成功');
            }}
          />
        </Card>
      </div>
    </div>
  );
}
