// components/HexCell.tsx
'use client';

import { useMemo, useRef, useCallback } from 'react';
import { Group, RegularPolygon, Text, Line } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { HEX_SIZE, getNeighbors, axialToPixel, pixelToOffset } from '@/lib/hexGrid';
import { MESH_DEFAULTS } from '@/models/Point';
import type { PointData, BorderValue, BorderT1, BorderT2, BorderMode, FontMode } from '@/models/Point';
import type { GroupData } from '@/models/Group';

const BORDER_THIN_WIDTH = 2;
const BORDER_BOLD_WIDTH = 4;

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

/**
 * 解析 BorderMode 为 Konva Line 的样式属性
 * 线型字母：S=solid, D=dashed, O=dotted, W=double
 * 粗细数字：1=细, 2=普通, 3=粗
 * 隐藏：X
 */
function resolveBorderMode(mode: BorderMode | string): { dash: number[]; strokeWidth: number; hidden: boolean } {
  if (mode === 'X') {
    return { dash: [], strokeWidth: 0, hidden: true };
  }

  const lineStyle = mode[0]; // S, D, O, W
  const boldness = parseInt(mode[1]); // 1, 2, 3

  // 粗细映射：1=细(2), 2=普通(4), 3=粗(6)
  const widthMap: Record<number, number> = { 1: BORDER_THIN_WIDTH, 2: BORDER_BOLD_WIDTH, 3: 6 };
  const strokeWidth = widthMap[boldness] ?? BORDER_BOLD_WIDTH;

  // 线型映射
  switch (lineStyle) {
    case 'S': // 实线
      return { dash: [], strokeWidth, hidden: false };
    case 'D': // 虚线
      return { dash: [8, 4], strokeWidth, hidden: false };
    case 'O': // 点线
      return { dash: [2, 4], strokeWidth, hidden: false };
    case 'W': // 双线
      return { dash: [], strokeWidth: strokeWidth * 1.5, hidden: false };
    default:
      return { dash: [], strokeWidth: BORDER_BOLD_WIDTH, hidden: false };
  }
}

/**
 * 从 BorderValue 解析每条边的边框模式
 * 支持三种格式：逐边 {T1,T2,T3,B1,B2,B3}、上下 {T,B}、全局 string
 */
function resolveBorderModes(
  borderModeValue: BorderValue | undefined,
  borderStatus: CellBorderStatus
): Record<keyof CellBorderStatus, { dash: number[]; strokeWidth: number; hidden: boolean }> {
  const defaultMode = { dash: [], strokeWidth: BORDER_BOLD_WIDTH, hidden: false };
  const result: Record<keyof CellBorderStatus, { dash: number[]; strokeWidth: number; hidden: boolean }> = {
    T1: { ...defaultMode },
    T2: { ...defaultMode },
    T3: { ...defaultMode },
    B1: { ...defaultMode },
    B2: { ...defaultMode },
    B3: { ...defaultMode },
  };

  // 先根据 borderStatus 设置默认的粗/细边框
  const keys = Object.keys(result) as (keyof CellBorderStatus)[];
  keys.forEach(key => {
    if (borderStatus[key].sameGroup) {
      result[key] = { dash: [], strokeWidth: 2, hidden: false };
    } else if (borderStatus[key].hasPoint) {
      result[key] = { dash: [], strokeWidth: BORDER_THIN_WIDTH, hidden: false };
    }
  });

  if (!borderModeValue) return result;

  if (typeof borderModeValue === 'string') {
    // 全局：所有边使用同一模式
    const resolved = resolveBorderMode(borderModeValue);
    keys.forEach(key => { result[key] = resolved; });
  } else if ('T1' in borderModeValue || 'T2' in borderModeValue || 'T3' in borderModeValue || 'B1' in borderModeValue || 'B2' in borderModeValue || 'B3' in borderModeValue) {
    // 逐边控制
    const T1 = borderModeValue as BorderT1;
    if (T1.T1) result.T1 = resolveBorderMode(T1.T1);
    if (T1.T2) result.T2 = resolveBorderMode(T1.T2);
    if (T1.T3) result.T3 = resolveBorderMode(T1.T3);
    if (T1.B1) result.B1 = resolveBorderMode(T1.B1);
    if (T1.B2) result.B2 = resolveBorderMode(T1.B2);
    if (T1.B3) result.B3 = resolveBorderMode(T1.B3);
  } else if ('T' in borderModeValue || 'B' in borderModeValue) {
    // 上下分组控制
    const tb = borderModeValue as BorderT2;
    if (tb.T) { const resolved = resolveBorderMode(tb.T); result.T1 = resolved; result.T2 = { ...resolved }; result.T3 = { ...resolved }; }
    if (tb.B) { const resolved = resolveBorderMode(tb.B); result.B1 = resolved; result.B2 = { ...resolved }; result.B3 = { ...resolved }; }
  }

  return result;
}

