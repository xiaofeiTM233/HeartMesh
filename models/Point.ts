// models/Point.ts
import mongoose, { Schema, Document } from 'mongoose';

// Point 文档接口
export interface IPoint extends Document {
  position: {
    x: number;
    y: number;
  };
  heart: {
    名字: string;
    头像: string[];
    外号: string[];
    性别: string | null;
    生日: number | null;
    关系: string | null;
    辈分: string | null;
    身份: string | null;
    初识: number | null;
    联系: number | boolean | null;
    联系方式: Array<{
      账号: string;
      平台: string;
      账号名: string;
      曾用名: string[] | null;
      status: string;
    }>;
    称呼: string | null;
    阵营: string | null;
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
  position: {
    x: number;
    y: number;
  };
  heart: {
    名字: string;
    头像: string[];
    外号: string[];
    性别: string | null;
    生日: number | null;
    关系: string | null;
    辈分: string | null;
    身份: string | null;
    初识: number | null;
    联系: number | boolean | null;
    联系方式: Array<{
      账号: string;
      平台: string;
      账号名: string;
      曾用名: string[] | null;
      status: string;
    }>;
    称呼: string | null;
    阵营: string | null;
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
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
    heart: {
      名字: { type: String, default: '' },
      头像: { type: [String], default: [] },
      外号: { type: [String], default: [] },
      性别: { type: String, default: null },
      生日: { type: Number, default: null },
      关系: { type: String, default: null },
      辈分: { type: String, default: null },
      身份: { type: String, default: null },
      初识: { type: Number, default: null },
      联系: { type: Schema.Types.Mixed, default: null },
      联系方式: [{
        账号: { type: String, default: '' },
        平台: { type: String, default: '' },
        账号名: { type: String, default: '' },
        曾用名: { type: [String], default: [] },
        status: { type: String, default: '' },
      }],
      称呼: { type: String, default: null },
      阵营: { type: String, default: null },
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
PointSchema.index({ 'position.x': 1, 'position.y': 1 });
PointSchema.index({ 'heart.阵营': 1 });

export default mongoose.models.Point || mongoose.model<IPoint>('Point', PointSchema);
