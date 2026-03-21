// lib/hexGrid.ts

/**
 * 蜂窝网格工具函数
 * 使用轴向坐标系统（axial coordinates）
 * 采用平顶六边形（flat-top）布局
 */

// 六边形尺寸配置
export const HEX_SIZE = 40; // 六边形半径（中心到顶点的距离）

// 六边形的6个方向邻居（平顶六边形的轴向坐标偏移）
// 边顺序：边0(右上边)、边1(顶边)、边2(左边)、边3(左下边)、边4(底边)、边5(右边)
// 对应邻居方向：NE、NW、W、SW、SE、E
export const HEX_DIRECTIONS = [
  { q: 1, r: -1 },   // NE 右上 - 边0(右上边)对应
  { q: 0, r: -1 },   // NW 左上 - 边1(顶边)对应
  { q: -1, r: 0 },   // W 左 - 边2(左边)对应
  { q: -1, r: 1 },   // SW 左下 - 边3(左下边)对应
  { q: 0, r: 1 },    // SE 右下 - 边4(底边)对应
  { q: 1, r: 0 },    // E 右 - 边5(右边)对应
];

/**
 * 将轴向坐标转换为像素坐标（平顶六边形）
 */
export function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * Math.sqrt(3) * (r + q / 2);
  return { x, y };
}

/**
 * 将像素坐标转换为轴向坐标（平顶六边形）
 */
export function pixelToAxial(x: number, y: number): { q: number; r: number } {
  const q = (2 / 3 * x) / HEX_SIZE;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / HEX_SIZE;
  return { q, r };
}

/**
 * 将轴向坐标四舍五入为整数坐标
 */
export function axialRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);
  
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  
  return { q: rq, r: rr };
}

/**
 * 将偏移坐标（odd-q）转换为轴向坐标
 * 用户输入使用偏移坐标（x, y），内部计算使用轴向坐标（q, r）
 */
export function offsetToAxial(x: number, y: number): { q: number; r: number } {
  const q = x;
  const r = y - Math.floor(x / 2);
  return { q, r };
}

/**
 * 将轴向坐标转换为偏移坐标（odd-q）
 */
export function axialToOffset(q: number, r: number): { x: number; y: number } {
  const x = q;
  const y = r + Math.floor(q / 2);
  return { x, y };
}

/**
 * 获取六边形的6个邻居坐标（偏移坐标）
 */
export function getNeighbors(x: number, y: number): Array<{ x: number; y: number }> {
  const { q, r } = offsetToAxial(x, y);
  return HEX_DIRECTIONS.map(dir => {
    const neighborQ = q + dir.q;
    const neighborR = r + dir.r;
    return axialToOffset(neighborQ, neighborR);
  });
}

/**
 * 计算网格边界
 * @param points 所有点的坐标
 * @param padding 边界扩展
 */
export function calculateGridBounds(
  points: Array<{ x: number; y: number }>,
  padding: number = 3
): { minX: number; maxX: number; minY: number; maxY: number } {
  if (points.length === 0) {
    return { minX: -32, maxX: 32, minY: -32, maxY: 32 };
  }
  
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}

/**
 * 生成六边形的顶点坐标（用于 Konva）
 */
export function getHexCorners(centerX: number, centerY: number, size: number = HEX_SIZE): Array<{ x: number; y: number }> {
  const corners: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30; // 从右上角开始
    const angleRad = (Math.PI / 180) * angleDeg;
    corners.push({
      x: centerX + size * Math.cos(angleRad),
      y: centerY + size * Math.sin(angleRad),
    });
  }
  return corners;
}

/**
 * 检查两个点是否在同一组
 */
export function isSameGroup(
  point1GroupId: string | undefined,
  point2GroupId: string | undefined
): boolean {
  if (!point1GroupId || !point2GroupId) return false;
  return point1GroupId === point2GroupId;
}

/**
 * 将像素坐标转换为偏移坐标（odd-q）
 * 用于拖动后计算新的网格坐标
 */
export function pixelToOffset(x: number, y: number): { x: number; y: number } {
  const { q, r } = pixelToAxial(x, y);
  const rounded = axialRound(q, r);
  return axialToOffset(rounded.q, rounded.r);
}
