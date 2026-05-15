// models/Point.ts
import mongoose, { Schema, Document } from 'mongoose';

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
// 线型字母：S=solid, D=dashed, O=dotted, W=double
// 粗细数字：1=细, 2=普通, 3=粗
// 隐藏：X
export type BorderMode = 'S1' | 'S2' | 'S3' | 'D1' | 'D2' | 'D3' | 'O1' | 'O2' | 'O3' | 'W1' | 'W2' | 'W3' | 'X';

// 字体模式
// N=Normal, L=Larger, S=Smaller
// B=Bold, T=Thin
export type FontMode = 'NN' | 'NB' | 'NT' | 'LB' | 'LT' | 'SB' | 'ST';

// 默认值
export const MESH_DEFAULTS = {
  THEME_COLOR: '#3b82f6',
  FONT_COLOR: '#1f2937',
} as const;

// Point 文档接口
export interface IPoint extends Document {
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

// API 数据类型
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

// Point Schema
const PointSchema: Schema = new Schema(
  {
    mesh: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      themeColor: { type: String, default: MESH_DEFAULTS.THEME_COLOR },
      borderColor: { type: Schema.Types.Mixed, default: null },
      borderMode: { type: Schema.Types.Mixed, default: null },
      fontColor: { type: String, default: MESH_DEFAULTS.FONT_COLOR },
      fontMode: { type: String, default: null },
    },
    heart: {
      名字: { type: String, default: '' },
      头像: { type: [String], default: [] },
      外号: { type: [String], default: [] },
      性别: { type: String, default: null },
      初识: { type: Number, default: null },
      联系: { type: Schema.Types.Mixed, default: null },
      生日: { type: Number, default: null },
      身份: { type: String, default: '' },
      称呼: { type: String, default: '' },
      辈分: { type: String, default: '' },
      关系: { type: String, default: '' },
      阵营: { type: String, default: '' },
      联系方式: [{
        账号: { type: String, default: '' },
        平台: { type: String, default: '' },
        账号名: { type: String, default: '' },
        曾用名: { type: [String], default: [] },
        status: { type: String, default: '' },
      }],
      标签: [{
        name: { type: String, default: '' },
        status: { type: String, default: '' },
        timestamp: { type: Number, default: null },
      }],
      备注: { type: String, default: '' },
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以优化查询性能
PointSchema.index({ 'mesh.x': 1, 'mesh.y': 1 });
PointSchema.index({ 'heart.阵营': 1 });

export default mongoose.models.Point || mongoose.model<IPoint>('Point', PointSchema);