/**
 * 解析 FontMode 为 Konva Text 的样式属性
 * N=Normal, L=Larger, S=Smaller
 * B=Bold, T=Thin
 */
function resolveFontStyle(
  fontMode: FontMode | undefined,
  baseFontSize: number
): { fontSize: number; fontStyle: string } {
  if (!fontMode) {
    return { fontSize: baseFontSize, fontStyle: 'normal' };
  }

  // 尺寸映射
  let sizeMultiplier = 1;
  const sizeCode = fontMode[0];
  switch (sizeCode) {
    case 'L': sizeMultiplier = 1.3; break;
    case 'S': sizeMultiplier = 0.8; break;
    case 'N': default: sizeMultiplier = 1; break;
  }

  // 粗细映射
  let style = 'normal';
  const weightCode = fontMode[1];
  switch (weightCode) {
    case 'B': style = 'bold'; break;
    case 'T': style = 'lighter'; break;
    default: style = 'normal'; break;
  }

  return { fontSize: Math.round(baseFontSize * sizeMultiplier), fontStyle: style };
}

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
  fallbackBold: string,
  fallbackThin: string,
  fillColor: string,
  borderStatus: CellBorderStatus
): Record<keyof CellBorderStatus, string> {
  const result: Record<keyof CellBorderStatus, string> = {
    T1: fallbackBold,
    T2: fallbackBold,
    T3: fallbackBold,
    B1: fallbackBold,
    B2: fallbackBold,
    B3: fallbackBold,
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
    const T1 = borderValue as BorderT1;
    if (T1.T1) result.T1 = T1.T1;
    if (T1.T2) result.T2 = T1.T2;
    if (T1.T3) result.T3 = T1.T3;
    if (T1.B1) result.B1 = T1.B1;
    if (T1.B2) result.B2 = T1.B2;
    if (T1.B3) result.B3 = T1.B3;
  } else if ('T' in borderValue || 'B' in borderValue) {
    // 上下分组控制
    const T2 = borderValue as BorderT2;
    if (T2.T) { result.T1 = T2.T; result.T2 = T2.T; result.T3 = T2.T; }
    if (T2.B) { result.B1 = T2.B; result.B2 = T2.B; result.B3 = T2.B; }
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
  borderColorValue?: BorderValue,
  borderModeValue?: BorderValue
): Array<{ points: number[]; strokeWidth: number; stroke: string; dash: number[]; hidden: boolean }> {
  const borders: Array<{ points: number[]; strokeWidth: number; stroke: string; dash: number[]; hidden: boolean }> = [];
  
  // 根据填充颜色计算默认边框颜色
  const BoldColor = getBorderColor(fillColor, 0.2);   // 粗边框加深20%
  const thinColor = getBorderColor(fillColor, -0.1);   // 细边框变浅10%
  
  // 解析每条边的边框颜色
  const resolvedColors = resolveBorderColors(borderColorValue, BoldColor, thinColor, fillColor, status);
  // 解析每条边的边框模式
  const resolvedModes = resolveBorderModes(borderModeValue, status);
  
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
    const mode = resolvedModes[edgeKey];
    const startVertex = vertices[i];
    const endVertex = vertices[(i + 1) % 6];
    
    if (mode.hidden) continue; // 隐藏边框，跳过

    borders.push({
      points: [startVertex.x, startVertex.y, endVertex.x, endVertex.y],
      strokeWidth: mode.strokeWidth,
      stroke: resolvedColors[edgeKey],
      dash: mode.dash,
      hidden: false,
    });
  }
  
  return borders;
}

export default function HexCell({ point, group, allPoints, scale, draggable = false, onClick, onDragEnd }: HexCellProps) {
  const fillColor = point.mesh.themeColor || group?.color || MESH_DEFAULTS.THEME_COLOR;
  const fontColor = point.mesh.fontColor || MESH_DEFAULTS.FONT_COLOR;
  const groupRef = useRef<any>(null);
  
  // 计算边框状态
  const borderStatus = useMemo(
    () => calculateBorderStatus(point, allPoints),
    [point, allPoints]
  );
  
  // 生成边框数据
  const borders = useMemo(
    () => generateBorderPath(borderStatus, HEX_SIZE, fillColor, point.mesh.borderColor, point.mesh.borderMode),
    [borderStatus, fillColor, point.mesh.borderColor, point.mesh.borderMode]
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
  const baseFontSize = Math.max(8, 10 * scale);
  const { fontSize, fontStyle } = useMemo(
    () => resolveFontStyle(point.mesh.fontMode, baseFontSize),
    [point.mesh.fontMode, baseFontSize]
  );
  
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
      
      {/* 边框 */}
      {borders.map((border, index) => (
        <Line
          key={`border-${index}`}
          points={border.points}
          stroke={border.stroke}
          strokeWidth={border.strokeWidth}
          dash={border.dash}
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
          fontStyle={fontStyle}
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
