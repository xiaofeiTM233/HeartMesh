// app/tags/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Table, Tag as AntTag, Spin, App, Input, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { PointData } from '@/models/types';

const { Text } = Typography;
const { Search } = Input;

interface AggregatedTag {
  name: string;
  points: Array<{
    pointId: string;
    pointName: string;
    pointRelation: string;
    pointCamp: string;
    status: string;
    timestamp: number;
  }>;
  count: number;
}

export default function TagsPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<PointData[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // 获取数据
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data');
      const result = await res.json();
      if (result.success) {
        setPoints(result.data.points || []);
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

  // 聚合标签
  const aggregatedTags = useMemo<AggregatedTag[]>(() => {
    const tagMap = new Map<string, AggregatedTag>();
    points.forEach(point => {
      (point.heart.标签 || []).forEach(tag => {
        if (!tagMap.has(tag.name)) {
          tagMap.set(tag.name, { name: tag.name, points: [], count: 0 });
        }
        const aggregated = tagMap.get(tag.name)!;
        aggregated.points.push({
          pointId: point._id,
          pointName: point.heart.名字,
          pointRelation: point.heart.关系,
          pointCamp: point.heart.阵营,
          status: tag.status,
          timestamp: tag.timestamp,
        });
        aggregated.count++;
      });
    });
    return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
  }, [points]);

  // 过滤后的聚合标签
  const filteredAggregatedTags = useMemo(() => {
    let result = aggregatedTags;
    if (searchText) {
      result = result.filter(tag =>
        tag.name.toLowerCase().includes(searchText.toLowerCase()) ||
        tag.points.some(p => p.pointName.includes(searchText))
      );
    }
    if (statusFilter) {
      result = result.filter(tag =>
        tag.points.some(p => p.status === statusFilter)
      );
    }
    return result;
  }, [aggregatedTags, searchText, statusFilter]);

  // 列定义
  const columns: ColumnsType<AggregatedTag> = useMemo(() => [
    {
      title: '标签名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      fixed: 'left',
      render: (name: string) => <AntTag color="blue">{name}</AntTag>,
    },
    {
      title: '关联人数',
      dataIndex: 'count',
      key: 'count',
      width: 100,
      sorter: (a, b) => a.count - b.count,
      render: (count: number) => <Text strong>{count}</Text>,
    },
    {
      title: '关联人物',
      dataIndex: 'points',
      key: 'points',
      render: (_: unknown, record: AggregatedTag) => (
        <Space size={[4, 4]} wrap>
          {record.points.map((p, idx) => (
            <AntTag
              key={`${p.pointId}-${idx}`}
              color={p.status === 'unchanged' ? 'default' : p.status === 'changed' ? 'warning' : 'error'}
              style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/points/${p.pointId}`)}
            >
              {p.pointName}
            </AntTag>
          ))}
        </Space>
      ),
    },
  ], [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Card
        title={`标签管理 (共 ${filteredAggregatedTags.length} 个标签)`}
        extra={
          <Space>
            <Select
              allowClear
              placeholder="状态筛选"
              style={{ width: 120 }}
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'unchanged', label: '未改变' },
                { value: 'changed', label: '已改变' },
                { value: 'unknown', label: '未知' },
              ]}
            />
            <Search
              placeholder="搜索标签或人物"
              allowClear
              style={{ width: 200 }}
              onSearch={setSearchText}
              onChange={e => !e.target.value && setSearchText('')}
            />
          </Space>
        }
      >
        <Table<AggregatedTag>
          rowKey="name"
          columns={columns}
          dataSource={filteredAggregatedTags}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 800 }}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                rowKey="pointId"
                columns={[
                  {
                    title: '人物',
                    dataIndex: 'pointName',
                    render: (name: string, p: typeof record.points[0]) => (
                      <a onClick={() => router.push(`/points/${p.pointId}`)} style={{ cursor: 'pointer' }}>
                        {name}
                      </a>
                    ),
                  },
                  { title: '关系', dataIndex: 'pointRelation' },
                  { title: '阵营', dataIndex: 'pointCamp' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    render: (s: string) => (
                      <AntTag color={s === 'unchanged' ? 'default' : s === 'changed' ? 'warning' : 'error'}>{s}</AntTag>
                    ),
                  },
                  {
                    title: '添加时间',
                    dataIndex: 'timestamp',
                    render: (ts: number) => ts ? new Date(ts).toLocaleString('zh-CN') : '-',
                  },
                ]}
                dataSource={record.points}
                pagination={false}
                size="small"
              />
            ),
          }}
          size="middle"
        />
      </Card>
    </div>
  );
}
