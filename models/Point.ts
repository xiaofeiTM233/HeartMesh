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
    关系: string;
    辈分: string;
    身份: string;
    初识: number | null;
    联系: number | boolean;
    联系方式: Array<{
      账号: string;
      平台: string;
      账号名: string;
      曾用名: string[] | null;
      status: string;
    }>;
    称呼: string;
    阵营: string;
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
    关系: string;
    辈分: string;
    身份: string;
    初识: number | null;
    联系: number | boolean;
    联系方式: Array<{
      账号: string;
      平台: string;
      账号名: string;
      曾用名: string[] | null;
      status: string;
    }>;
    称呼: string;
    阵营: string;
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
      名字: { type: String, required: true },
      头像: { type: [String], default: [] },
      外号: { type: [String], default: [] },
      性别: { type: String, default: null },
      生日: { type: Number, default: null },
      关系: { type: String, required: true },
      辈分: { type: String, default: '' },
      身份: { type: String, default: '' },
      初识: { type: Number, required: true },
      联系: { type: Schema.Types.Mixed, required: true },
      联系方式: [{
        账号: { type: String, required: true },
        平台: { type: String, required: true },
        账号名: { type: String, required: true },
        曾用名: { type: [String], default: null },
        status: { type: String, required: true },
      }],
      称呼: { type: String, default: '' },
      阵营: { type: String, required: true },
      标签: [{
        name: { type: String, required: true },
        status: { type: String, required: true },
        timestamp: { type: Number, required: true },
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
