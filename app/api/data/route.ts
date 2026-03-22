// app/api/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Point, { PointData } from '@/models/Point';
import Line, { LineData } from '@/models/Line';
import Group, { GroupData } from '@/models/Group';
import mongoose from 'mongoose';

/**
 * 统一的API接口
 * GET: 获取所有数据
 * POST: 根据type和action进行操作
 *   - action: 'create' - 创建新记录（不需要id）
 *   - action: 'update' - 更新记录（需要id）
 *   - action: 'delete' - 删除记录（需要id）
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
    const { type, action, id, data } = body;

    // 验证必填字段
    if (!type || !action) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的请求',
          message: '缺少必要的参数 (type, action)',
        },
        { status: 400 }
      );
    }

    // 创建操作
    if (action === 'create') {
      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: '无效的请求',
            message: '创建操作需要 data 参数',
          },
          { status: 400 }
        );
      }

      // 验证不允许传入_id字段
      if ('_id' in data) {
        return NextResponse.json(
          {
            success: false,
            error: '无效的请求',
            message: '创建操作不能包含 _id 字段',
          },
          { status: 400 }
        );
      }

      let createdDoc;
      switch (type) {
        case 'point':
          // 验证必填字段
          if (!data.position || !data.heart) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'Point 必须包含 position 和 heart 字段',
              },
              { status: 400 }
            );
          }
          if (data.position.x == null || data.position.y == null) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'position 必须包含 x 和 y 字段',
              },
              { status: 400 }
            );
          }

          // 验证外号唯一性
          if (data.heart.外号 && new Set(data.heart.外号).size !== data.heart.外号.length) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: '外号必须唯一',
              },
              { status: 400 }
            );
          }
          // 验证头像唯一性
          if (data.heart.头像 && new Set(data.heart.头像).size !== data.heart.头像.length) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: '头像必须唯一',
              },
              { status: 400 }
            );
          }
          createdDoc = await Point.create(data);
          break;
        case 'line':
          // 验证必填字段
          if (!data.points || !Array.isArray(data.points) || data.points.length !== 2) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'line 必须包含 points 数组，且包含2个点',
              },
              { status: 400 }
            );
          }
          if (!data.relations || !Array.isArray(data.relations) || data.relations.length < 1 || data.relations.length > 2) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'line 必须包含 relations 数组，且包含1-2个关系描述',
              },
              { status: 400 }
            );
          }
          if (new Set(data.points).size !== 2) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'points 必须包含2个唯一点',
              },
              { status: 400 }
            );
          }
          if (new Set(data.relations).size !== data.relations.length) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'relations 必须包含唯一的关系描述',
              },
              { status: 400 }
            );
          }
          createdDoc = await Line.create(data);
          break;
        case 'group':
          // 验证必填字段
          if (!data.name || !data.color || !data.status) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'group 必须包含 name、color、status 字段',
              },
              { status: 400 }
            );
          }
          if (!['unchanged', 'changed', 'unknown'].includes(data.status)) {
            return NextResponse.json(
              {
                success: false,
                error: '无效的请求',
                message: 'status 必须是 unchanged、changed 或 unknown',
              },
              { status: 400 }
            );
          }
          createdDoc = await Group.create(data);
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

      return NextResponse.json({
        success: true,
        data: createdDoc,
      });
    }

    // 更新和删除操作需要id
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的请求',
          message: '更新和删除操作需要 id 参数',
        },
        { status: 400 }
      );
    }

    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: '无效的ID',
          message: `ID ${id} 不是有效的 ObjectId 格式`,
        },
        { status: 400 }
      );
    }

    // 更新操作
    if (action === 'update') {
      if (!data) {
        return NextResponse.json(
          {
            success: false,
            error: '无效的请求',
            message: '更新操作需要 data 参数',
          },
          { status: 400 }
        );
      }

      let updatedDoc;
      switch (type) {
        case 'point':
          updatedDoc = await Point.findByIdAndUpdate(
            id,
            data,
            {
              returnDocument: 'after',
              runValidators: true,
            }
          );
          break;
        case 'line':
          updatedDoc = await Line.findByIdAndUpdate(
            id,
            data,
            {
              returnDocument: 'after',
              runValidators: true,
            }
          );
          break;
        case 'group':
          updatedDoc = await Group.findByIdAndUpdate(
            id,
            data,
            {
              returnDocument: 'after',
              runValidators: true,
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

      // 检查是否真的更新了文档
      if (updatedDoc._id.toString() !== id) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID不匹配',
            message: `请求的ID ${id} 与实际文档ID不匹配`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedDoc,
      });
    }

    // 删除操作
    if (action === 'delete') {
      let deletedDoc;
      switch (type) {
        case 'point':
          deletedDoc = await Point.findByIdAndDelete(id);
          break;
        case 'line':
          deletedDoc = await Line.findByIdAndDelete(id);
          break;
        case 'group':
          deletedDoc = await Group.findByIdAndDelete(id);
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

      if (!deletedDoc) {
        return NextResponse.json(
          {
            success: false,
            error: `${type}不存在`,
            message: `ID 为 ${id} 的${type}不存在`,
          },
          { status: 404 }
        );
      }

      // 检查是否真的删除了文档
      if (deletedDoc._id.toString() !== id) {
        return NextResponse.json(
          {
            success: false,
            error: 'ID不匹配',
            message: `请求的ID ${id} 与实际文档ID不匹配`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: deletedDoc,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: '无效的action',
        message: `action 必须是 create、update 或 delete 之一,收到: ${action}`,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('操作失败:', error);
    
    // 处理 Mongoose 验证错误
    if (error instanceof Error && error.name === 'ValidationError') {
      console.error('Validation Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: '数据验证失败',
          message: error.message,
          details: error.stack,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '操作失败',
        message: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}
