// components/EditSidebar.tsx
'use client';

import { useState } from 'react';
import { Button, Space, Drawer, Form } from 'antd';
import PointEditForm from './PointEditForm';
import type { PointData, LineData, GroupData } from '@/models/types';

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
  ...formHandlers
}: EditSidebarProps) {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const form = Form.useForm()[0];

  // 关闭抽屉（带动画延迟）
  const handleClose = () => {
    setDrawerOpen(false);
    setTimeout(() => onClose(), 300);
  };

  return (
    <Drawer
      title="编辑面板"
      placement="right"
      onClose={handleClose}
      open={drawerOpen}
      size="large"
      styles={{ body: { paddingBottom: 80 } }}
      extra={
        <Space>
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" onClick={() => form.submit()}>保存</Button>
        </Space>
      }
    >
      <PointEditForm
        point={selectedPoint}
        points={points}
        lines={lines}
        groups={groups}
        form={form}
        mode="drawer"
        onClose={handleClose}
        {...formHandlers}
      />
    </Drawer>
  );
}
