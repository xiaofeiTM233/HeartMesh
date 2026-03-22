// models/Line.ts
import mongoose, { Schema, Document } from 'mongoose';

// Line 文档接口
export interface ILine extends Document {
  points: string[];
  relations: string[];
  status: 'unchanged' | 'changed' | 'unknown';
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// API 数据类型
export interface LineData {
  _id: string;
  points: string[];
  relations: string[];
  status: 'unchanged' | 'changed' | 'unknown';
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Line Schema
const LineSchema: Schema = new Schema(
  {
    points: { type: [String], required: true },
    relations: { type: [String], required: true },
    status: { type: String, enum: ['unchanged', 'changed', 'unknown'], required: true, default: 'unchanged' },
    color: { type: String, required: true, default: '#808080' },
  },
  {
    timestamps: true,
  }
);

// 创建索引以优化查询性能
LineSchema.index({ points: 1 });

export default mongoose.models.Line || mongoose.model<ILine>('Line', LineSchema);