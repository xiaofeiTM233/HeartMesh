// models/Point.ts
import mongoose, { Schema, Document } from 'mongoose';

// Point 文档接口
export interface IPoint extends Document {
  x: number;
  y: number;
  group?: mongoose.Types.ObjectId; // 分组ID (ObjectId类型)
  createdAt: Date;
  updatedAt: Date;
}

// Point Schema
const PointSchema: Schema = new Schema(
  {
    x: {
      type: Number,
      required: [true, 'x 坐标是必需的'],
    },
    y: {
      type: Number,
      required: [true, 'y 坐标是必需的'],
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: false,
    },
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

// 创建索引以优化查询性能
PointSchema.index({ x: 1, y: 1 });

export default mongoose.models.Point || mongoose.model<IPoint>('Point', PointSchema);
