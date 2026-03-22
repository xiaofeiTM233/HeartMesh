// models/Group.ts
import mongoose, { Schema, Document } from 'mongoose';

// Group 文档接口
export interface IGroup extends Document {
  name: string;
  color: string;
  status: 'unchanged' | 'changed' | 'unknown';
  parent: string | null;
  points: string[];
  createdAt: Date;
  updatedAt: Date;
}

// API 数据类型
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

// Group Schema
const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    color: { type: String, required: true, default: '#3b82f6' },
    status: { type: String, enum: ['unchanged', 'changed', 'unknown'], required: true, default: 'unchanged' },
    parent: { type: String, default: null },
    points: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// 创建索引以优化查询性能
GroupSchema.index({ name: 1 });
GroupSchema.index({ parent: 1 });

export default mongoose.models.Group || mongoose.model<IGroup>('Group', GroupSchema);