// components/HexGrid.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Stage, Layer, RegularPolygon, Line, Label, Tag, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import Konva from 'konva';
import { App, FloatButton } from 'antd';
import { LinkOutlined, DragOutlined, BorderOutlined, SettingOutlined } from '@ant-design/icons';
import HexCell from './HexCell';
import EditSidebar from './EditSidebar';
import {
  HEX_SIZE,
  axialToPixel,
  pixelToOffset,
  offsetToAxial,
} from '@/lib/hexGrid';
import type { PointData, LineData, GroupData } from '@/lib/types';

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

// 连线颜色配置
const LINE_COLOR = '#FFD700'; // 金色
const LINE_WIDTH = 3;
const LINE_OPACITY = 0.9;

// 连线组件
interface LineConnectionProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  label: string;
  onHover?: () => void;
  onUnhover?: () => void;
}

function LineConnection({ startX, startY, endX, endY, label, onHover, onUnhover }: LineConnectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <>
      {/* 连线本体 */}
      <Line
        points={[startX, startY, endX, endY]}
        stroke={LINE_COLOR}
        strokeWidth={isHovered ? LINE_WIDTH + 2 : LINE_WIDTH}
        opacity={isHovered ? 1 : LINE_OPACITY}
        lineCap="round"
        lineJoin="round"
        onMouseEnter={(e) => {
          e.cancelBubble = true;
          setIsHovered(true);
          onHover?.();
        }}
        onMouseLeave={(e) => {
          e.cancelBubble = true;
          setIsHovered(false);
          onUnhover?.();
        }}
        shadowColor={LINE_COLOR}
        shadowBlur={isHovered ? 10 : 0}
        shadowOpacity={0.6}
      />
    </>
  );
}

