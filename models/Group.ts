// models/Group.ts
import mongoose, { Schema, Document } from 'mongoose';

// Group 文档接口
export interface IGroup extends Document {
  name: string;
  color?: string; // 组的高亮颜色，可选，默认蓝色
  pointIds: mongoose.Types.ObjectId[]; // 组内点 ID 数组
  lineIds: mongoose.Types.ObjectId[]; // 组内线 ID 数组
  createdAt: Date;
  updatedAt: Date;
}

// Group Schema
const GroupSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, '组名称是必需的'],
      trim: true,
    },
    color: {
      type: String,
      default: '#3b82f6', // 默认蓝色
    },
    pointIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Point',
    }],
    lineIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Line',
    }],
  },
  {
    timestamps: true, // 自动添加 createdAt 和 updatedAt
  }
);

// 创建索引以优化查询性能
GroupSchema.index({ name: 1 });

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);