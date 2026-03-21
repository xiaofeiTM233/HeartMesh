// lib/types.ts

// 点数据类型
export interface PointData {
  _id: string;
  x: number;
  y: number;
  label?: string;
  avatar?: string;
  name?: string;
  group?: string | null;  // 分组ID (string类型,因为MongoDB ObjectId会转换为string, null表示退出组)
  createdAt?: string;
  updatedAt?: string;
}

// 线数据类型
export interface LineData {
  _id: string;
  startPoint: {
    id: string;
    x: number;
    y: number;
  };
  endPoint: {
    id: string;
    x: number;
    y: number;
  };
  group?: string;  // 分组ID (string类型,因为MongoDB ObjectId会转换为string)
  label?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 组数据类型
export interface GroupData {
  _id: string;
  name: string;
  color: string;
  pointIds: string[];  // 点ID数组 (string类型,因为MongoDB ObjectId数组会转换为string数组)
  lineIds: string[];   // 线ID数组 (string类型,因为MongoDB ObjectId数组会转换为string数组)
  createdAt?: string;
  updatedAt?: string;
}

// 格子渲染数据
export interface HexCellData {
  id: string;
  x: number;
  y: number;
  pixelX: number;
  pixelY: number;
  label?: string;
  avatar?: string;
  name?: string;
  group?: string;  // 分组ID (string类型,因为MongoDB ObjectId会转换为string)
  groupColor?: string;
}

// 邻居信息
export interface NeighborInfo {
  hasPoint: boolean;
  sameGroup: boolean;
}

// 格子边框状态
export interface CellBorderStatus {
  topRight: NeighborInfo;   // 右上邻居
  right: NeighborInfo;      // 右邻居
  bottomRight: NeighborInfo; // 右下邻居
  bottomLeft: NeighborInfo;  // 左下邻居
  left: NeighborInfo;        // 左邻居
  topLeft: NeighborInfo;     // 左上邻居
}

// 网格视图状态
export interface GridViewState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// API 响应类型
export interface DataResponse {
  points: PointData[];
  lines: LineData[];
  groups: GroupData[];
}