export default function HexGrid({
  initialScale = DEFAULT_SCALE,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
}: HexGridProps) {
  const { message } = App.useApp();
  const [points, setPoints] = useState<PointData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [lines, setLines] = useState<LineData[]>([]);
  const [scale, setScale] = useState(initialScale);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: stageSize.width / 2, y: stageSize.height / 2 });
  const [showGrid, setShowGrid] = useState(false); // 网格显示开关
  const [showLines, setShowLines] = useState(true); // 连线显示开关
  const [dragMode, setDragMode] = useState(false); // 拖动模式开关
  const [selectedPoint, setSelectedPoint] = useState<PointData | null>(null); // 选中的点
  const [sidebarOpen, setSidebarOpen] = useState(false); // 侧边栏开关
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null); // 当前hover的线ID
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
          const apiLines = result.data.lines || [];
          
          setPoints(apiPoints);
          setGroups(apiGroups);
          setLines(apiLines);
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
        setLines([]);
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
    setSelectedPoint(point);
    setSidebarOpen(true);
  }, []);
  
  // 处理格子拖动结束
  const handleCellDragEnd = useCallback(async (point: PointData, newCoords: { x: number; y: number }) => {
    // 不再自动重新定位，只更新本地状态
    try {
      // 更新本地状态
      setPoints(prev => prev.map(p =>
        p._id === point._id
          ? { ...p, x: newCoords.x, y: newCoords.y }
          : p
      ));
      message.success('点位置已更新');
    } catch (error) {
      console.error('更新坐标失败:', error);
      message.error('更新失败');
    }
  }, [message]);
  
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
      
      {/* 左上角悬浮操作按钮 */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, pointerEvents: 'none' }}>
        <FloatButton.Group
          shape="circle"
          trigger="click"
          icon={<SettingOutlined />}
          tooltip="设置"
          style={{ pointerEvents: 'auto' }}
        >
          <FloatButton
            icon={<BorderOutlined />}
            tooltip={`显示网格 (${showGrid ? '开' : '关'})`}
            onClick={() => setShowGrid(!showGrid)}
          />
          <FloatButton
            icon={<LinkOutlined />}
            tooltip={`显示连线 (${showLines ? '开' : '关'})`}
            onClick={() => setShowLines(!showLines)}
          />
          <FloatButton
            icon={<DragOutlined />}
            tooltip={`拖动模式 (${dragMode ? '开' : '关'})`}
            onClick={() => setDragMode(!dragMode)}
          />
        </FloatButton.Group>
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
        
        {/* 中层：连线 */}
        {showLines && (
          <Layer>
            {lines.map((line) => {
              // 将偏移坐标转换为轴向坐标，再转换为像素坐标
              const startAxial = offsetToAxial(line.startPoint.x, line.startPoint.y);
              const endAxial = offsetToAxial(line.endPoint.x, line.endPoint.y);
              const startPos = axialToPixel(startAxial.q, startAxial.r);
              const endPos = axialToPixel(endAxial.q, endAxial.r);
              
              // 查找起点和终点的名称
              const startPointData = points.find(p => p._id === line.startPoint.id);
              const endPointData = points.find(p => p._id === line.endPoint.id);
              const startName = startPointData?.name || `点${line.startPoint.id.slice(-4)}`;
              const endName = endPointData?.name || `点${line.endPoint.id.slice(-4)}`;
              
              return (
                <LineConnection
                  key={line._id}
                  startX={startPos.x}
                  startY={startPos.y}
                  endX={endPos.x}
                  endY={endPos.y}
                  label={line.label || `${startName} → ${endName}`}
                  onHover={() => setHoveredLineId(line._id)}
                  onUnhover={() => setHoveredLineId(null)}
                />
              );
            })}
          </Layer>
        )}
        
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
        
        {/* 最顶层：Tooltip层 */}
        {hoveredLineId && (
          <Layer name="tooltip-layer">
            {lines.map((line) => {
              const startAxial = offsetToAxial(line.startPoint.x, line.startPoint.y);
              const endAxial = offsetToAxial(line.endPoint.x, line.endPoint.y);
              const startPos = axialToPixel(startAxial.q, startAxial.r);
              const endPos = axialToPixel(endAxial.q, endAxial.r);
              
              // 查找起点和终点的名称
              const startPointData = points.find(p => p._id === line.startPoint.id);
              const endPointData = points.find(p => p._id === line.endPoint.id);
              const startName = startPointData?.name || `点${line.startPoint.id.slice(-4)}`;
              const endName = endPointData?.name || `点${line.endPoint.id.slice(-4)}`;
              const label = line.label || `${startName} → ${endName}`;
              
              // 计算线的中点位置
              const midX = (startPos.x + endPos.x) / 2;
              const midY = (startPos.y + endPos.y) / 2;
              
              return (
                <Label
                  key={`tooltip-${line._id}`}
                  x={midX}
                  y={midY}
                  offsetX={0}
                  offsetY={0}
                >
                  <Tag
                    fill="rgba(0, 0, 0, 0.75)"
                    cornerRadius={4}
                    pointerDirection="down"
                    pointerWidth={8}
                    pointerHeight={8}
                    lineJoin="round"
                  />
                  <Text
                    text={label}
                    fontFamily="Arial"
                    fontSize={12}
                    padding={6}
                    fill="white"
                  />
                </Label>
              );
            })}
          </Layer>
        )}
      </Stage>
      
      {/* 编辑侧边栏 */}
      {sidebarOpen && (
        <EditSidebar
          points={points}
          lines={lines}
          groups={groups}
          selectedPoint={selectedPoint}
          onClose={() => {
            setSidebarOpen(false);
            setSelectedPoint(null);
          }}
          onUpdatePoint={async (point, data) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'point',
                action: 'update',
                id: point._id,
                data,
              }),
            });
            const result = await response.json();
            if (result.success) {
              const updatedPoint = { ...point, ...data };
              setPoints(prev => prev.map(p => 
                p._id === point._id ? updatedPoint : p
              ));
              // 同步更新 selectedPoint 以便 UI 立即反映变化
              setSelectedPoint(updatedPoint);
            }
          }}
          onUpdateLine={async (line, data) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'line',
                action: 'update',
                id: line._id,
                data,
              }),
            });
            const result = await response.json();
            if (result.success) {
              setLines(prev => prev.map(l => 
                l._id === line._id ? { ...l, ...data } : l
              ));
            }
          }}
          onUpdateGroup={async (group, data) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'group',
                action: 'update',
                id: group._id,
                data,
              }),
            });
            const result = await response.json();
            if (result.success) {
              setGroups(prev => prev.map(g => 
                g._id === group._id ? { ...g, ...data } : g
              ));
            }
          }}
          onCreateLine={async (data) => {
            // 根据 ID 查找起点和终点的完整信息
            const startPt = points.find(p => p._id === data.startPointId);
            const endPt = points.find(p => p._id === data.endPointId);
            
            if (!startPt || !endPt) {
              console.error('找不到起点或终点');
              return;
            }
            
            const lineData = {
              startPoint: { id: startPt._id, x: startPt.x, y: startPt.y },
              endPoint: { id: endPt._id, x: endPt.x, y: endPt.y },
              label: data.label,
            };
            
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'line',
                action: 'create',
                data: lineData,
              }),
            });
            const result = await response.json();
            if (result.success && result.data) {
              setLines(prev => [...prev, result.data]);
            }
          }}
          onCreateGroup={async (data) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'group',
                action: 'create',
                data,
              }),
            });
            const result = await response.json();
            if (result.success && result.data) {
              setGroups(prev => [...prev, result.data]);
              return result.data;
            }
            return null;
          }}
          onDeletePoint={async (pointId) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'point',
                action: 'delete',
                id: pointId,
              }),
            });
            const result = await response.json();
            if (result.success) {
              setPoints(prev => prev.filter(p => p._id !== pointId));
            }
          }}
          onDeleteLine={async (lineId) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'line',
                action: 'delete',
                id: lineId,
              }),
            });
            const result = await response.json();
            if (result.success) {
              setLines(prev => prev.filter(l => l._id !== lineId));
            }
          }}
          onDeleteGroup={async (groupId) => {
            const response = await fetch('/api/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'group',
                action: 'delete',
                id: groupId,
              }),
            });
            const result = await response.json();
            if (result.success) {
              setGroups(prev => prev.filter(g => g._id !== groupId));
            }
          }}
        />
      )}
    </>
  );
}
