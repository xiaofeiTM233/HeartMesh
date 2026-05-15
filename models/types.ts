// models/types.ts
// 客户端与服务端共享的类型定义和常量
// 此文件不依赖 mongoose，可安全在客户端组件中导入

// ============ Point ============

// 逐边控制模式
export type BorderT1 = {
  T1?: string; // 上左 (W)
  T2?: string; // 上中 (NW)
  T3?: string; // 上右 (NE)
  B1?: string; // 下左 (SW)
  B2?: string; // 下中 (SE)
  B3?: string; // 下右 (E)
};

// 上下分组控制模式
export type BorderT2 = {
  T?: string; // 上
  B?: string; // 下
};

// borderColor / borderMode 的3种格式
export type BorderValue = BorderT1 | BorderT2 | string;

// 边框线型模式
export type BorderMode = 'S1' | 'S2' | 'S3' | 'D1' | 'D2' | 'D3' | 'O1' | 'O2' | 'O3' | 'W1' | 'W2' | 'W3' | 'X';

// 字体模式
export type FontMode = 'NN' | 'NB' | 'NT' | 'LB' | 'LT' | 'SB' | 'ST';

// 默认值
export const MESH_DEFAULTS = {
  THEME_COLOR: '#3b82f6',
  FONT_COLOR: '#1f2937',
} as const;

// Point API 数据类型
export interface PointData {
  _id: string;
  mesh: {
    x: number;
    y: number;
    themeColor?: string;
    borderColor?: BorderValue;
    borderMode?: BorderValue;
    fontColor?: string;
    fontMode?: FontMode;
  };
  heart: {
    名字: string;
    头像: string[];
    外号: string[];
    性别: string | null;
    初识: number;
    联系: number | boolean | null;
    生日: number | null;
    身份: string;
    称呼: string;
    辈分: string;
    关系: string;
    阵营: string;
    联系方式: Array<{
      账号: string;
      平台: string;
      账号名: string;
      曾用名: string[] | null;
      status: string;
    }>;
    标签: Array<{
      name: string;
      status: string;
      timestamp: number;
    }>;
    备注: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============ Group ============

export interface GroupData {
  _id: string;
  name: string;
  color: string;
  status: 'unchanged' | 'changed' | 'unknown';
  parent: string | null;
  points: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============ Line ============

export interface LineData {
  _id: string;
  points: string[];
  relations: string[];
  status: 'unchanged' | 'changed' | 'unknown';
  color: string;
  createdAt: Date;
  updatedAt: Date;
}
