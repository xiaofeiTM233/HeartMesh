// models/Line.ts
import mongoose, { Schema, Document } from 'mongoose';

// Line 文档接口
export interface ILine extends Document {
  startPoint: {
    id: mongoose.Types.ObjectId; // 起点点 ID
    x: number; // 起点 x 坐标
    y: number; // 起点 y 坐标
  };
  endPoint: {
    id: mongoose.Types.ObjectId; // 终点点 ID
    x: number; // 终点 x 坐标
    y: number; // 终点 y 坐标
  };
  group?: mongoose.Types.ObjectId; // 分组ID (ObjectId类型)
  createdAt: Date;
  updatedAt: Date;
}

// Line Schema
const LineSchema: Schema = new Schema(
  {
    startPoint: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Point',
        required: [true, '起点 ID 是必需的'],
      },
      x: {
        type: Number,
        required: [true, '起点 x 坐标是必需的'],
      },
      y: {
        type: Number,
        required: [true, '起点 y 坐标是必需的'],
      },
    },
    endPoint: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Point',
        required: [true, '终点 ID 是必需的'],
      },
      x: {
        type: Number,
        required: [true, '终点 x 坐标是必需的'],
      },
      y: {
        type: Number,
        required: [true, '终点 y 坐标是必需的'],
      },
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
LineSchema.index({ 'startPoint.id': 1 });
LineSchema.index({ 'endPoint.id': 1 });

export default mongoose.models.Line || mongoose.model<ILine>('Line', LineSchema);