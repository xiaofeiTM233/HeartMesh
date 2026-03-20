// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Point from '@/models/Point';
import Line from '@/models/Line';
import Group from '@/models/Group';

/**
 * 统一的API接口
 * GET: 获取所有数据
 * POST: 根据type和id更新对应的数据
 */

// 获取所有数据
export async function GET() {
  try {
    // 连接数据库
    await dbConnect();

    // 并行查询所有数据
    const [points, lines, groups] = await Promise.all([
      Point.find({}).lean(),
      Line.find({}).lean(),
      Group.find({}).lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        points,
        lines,
        groups,
      },
    });
  } catch (error) {
    console.error('获取数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取数据失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

// 更新数据
export async function POST(request: NextRequest) {
  try {
    // 连接数据库
    await dbConnect();

    // 解析请求体
    const body = await request.json();
    const { type, id, data } = body;

    // 验证必填字段
    if (!type || !id || !data) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的请求',
          message: '缺少必要的参数',
        },
        { status: 400 }
      );
    }

    // 根据type决定更新哪个模型
    let updatedDoc;
    switch (type) {
      case 'point':
        updatedDoc = await Point.findByIdAndUpdate(
          id,
          data,
          {
            new: true,
            runValidators: true,
            context: 'query',
          }
        );
        break;
      case 'line':
        updatedDoc = await Line.findByIdAndUpdate(
          id,
          data,
          {
            new: true,
            runValidators: true,
            context: 'query',
          }
        );
        break;
      case 'group':
        updatedDoc = await Group.findByIdAndUpdate(
          id,
          data,
          {
            new: true,
            runValidators: true,
            context: 'query',
          }
        );
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: '无效的type',
            message: 'type 必须是 point、line 或 group 之一',
          },
          { status: 400 }
        );
    }

    // 检查文档是否存在
    if (!updatedDoc) {
      return NextResponse.json(
        {
          success: false,
          error: `${type}不存在`,
          message: `ID 为 ${id} 的${type}不存在`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedDoc,
    });
  } catch (error) {
    console.error('更新数据失败:', error);
    
    // 处理 Mongoose 验证错误
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '更新数据失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
