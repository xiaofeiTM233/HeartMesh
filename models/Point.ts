// models/Point.ts
import mongoose, { Schema, Document } from 'mongoose';
import type { BorderValue, FontMode } from './types';
import { MESH_DEFAULTS } from './types';

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
