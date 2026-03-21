// components/HexGrid.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, RegularPolygon } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { Switch, Modal, Form, Select, Input, Button, App } from 'antd';
import HexCell from './HexCell';
import { 
  HEX_SIZE, 
  axialToPixel,
  pixelToOffset,
} from '@/lib/hexGrid';
import type { PointData, GroupData } from '@/lib/types';

// 颜色配置
const BG_COLOR = '#9ca3af';      // 灰色背景
const GRID_COLOR = '#ffffff';    // 白色网格
const GRID_OPACITY = 0.3;        // 网格透明度
const GRID_STROKE_WIDTH = 1;     // 网格边框宽度

interface HexGridProps {
  initialScale?: number;
  minScale?: number;
  maxScale?: number;
}

// 默认缩放和边界配置
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.2;
const MAX_SCALE = 3;

// 默认网格范围 64x64（-32 到 +32）
const GRID_RANGE = 32;

export default function HexGrid({ 
  initialScale = DEFAULT_SCALE,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
}: HexGridProps) {
  const { message } = App.useApp();
  const [points, setPoints] = useState<PointData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [scale, setScale] = useState(initialScale);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: stageSize.width / 2, y: stageSize.height / 2 });
  const [showGrid, setShowGrid] = useState(false); // 网格显示开关
  const [dragMode, setDragMode] = useState(false); // 拖动模式开关
  const [editingPoint, setEditingPoint] = useState<PointData | null>(null); // 正在编辑的点
  const [editModalOpen, setEditModalOpen] = useState(false); // 编辑面板开关
  const [groupSearchValue, setGroupSearchValue] = useState(''); // 分组搜索值
  const [form] = Form.useForm();
  const stageRef = useRef<Konva.Stage>(null);
  
  // 创建坐标到点的映射
  const pointsMap = useMemo(() => {
    const map = new Map<string, PointData>();
    points.forEach(p => {
      map.set(`${p.x},${p.y}`, p);
    });
    return map;
  }, [points]);
  
  // 创建组ID到组的映射
  const groupsMap = useMemo(() => {
    const map = new Map<string, GroupData>();
    groups.forEach(g => {
      map.set(g._id, g);
    });
    return map;
  }, [groups]);
  
  // 计算网格背景格子
  const gridCells = useMemo(() => {
    const cells: Array<{ q: number; r: number; x: number; y: number }> = [];
    
    for (let q = -GRID_RANGE; q <= GRID_RANGE; q++) {
      for (let r = -GRID_RANGE; r <= GRID_RANGE; r++) {
        const { x, y } = axialToPixel(q, r);
        cells.push({ q, r, x, y });
      }
    }
    
    return cells;
  }, []);
  
  // 加载数据
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/data');
        const result = await response.json();
        if (result.success && result.data) {
          const apiPoints = result.data.points || [];
          const apiGroups = result.data.groups || [];
          
          setPoints(apiPoints);
          setGroups(apiGroups);
        } else {
          throw new Error('API returned error');
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setPoints([
          { _id: '1', x: 0, y: 0, name: '中心', group: 'g1' },
          { _id: '2', x: 1, y: 0, name: '邻居1', group: 'g1' },
          { _id: '3', x: 0, y: 1, name: '邻居2', group: 'g2' },
          { _id: '4', x: -1, y: 1, name: '邻居3' },
          { _id: '5', x: 1, y: -1, name: '邻居4', group: 'g1' },
        ]);
        setGroups([
          { _id: 'g1', name: '组1', color: '#ff6b6b', pointIds: ['1', '2', '5'], lineIds: [] },
          { _id: 'g2', name: '组2', color: '#4ecdc4', pointIds: ['3'], lineIds: [] },
        ]);
      }
    }
    fetchData();
  }, []);
  
  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setStageSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
    
    handleResize();
    setStagePos({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 处理滚轮缩放
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(maxScale, Math.max(minScale, oldScale + direction * 0.1));
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setScale(newScale);
    setStagePos(newPos);
  }, [scale, stagePos, minScale, maxScale]);
  
  // 处理Stage拖动结束
  const handleStageDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    setStagePos({
      x: e.target.x(),
      y: e.target.y(),
    });
  }, []);
  
  // 处理格子点击
  const handleCellClick = useCallback((point: PointData) => {
    setEditingPoint(point);
    setEditModalOpen(true);
    // 延迟设置表单值，确保 Form 已渲染
    setTimeout(() => {
      form.setFieldsValue({
        name: point.name || '',
        group: point.group || undefined,
      });
    }, 0);
  }, [form]);
  
  // 处理格子拖动结束
  const handleCellDragEnd = useCallback(async (point: PointData, newCoords: { x: number; y: number }) => {
    // 检查新坐标是否已有其他点
    const existingPoint = points.find(p => 
      p._id !== point._id && p.x === newCoords.x && p.y === newCoords.y
    );
    
    if (existingPoint) {
      message.warning('该位置已有其他格子');
      return;
    }
    
    // 检查坐标是否改变
    if (newCoords.x === point.x && newCoords.y === point.y) {
      return;
    }
    
    try {
      // 更新数据库
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'point',
          action: 'update',
          id: point._id,
          data: { x: newCoords.x, y: newCoords.y },
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态
        setPoints(prev => prev.map(p => 
          p._id === point._id 
            ? { ...p, x: newCoords.x, y: newCoords.y }
            : p
        ));
        message.success('坐标更新成功');
      } else {
        message.error('更新失败');
      }
    } catch (error) {
      console.error('更新坐标失败:', error);
      message.error('更新失败');
    }
  }, [points, message]);
  
  // 处理编辑表单提交
  const handleEditSubmit = useCallback(async (values: { name?: string; group?: string }) => {
    if (!editingPoint) return;
    
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'point',
          action: 'update',
          id: editingPoint._id,
          data: {
            name: values.name,
            group: values.group,
          },
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态
        setPoints(prev => prev.map(p => 
          p._id === editingPoint._id 
            ? { ...p, name: values.name, group: values.group }
            : p
        ));
        
        // 如果有分组，更新分组数据
        if (values.group) {
          const updatedGroup = groups.find(g => g._id === values.group);
          if (updatedGroup && !updatedGroup.pointIds.includes(editingPoint._id)) {
            setGroups(prev => prev.map(g => 
              g._id === values.group 
                ? { ...g, pointIds: [...g.pointIds, editingPoint._id] }
                : g
            ));
          }
        }
        
        message.success('保存成功');
        setEditModalOpen(false);
        setEditingPoint(null);
      } else {
        message.error('保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  }, [editingPoint, groups, message]);
  
  // 处理网格空白位置点击 - 创建新点
  const handleGridClick = useCallback(async (e: KonvaEventObject<MouseEvent>) => {
    // 只在非拖动模式下处理
    if (dragMode) return;
    
    // 如果点击的是格子，不处理
    const target = e.target as any;
    if (target.name() === 'hex-cell' || target.getParent()?.name() === 'hex-cell') {
      return;
    }
    
    // 获取点击位置相对于Stage的坐标
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    // 转换为Stage内部坐标
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const relativePos = transform.point(pointer);
    
    // 计算网格坐标
    const { x: gridX, y: gridY } = pixelToOffset(relativePos.x, relativePos.y);
    
    // 检查该位置是否已有点
    const existingPoint = points.find(p => p.x === gridX && p.y === gridY);
    if (existingPoint) return;
    
    try {
      // 创建新点
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'point',
          action: 'create',
          data: { x: gridX, y: gridY },
        }),
      });
      
      const result = await response.json();
      
      if (result.success && result.data) {
        // 添加到本地状态
        const newPoint: PointData = {
          _id: result.data._id,
          x: gridX,
          y: gridY,
        };
        setPoints(prev => [...prev, newPoint]);
        message.success('创建成功');
      } else {
        message.error('创建失败');
      }
    } catch (error) {
      console.error('创建失败:', error);
      message.error('创建失败');
    }
  }, [dragMode, points, message]);
  
  return (
    <>
      {/* 灰色背景 */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        backgroundColor: BG_COLOR 
      }} />
      
      {/* 悬浮操作栏 */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: '12px 16px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        zIndex: 1000,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#333' }}>显示网格</span>
          <Switch checked={showGrid} onChange={setShowGrid} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#333' }}>拖动模式</span>
          <Switch checked={dragMode} onChange={setDragMode} />
        </div>
      </div>
      
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        draggable={!dragMode}
        onDragEnd={handleStageDragEnd}
        onClick={handleGridClick}
      >
        {/* 底层：白色网格背景 */}
        <Layer>
          {showGrid && gridCells.map((cell) => (
            <RegularPolygon
              key={`grid-${cell.q}-${cell.r}`}
              x={cell.x}
              y={cell.y}
              sides={6}
              radius={HEX_SIZE}
              fill="transparent"
              stroke={GRID_COLOR}
              strokeWidth={GRID_STROKE_WIDTH}
              opacity={GRID_OPACITY}
              rotation={30}
            />
          ))}
        </Layer>
        
        {/* 上层：数据格子 */}
        <Layer>
          {points.map(point => (
            <HexCell
              key={point._id}
              point={point}
              group={point.group ? groupsMap.get(point.group) : undefined}
              allPoints={pointsMap}
              scale={scale}
              draggable={dragMode}
              onClick={handleCellClick}
              onDragEnd={handleCellDragEnd}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* 编辑面板 */}
      <Modal
        title="编辑格子"
        open={editModalOpen}
        onCancel={() => {
          setEditModalOpen(false);
          setEditingPoint(null);
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEditSubmit}
        >
          <Form.Item name="name" label="名称">
            <Input placeholder="请输入格子名称" />
          </Form.Item>
          <Form.Item name="group" label="分组">
            <Select
              showSearch
              placeholder="搜索或创建分组"
              allowClear
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                groupSearchValue ? (
                  <Button
                    type="text"
                    size="small"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/data', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'group',
                            action: 'create',
                            data: { name: groupSearchValue },
                          }),
                        });
                        const result = await response.json();
                        if (result.success && result.data) {
                          setGroups(prev => [...prev, result.data]);
                          form.setFieldValue('group', result.data._id);
                          setGroupSearchValue('');
                          message.success('分组创建成功');
                        }
                      } catch {
                        message.error('创建分组失败');
                      }
                    }}
                  >
                    + 创建新分组 &quot;{groupSearchValue}&quot;
                  </Button>
                ) : null
              }
              options={groups.map(g => ({
                label: g.name,
                value: g._id,
              }))}
              onSearch={(value) => setGroupSearchValue(value)}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
