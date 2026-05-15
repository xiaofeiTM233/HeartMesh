// components/HexCell.tsx
'use client';

import { useMemo, useRef, useCallback } from 'react';
import { Group, RegularPolygon, Text, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import type { PointData, BorderValue, BorderPerEdge, BorderTopBottom } from '@/models/Point';
import type { GroupData } from '@/models/Group';
import { HEX_SIZE, getNeighbors, axialToPixel, pixelToOffset } from '@/lib/hexGrid';

// 格子边框状态
// T=Top=上，B=Bottom=下，1=左，2=中，3=右
interface CellBorderStatus {
  T1: { hasPoint: boolean; sameGroup: boolean }; // 上左 (W)
  T2: { hasPoint: boolean; sameGroup: boolean }; // 上中 (NW)
  T3: { hasPoint: boolean; sameGroup: boolean }; // 上右 (NE)
  B1: { hasPoint: boolean; sameGroup: boolean }; // 下左 (SW)
  B2: { hasPoint: boolean; sameGroup: boolean }; // 下中 (SE)
  B3: { hasPoint: boolean; sameGroup: boolean }; // 下右 (E)
}

interface HexCellProps {
  point: PointData;
  group?: GroupData;
  allPoints: Map<string, PointData>; // 坐标到点的映射 "x,y" -> PointData
  scale: number;
  draggable?: boolean;
  onClick?: (point: PointData) => void;
  onDragEnd?: (point: PointData, newCoords: { x: number; y: number }) => void;
}

// 默认颜色
const DEFAULT_COLOR = '#3b82f6'; // 蓝色
const BORDER_THICK_WIDTH = 4;  // 粗边框（无相邻点）
const BORDER_THIN_WIDTH = 2;   // 细边框（有相邻点）

/**
 * 根据填充颜色计算边框颜色
 * @param fillColor 填充颜色（hex格式）
 * @param factor 调整系数（正值加深，负值变浅，范围 -1 到 1）
 */
function getBorderColor(fillColor: string, factor: number): string {
  const hex = fillColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const adjust = (value: number) => {
    if (factor >= 0) {
      // 加深
      return Math.round(value * (1 - factor));
    } else {
      // 变浅（向白色靠近）
      return Math.round(value + (255 - value) * Math.abs(factor));
    }
  };
  
  const newR = Math.min(255, Math.max(0, adjust(r))).toString(16).padStart(2, '0');
  const newG = Math.min(255, Math.max(0, adjust(g))).toString(16).padStart(2, '0');
  const newB = Math.min(255, Math.max(0, adjust(b))).toString(16).padStart(2, '0');
  
  return `#${newR}${newG}${newB}`;
}

/**
 * 计算格子的边框状态
 * HEX_DIRECTIONS 顺序：NE、NW、W、SW、SE、E
 */
function calculateBorderStatus(
  point: PointData,
  allPoints: Map<string, PointData>
): CellBorderStatus {
  const neighbors = getNeighbors(point.mesh.x, point.mesh.y);
  // 顺序与 HEX_DIRECTIONS 一致：NE、NW、W、SW、SE、E
  const directions = ['T3', 'T2', 'T1', 'B1', 'B2', 'B3'] as const;
  
  const status: CellBorderStatus = {
    T1: { hasPoint: false, sameGroup: false },
    T2: { hasPoint: false, sameGroup: false },
    T3: { hasPoint: false, sameGroup: false },
    B1: { hasPoint: false, sameGroup: false },
    B2: { hasPoint: false, sameGroup: false },
    B3: { hasPoint: false, sameGroup: false },
  };
  
  neighbors.forEach((neighbor, index) => {
    const key = `${neighbor.x},${neighbor.y}`;
    const neighborPoint = allPoints.get(key);
    const direction = directions[index];
    
    if (neighborPoint) {
      status[direction].hasPoint = true;
      // 只有当两个点都有有效的 group 且相等时，才认为是同一组
      status[direction].sameGroup = !!(point.heart.阵营 && neighborPoint.heart.阵营 && point.heart.阵营 === neighborPoint.heart.阵营);
    }
  });
  
  return status;
}

/**
 * 从 BorderValue 解析每条边的边框颜色
 * 支持三种格式：逐边 {T1,T2,T3,B1,B2,B3}、上下 {T,B}、全局 string
 */
function resolveBorderColors(
  borderValue: BorderValue | undefined,
  fallbackThick: string,
  fallbackThin: string,
  fillColor: string,
  borderStatus: CellBorderStatus
): Record<keyof CellBorderStatus, string> {
  const result: Record<keyof CellBorderStatus, string> = {
    T1: fallbackThick,
    T2: fallbackThick,
    T3: fallbackThick,
    B1: fallbackThick,
    B2: fallbackThick,
    B3: fallbackThick,
  };

  // 先根据 borderStatus 设置默认的粗/细边框
  const keys = Object.keys(result) as (keyof CellBorderStatus)[];
  keys.forEach(key => {
    if (borderStatus[key].sameGroup) {
      result[key] = fillColor;
    } else if (borderStatus[key].hasPoint) {
      result[key] = fallbackThin;
    }
  });

  if (!borderValue) return result;

  if (typeof borderValue === 'string') {
    // 全局：所有边使用同一颜色
    keys.forEach(key => { result[key] = borderValue; });
  } else if ('T1' in borderValue || 'T2' in borderValue || 'T3' in borderValue || 'B1' in borderValue || 'B2' in borderValue || 'B3' in borderValue) {
    // 逐边控制
    const perEdge = borderValue as BorderPerEdge;
    if (perEdge.T1) result.T1 = perEdge.T1;
    if (perEdge.T2) result.T2 = perEdge.T2;
    if (perEdge.T3) result.T3 = perEdge.T3;
    if (perEdge.B1) result.B1 = perEdge.B1;
    if (perEdge.B2) result.B2 = perEdge.B2;
    if (perEdge.B3) result.B3 = perEdge.B3;
  } else if ('T' in borderValue || 'B' in borderValue) {
    // 上下分组控制
    const tb = borderValue as BorderTopBottom;
    if (tb.T) { result.T1 = tb.T; result.T2 = tb.T; result.T3 = tb.T; }
    if (tb.B) { result.B1 = tb.B; result.B2 = tb.B; result.B3 = tb.B; }
  }

  return result;
}

/**
 * 根据边框状态生成边框路径数据
 * 平顶六边形顶点顺序：右、右上、左上、左、左下、右下
 */
function generateBorderPath(
  status: CellBorderStatus,
  size: number,
  fillColor: string,
  borderColorValue?: BorderValue
): Array<{ points: number[]; strokeWidth: number; stroke: string }> {
  const borders: Array<{ points: number[]; strokeWidth: number; stroke: string }> = [];
  
  // 根据填充颜色计算默认边框颜色
  const thickColor = getBorderColor(fillColor, 0.2);   // 粗边框加深20%
  const thinColor = getBorderColor(fillColor, -0.1);   // 细边框变浅10%
  
  // 解析每条边的边框颜色
  const resolvedColors = resolveBorderColors(borderColorValue, thickColor, thinColor, fillColor, status);
  
  // 平顶六边形的6个顶点坐标（相对于中心，从右边开始顺时针）
  const vertices = [
    { x: size, y: 0 },                                    // 右顶点
    { x: size / 2, y: -size * Math.sqrt(3) / 2 },        // 右上顶点
    { x: -size / 2, y: -size * Math.sqrt(3) / 2 },       // 左上顶点
    { x: -size, y: 0 },                                   // 左顶点
    { x: -size / 2, y: size * Math.sqrt(3) / 2 },        // 左下顶点
    { x: size / 2, y: size * Math.sqrt(3) / 2 },         // 右下顶点
  ];
  
  // 每条边对应的邻居方向（与 HEX_DIRECTIONS 顺序一致）
  // 边0(右上边) -> NE, 边1(顶边) -> NW, 边2(左边) -> W
  // 边3(左下边) -> SW, 边4(底边) -> SE, 边5(右边) -> E
  const edgeKeys: (keyof CellBorderStatus)[] = ['T3', 'T2', 'T1', 'B1', 'B2', 'B3'];
  
  // 为每条边生成边框
  for (let i = 0; i < 6; i++) {
    const edgeKey = edgeKeys[i];
    const s = status[edgeKey];
    const startVertex = vertices[i];
    const endVertex = vertices[(i + 1) % 6];
    
    if (s.sameGroup) {
      // 同一组：同色边框
      borders.push({
        points: [startVertex.x, startVertex.y, endVertex.x, endVertex.y],
        strokeWidth: 2,
        stroke: resolvedColors[edgeKey],
      });
    } else if (s.hasPoint) {
      // 有相邻点但不同组：细边框
      borders.push({
        points: [startVertex.x, startVertex.y, endVertex.x, endVertex.y],
        strokeWidth: BORDER_THIN_WIDTH,
        stroke: resolvedColors[edgeKey],
      });
    } else {
      // 无相邻点：粗边框
      borders.push({
        points: [startVertex.x, startVertex.y, endVertex.x, endVertex.y],
        strokeWidth: BORDER_THICK_WIDTH,
        stroke: resolvedColors[edgeKey],
      });
    }
  }
  
  return borders;
}

export default function HexCell({ point, group, allPoints, scale, draggable = false, onClick, onDragEnd }: HexCellProps) {
  const fillColor = point.mesh.themeColor || group?.color || DEFAULT_COLOR;
  const fontColor = point.mesh.fontColor || '#1f2937';
  const groupRef = useRef<any>(null);
  
  // 计算边框状态
  const borderStatus = useMemo(
    () => calculateBorderStatus(point, allPoints),
    [point, allPoints]
  );
  
  // 生成边框数据
  const borders = useMemo(
    () => generateBorderPath(borderStatus, HEX_SIZE, fillColor, point.mesh.borderColor),
    [borderStatus, fillColor, point.mesh.borderColor]
  );
  
  // 计算像素坐标（使用统一的坐标转换函数）
  const { x: pixelX, y: pixelY } = useMemo(() => {
    // 偏移坐标 -> 轴向坐标 -> 像素坐标
    const q = point.mesh.x;
    const r = point.mesh.y - Math.floor(point.mesh.x / 2);
    return axialToPixel(q, r);
  }, [point.mesh.x, point.mesh.y]);
  
  const handleClick = useCallback(() => {
    if (!draggable) {
      onClick?.(point);
    }
  }, [draggable, onClick, point]);
  
  const handleDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    // 阻止事件冒泡，避免触发 Stage 的拖动
    e.cancelBubble = true;
    // 拖动时提升层级
    const target = e.target as any;
    target.moveToTop();
  }, []);
  
  const handleDragEnd = useCallback((e: KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const target = e.target as any;
    const newX = target.x();
    const newY = target.y();
    
    // 将像素坐标转换为网格坐标
    const newCoords = pixelToOffset(newX, newY);
    
    onDragEnd?.(point, newCoords);
  }, [point, onDragEnd]);
  
  // Avatar 尺寸（根据格子大小调整）
  const avatarSize = HEX_SIZE * 0.8;
  const fontSize = Math.max(8, 10 * scale);
  
  return (
    <Group 
      ref={groupRef}
      x={pixelX} 
      y={pixelY} 
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 六边形填充 - 覆盖底部网格 */}
      <RegularPolygon
        sides={6}
        radius={HEX_SIZE}
        fill={fillColor}
        stroke="transparent"
        strokeWidth={0}
        rotation={30}
      />
      
      {/* 边框：先渲染细边框，再渲染粗边框（粗覆盖细） */}
      {borders.filter(b => b.strokeWidth === BORDER_THIN_WIDTH).map((border, index) => (
        <Line
          key={`thin-${index}`}
          points={border.points}
          stroke={border.stroke}
          strokeWidth={border.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      {borders.filter(b => b.strokeWidth === BORDER_THICK_WIDTH).map((border, index) => (
        <Line
          key={`thick-${index}`}
          points={border.points}
          stroke={border.stroke}
          strokeWidth={border.strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      
      {/* Avatar 占位（如果有） */}
      {point.heart.头像 && point.heart.头像.length > 0 && (
        <Group y={-HEX_SIZE * 0.2}>
          {/* 这里需要使用 KonvaImage 加载图片，暂时用圆形占位 */}
          <RegularPolygon
            sides={6}
            radius={avatarSize / 2}
            fill="#e5e7eb"
            stroke="#d1d5db"
            strokeWidth={1}
          />
        </Group>
      )}

      {/* 名称 */}
      {point.heart.名字 && (
        <Text
          text={point.heart.名字}
          fontSize={fontSize}
          fill={fontColor}
          align="center"
          verticalAlign="middle"
          width={HEX_SIZE * 1.5}
          x={-HEX_SIZE * 0.75}
          y={HEX_SIZE * 0.3}
          ellipsis
          wrap="none"
        />
      )}
    </Group>
  );
}
