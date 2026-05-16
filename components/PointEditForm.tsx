// components/PointEditForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { Form, Input, Button, Select, Collapse, Tag, Space, App, Modal, Divider, Empty, ColorPicker, DatePicker, InputNumber } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined, FolderOutlined, LogoutOutlined, MinusCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { PointData, LineData, GroupData } from '@/models/types';

export interface PointEditFormProps {
  point: PointData | null;
  points: PointData[];
  lines: LineData[];
  groups: GroupData[];
  form: FormInstance;
  /** 模式: 'drawer' 用于侧边栏内嵌, 'page' 用于独立页面 */
  mode?: 'drawer' | 'page';
  onUpdatePoint: (point: PointData, data: Partial<PointData>) => Promise<void>;
  onUpdateLine: (line: LineData, data: Partial<LineData>) => Promise<void>;
  onUpdateGroup: (group: GroupData, data: Partial<GroupData>) => Promise<void>;
  onCreatePoint: (pointData: PointData) => Promise<void>;
  onCreateLine: (data: { startPointId: string; endPointId: string; relations?: string[]; status?: string; color?: string }) => Promise<void>;
  onCreateGroup: (data: { name: string; color: string; status?: string; parent?: string | null }) => Promise<GroupData | null>;
  onDeletePoint: (pointId: string) => Promise<void>;
  onDeleteLine: (lineId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onClose?: () => void;
  /** 独立页面模式下，保存后的回调（如返回列表） */
  onSaved?: () => void;
}

// ============ 边框配置子组件 ============

const MODE_OPTIONS = [
  { label: '全局 (所有边统一)', value: 'string' },
  { label: '上下分组', value: 'T2' },
  { label: '逐边控制 (6边)', value: 'T1' },
] as const;

const BORDER_MODE_OPTIONS = [
  { label: '标准实线 S1', value: 'S1' },
  { label: '中等实线 S2', value: 'S2' },
  { label: '粗实线 S3', value: 'S3' },
  { label: '细虚线 D1', value: 'D1' },
  { label: '中等虚线 D2', value: 'D2' },
  { label: '粗虚线 D3', value: 'D3' },
  { label: '细点线 O1', value: 'O1' },
  { label: '中等点线 O2', value: 'O2' },
  { label: '粗点线 O3', value: 'O3' },
  { label: '细双线 W1', value: 'W1' },
  { label: '中等双线 W2', value: 'W2' },
  { label: '粗双线 W3', value: 'W3' },
  { label: '隐藏 X', value: 'X' },
];

type BorderConfigMode = typeof MODE_OPTIONS[number]['value'];

// ============ 推断值类型对应的模式 ============
function inferMode(val: any): BorderConfigMode | null {
  if (!val) return null;
  if (typeof val === 'string') return 'string';
  if ('T1' in val || 'T2' in val || 'T3' in val || 'B1' in val || 'B2' in val || 'B3' in val) return 'T1';
  if ('T' in val || 'B' in val) return 'T2';
  return null;
}

// ============ 根据模式初始化默认结构 ============
function initValue(mode: BorderConfigMode): any {
  if (mode === 'string') return 'S1';
  if (mode === 'T2') return { T: 'S1', B: 'X' };
  if (mode === 'T1') return { T1: 'S1', T2: 'S1', T3: 'S1', B1: 'X', B2: 'X', B3: 'X' };
  return undefined;
}

function initColor(mode: BorderConfigMode): any {
  if (mode === 'string') return undefined;
  if (mode === 'T2') return { T: '#000000', B: '#cccccc' };
  if (mode === 'T1') return { T1: '#000000', T2: '#000000', T3: '#000000', B1: '#cccccc', B2: '#cccccc', B3: '#cccccc' };
  return undefined;
}

// ============ 渲染单个字段（根据模式） ============
function renderFieldByMode(form: FormInstance, fieldName: string | string[], mode: BorderConfigMode, isColor: boolean) {
  // string 模式
  if (mode === 'string') {
    if (isColor) {
      return (
        <Form.Item
          name={fieldName as string}
          label=""
          getValueFromEvent={(c: any) => c?.toHexString?.() ?? c}
          getValueProps={(v: any) => ({ value: v })}
        >
          <ColorPicker format="hex" />
        </Form.Item>
      );
    }
    return (
      <Form.Item name={fieldName as string} label="">
        <Select options={BORDER_MODE_OPTIONS} />
      </Form.Item>
    );
  }

  // T2 上下分组模式
  if (mode === 'T2') {
    return (
      <>
        <div className="bg-blue-50 p-3 rounded mb-2">
          <div className="text-sm font-medium text-blue-700 mb-2">上边 (T)</div>
          {isColor ? (
            <Form.Item name={[...fieldName as string[], 'T']} label="" style={{ marginBottom: 0 }} getValueFromEvent={(c: any) => c?.toHexString?.() ?? c} getValueProps={(v: any) => ({ value: v })}>
              <ColorPicker format="hex" />
            </Form.Item>
          ) : (
            <Form.Item name={[...fieldName as string[], 'T']} label="" style={{ marginBottom: 0 }}>
              <Select options={BORDER_MODE_OPTIONS} popupMatchSelectWidth={false} />
            </Form.Item>
          )}
        </div>
        <div className="bg-green-50 p-3 rounded" style={{ marginBottom: 0 }}>
          <div className="text-sm font-medium text-green-700 mb-2">下边 (B)</div>
          {isColor ? (
            <Form.Item name={[...fieldName as string[], 'B']} label="" style={{ marginBottom: 0 }} getValueFromEvent={(c: any) => c?.toHexString?.() ?? c} getValueProps={(v: any) => ({ value: v })}>
              <ColorPicker format="hex" />
            </Form.Item>
          ) : (
            <Form.Item name={[...fieldName as string[], 'B']} label="" style={{ marginBottom: 0 }}>
              <Select options={BORDER_MODE_OPTIONS} popupMatchSelectWidth={false} />
            </Form.Item>
          )}
        </div>
      </>
    );
  }

  // T1 逐边控制模式
  const topKeys = ['T1', 'T2', 'T3'];
  const bottomKeys = ['B1', 'B2', 'B3'];
  return (
    <div className="space-y-3">
      {/* 上排 */}
      <div className="flex gap-3">
        {topKeys.map(key => (
          <div key={key} className={`flex-1 bg-blue-50 p-2 rounded space-y-2`}>
            <div className="text-xs font-medium text-blue-600">{key}</div>
            {isColor ? (
              <Form.Item name={[...(Array.isArray(fieldName) ? fieldName : [fieldName]), key]} style={{ marginBottom: 0 }} getValueFromEvent={(c: any) => c?.toHexString?.() ?? c} getValueProps={(v: any) => ({ value: v })}>
                <ColorPicker format="hex" />
              </Form.Item>
            ) : (
              <Form.Item name={[...(Array.isArray(fieldName) ? fieldName : [fieldName]), key]} style={{ marginBottom: 0 }}>
                <Select options={BORDER_MODE_OPTIONS} popupMatchSelectWidth={false} />
              </Form.Item>
            )}
          </div>
        ))}
      </div>
      {/* 下排 */}
      <div className="flex gap-3">
        {bottomKeys.map(key => (
          <div key={key} className={`flex-1 bg-green-50 p-2 rounded space-y-2`}>
            <div className="text-xs font-medium text-green-600">{key}</div>
            {isColor ? (
              <Form.Item name={[...(Array.isArray(fieldName) ? fieldName : [fieldName]), key]} style={{ marginBottom: 0 }} getValueFromEvent={(c: any) => c?.toHexString?.() ?? c} getValueProps={(v: any) => ({ value: v })}>
                <ColorPicker format="hex" />
              </Form.Item>
            ) : (
              <Form.Item name={[...(Array.isArray(fieldName) ? fieldName : [fieldName]), key]} style={{ marginBottom: 0 }}>
                <Select options={BORDER_MODE_OPTIONS} popupMatchSelectWidth={false} />
              </Form.Item>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ 边框配置（线型和颜色独立模式） ============
function BorderConfig({ form }: { form: FormInstance }) {
  // 线型模式状态
  const [lineMode, setLineMode] = useState<BorderConfigMode | null>(() => inferMode(form.getFieldValue('borderMode')));
  // 颜色模式状态
  const [colorMode, setColorMode] = useState<BorderConfigMode | null>(() => inferMode(form.getFieldValue('borderColor')));

  const handleLineModeChange = (mode: BorderConfigMode | null) => {
    setLineMode(mode);
    if (!mode) {
      form.setFieldValue('borderMode', undefined);
      return;
    }
    form.setFieldValue('borderMode', initValue(mode));
  };

  const handleColorModeChange = (mode: BorderConfigMode | null) => {
    setColorMode(mode);
    if (!mode) {
      form.setFieldValue('borderColor', undefined);
      return;
    }
    form.setFieldValue('borderColor', initColor(mode));
  };

  return (
    <div className="space-y-4">
      {/* ========== 线型配置 ========== */}
      <div className="space-y-2">
        <Form.Item label="线型配置模式" style={{ marginBottom: 4 }}>
          <Select allowClear placeholder="选择线型配置模式" value={lineMode} onChange={handleLineModeChange} options={MODE_OPTIONS.map(o => ({ ...o }))} />
        </Form.Item>
        {lineMode ? renderFieldByMode(form, 'borderMode', lineMode, false) : (
          <div className="text-xs text-gray-400">未配置线型（使用默认样式）</div>
        )}
      </div>

      {/* ========== 颜色配置 ========== */}
      <div className="space-y-2">
        <Form.Item label="颜色配置模式" style={{ marginBottom: 4 }}>
          <Select allowClear placeholder="选择颜色配置模式" value={colorMode} onChange={handleColorModeChange} options={MODE_OPTIONS.map(o => ({ ...o }))} />
        </Form.Item>
        {colorMode ? renderFieldByMode(form, 'borderColor', colorMode, true) : (
          <div className="text-xs text-gray-400">未配置颜色（使用默认样式）</div>
        )}
      </div>

      <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
        线型: S=实线, D=虚线, O=点线, W=双线; 数字 1/2/3 = 细/中/粗; X=隐藏
      </div>
    </div>
  );
}

export default function PointEditForm({
  point: selectedPoint,
  points,
  lines,
  groups,
  form,
  mode = 'drawer',
  onUpdatePoint,
  onUpdateLine,
  onUpdateGroup,
  onCreatePoint,
  onCreateLine,
  onCreateGroup,
  onDeletePoint,
  onDeleteLine,
  onDeleteGroup,
  onClose,
  onSaved,
}: PointEditFormProps) {
  const { message } = App.useApp();
  const [addLineForm] = Form.useForm();
  const [addLineModalOpen, setAddLineModalOpen] = useState(false);
  const [editLineForm] = Form.useForm();
  const [editLineModalOpen, setEditLineModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<LineData | null>(null);
  const [addGroupForm] = Form.useForm();
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [editGroupForm] = Form.useForm();
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupData | null>(null);

  // 获取当前点关联的线
  const pointLines = useMemo(() => {
    if (!selectedPoint) return [];
    return lines.filter(line => line.points.includes(selectedPoint._id));
  }, [lines, selectedPoint]);

  // 获取当前点所属的组
  const pointGroup = useMemo(() => {
    if (!selectedPoint || !selectedPoint.heart.阵营) return null;
    return groups.find(g => g._id === selectedPoint.heart.阵营) || null;
  }, [groups, selectedPoint]);

  // 计算表单初始值
  const initialFormValues = useMemo(() => {
    if (!selectedPoint) return {};
    return {
      positionX: selectedPoint.mesh.x,
      positionY: selectedPoint.mesh.y,
      themeColor: selectedPoint.mesh.themeColor || undefined,
      borderColor: selectedPoint.mesh.borderColor,
      borderMode: selectedPoint.mesh.borderMode,
      fontColor: selectedPoint.mesh.fontColor || undefined,
      fontMode: selectedPoint.mesh.fontMode || undefined,
      name: selectedPoint.heart.名字 || '',
      avatars: selectedPoint.heart.头像 || [],
      nicknames: selectedPoint.heart.外号 || [],
      gender: selectedPoint.heart.性别 || undefined,
      birthday: selectedPoint.heart.生日 ? dayjs(selectedPoint.heart.生日) : undefined,
      relation: selectedPoint.heart.关系 || '',
      generation: selectedPoint.heart.辈分 || '',
      identity: selectedPoint.heart.身份 || '',
      firstMet: selectedPoint.heart.初识 ? dayjs(selectedPoint.heart.初识) : undefined,
      contact: typeof selectedPoint.heart.联系 === 'number' ? selectedPoint.heart.联系 : (selectedPoint.heart.联系 ? 1 : 0),
      contacts: selectedPoint.heart.联系方式 || [],
      salutation: selectedPoint.heart.称呼 || '',
      tags: selectedPoint.heart.标签 || [],
      notes: selectedPoint.heart.备注 || '',
    };
  }, [selectedPoint]);

  // 处理点编辑表单提交
  const handlePointSubmit = async (values: Record<string, any>) => {
    if (!selectedPoint) return;

    const updateData: Partial<PointData> = {
      mesh: {
        x: values.positionX ?? selectedPoint.mesh.x,
        y: values.positionY ?? selectedPoint.mesh.y,
        themeColor: values.themeColor ?? selectedPoint.mesh.themeColor,
        borderColor: values.borderColor ?? selectedPoint.mesh.borderColor,
        borderMode: values.borderMode ?? selectedPoint.mesh.borderMode,
        fontColor: values.fontColor ?? selectedPoint.mesh.fontColor,
        fontMode: values.fontMode ?? selectedPoint.mesh.fontMode,
      },
      heart: {
        ...selectedPoint.heart,
        名字: values.name ?? selectedPoint.heart.名字,
        头像: values.avatars ?? selectedPoint.heart.头像,
        外号: values.nicknames ?? selectedPoint.heart.外号,
        性别: values.gender ?? selectedPoint.heart.性别,
        生日: values.birthday ? values.birthday.valueOf() : selectedPoint.heart.生日,
        关系: values.relation ?? selectedPoint.heart.关系,
        辈分: values.generation ?? selectedPoint.heart.辈分,
        身份: values.identity ?? selectedPoint.heart.身份,
        初识: values.firstMet ? values.firstMet.valueOf() : selectedPoint.heart.初识,
        联系: values.contact ?? selectedPoint.heart.联系,
        联系方式: values.contacts ?? selectedPoint.heart.联系方式,
        称呼: values.salutation ?? selectedPoint.heart.称呼,
        标签: values.tags ?? selectedPoint.heart.标签,
        备注: values.notes ?? selectedPoint.heart.备注,
      },
    };

    if (!selectedPoint._id) {
      try {
        const { _id, createdAt, updatedAt, ...createData } = selectedPoint as any;
        await onCreatePoint({ ...createData, ...updateData });
        onClose?.();
      } catch (error) {
        console.error('创建失败:', error);
        message.error('创建失败');
      }
      return;
    }

    try {
      await onUpdatePoint(selectedPoint, updateData);
      message.success('保存成功');
      onSaved?.();
      onClose?.();
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败');
    }
  };

  // 删除点
  const handleDeletePoint = async () => {
    if (!selectedPoint) return;
    try {
      await onDeletePoint(selectedPoint._id);
      message.success('删除成功');
      onClose?.();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  // ===== 线操作 =====
  const handleOpenAddLineModal = () => {
    addLineForm.resetFields();
    if (selectedPoint) {
      addLineForm.setFieldsValue({ startPointId: selectedPoint._id });
    }
    setAddLineModalOpen(true);
  };

  const handleAddLine = async (values: { endPointId: string; relations?: string[]; status?: string; color?: string }) => {
    if (!selectedPoint) return;

    const existingLine = lines.find(line =>
      line.points.includes(selectedPoint._id) && line.points.includes(values.endPointId)
    );

    if (existingLine) {
      message.warning('两点之间已存在连接');
      return;
    }

    try {
      await onCreateLine({
        startPointId: selectedPoint._id,
        endPointId: values.endPointId,
        relations: values.relations && values.relations.length > 0
          ? values.relations
          : [`${selectedPoint.heart.名字} → ${points.find(p => p._id === values.endPointId)?.heart.名字 || values.endPointId}`],
        status: values.status || 'unchanged',
        color: values.color || '#FFD700',
      });
      message.success('线创建成功');
      setAddLineModalOpen(false);
      addLineForm.resetFields();
    } catch (error) {
      console.error('创建线失败:', error);
      message.error('创建线失败');
    }
  };

  const handleOpenEditLineModal = (line: LineData) => {
    setEditingLine(line);
    editLineForm.setFieldsValue({
      startPointId: line.points[0],
      endPointId: line.points[1],
      relations: line.relations,
      status: line.status,
      color: line.color,
    });
    setEditLineModalOpen(true);
  };

  const handleEditLine = async (values: { startPointId: string; endPointId: string; relations?: string[]; status?: string; color?: string }) => {
    if (!editingLine) return;
    try {
      await onUpdateLine(editingLine, {
        points: [values.startPointId, values.endPointId],
        relations: values.relations || editingLine.relations,
        status: (values.status || editingLine.status) as LineData['status'],
        color: values.color || editingLine.color,
      });
      message.success('线更新成功');
      setEditLineModalOpen(false);
      setEditingLine(null);
    } catch (error) {
      console.error('更新线失败:', error);
      message.error('更新线失败');
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    try {
      await onDeleteLine(lineId);
      message.success('线删除成功');
    } catch (error) {
      console.error('删除线失败:', error);
      message.error('删除线失败');
    }
  };

  // ===== 组操作 =====
  const handleOpenAddGroupModal = () => {
    addGroupForm.resetFields();
    addGroupForm.setFieldsValue({ color: '#3b82f6', status: 'unchanged', parent: null });
    setAddGroupModalOpen(true);
  };

  const handleAddGroup = async (values: { name: string; color: string; status: string; parent: string | null }) => {
    try {
      const newGroup = await onCreateGroup({
        name: values.name,
        color: values.color,
        status: values.status,
        parent: values.parent || null,
      });
      if (newGroup && selectedPoint) {
        await onUpdatePoint(selectedPoint, {
          heart: { ...selectedPoint.heart, 阵营: newGroup._id },
        });
      }
      message.success('组创建成功');
      setAddGroupModalOpen(false);
      addGroupForm.resetFields();
    } catch (error) {
      console.error('创建组失败:', error);
      message.error('创建组失败');
    }
  };

  const handleOpenEditGroupModal = (group: GroupData) => {
    setEditingGroup(group);
    editGroupForm.setFieldsValue({
      name: group.name,
      color: group.color,
      status: group.status,
      parent: group.parent || null,
    });
    setEditGroupModalOpen(true);
  };

  const handleEditGroup = async (values: { name: string; color: string; status: string; parent: string | null }) => {
    if (!editingGroup) return;
    try {
      await onUpdateGroup(editingGroup, {
        name: values.name,
        color: values.color,
        status: values.status as GroupData['status'],
        parent: values.parent || null,
      });
      message.success('组更新成功');
      setEditGroupModalOpen(false);
      setEditingGroup(null);
    } catch (error) {
      console.error('更新组失败:', error);
      message.error('更新组失败');
    }
  };

  // 渲染表单内容
  const renderFormContent = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handlePointSubmit}
      key={selectedPoint?._id || 'new'}
      initialValues={initialFormValues}
    >
      {selectedPoint ? (
        <>
          {/* 页面模式的头部 */}
          {mode === 'page' && (
            <div className="mb-4">
              <Button icon={<ArrowLeftOutlined />} onClick={() => onSaved?.()}>
                返回列表
              </Button>
            </div>
          )}

          {/* 点基本信息 */}
          <div className="mb-4">
            <div>
              <span className="text-gray-500 text-sm">ID:</span>
              <Tag color="blue">{selectedPoint._id}</Tag>
            </div>
          </div>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
              <Button danger onClick={handleDeletePoint}>
                <DeleteOutlined />
                删除
              </Button>
              {mode === 'page' && onClose && (
                <Button onClick={onClose}>关闭</Button>
              )}
            </Space>
          </Form.Item>

          <Divider />

          <Collapse
            defaultActiveKey={['mesh', 'heart']}
            items={[
              {
                key: 'mesh',
                label: 'mesh',
                children: (
                  <div className="space-y-3">
                    <Space style={{ width: '100%' }}>
                      <Form.Item name="positionX" label="x" style={{ marginBottom: 0 }}>
                        <InputNumber style={{ width: 100 }} />
                      </Form.Item>
                      <Form.Item name="positionY" label="y" style={{ marginBottom: 0 }}>
                        <InputNumber style={{ width: 100 }} />
                      </Form.Item>
                    </Space>

                    {/* 样式字段 */}
                    <div className="flex gap-3">
                      <div className="flex-1 bg-purple-50 p-3 rounded space-y-2">
                        <div className="text-sm font-medium text-purple-700">主题色</div>
                        <Form.Item name="themeColor" style={{ marginBottom: 0 }}>
                          <ColorPicker format="hex" />
                        </Form.Item>
                      </div>

                      <div className="flex-1 bg-orange-50 p-3 rounded space-y-2">
                        <div className="text-sm font-medium text-orange-700">字体颜色</div>
                        <Form.Item name="fontColor" style={{ marginBottom: 0 }}>
                          <ColorPicker format="hex" />
                        </Form.Item>
                      </div>

                      <div className="flex-1 bg-teal-50 p-3 rounded space-y-2">
                        <div className="text-sm font-medium text-teal-700">字体模式</div>
                        <Form.Item name="fontMode" style={{ marginBottom: 0 }}>
                          <Select
                            allowClear
                            placeholder="选择模式"
                            options={[
                              { label: 'NN (正常)', value: 'NN' },
                              { label: 'NB (加粗)', value: 'NB' },
                              { label: 'NT (大字+粗)', value: 'NT' },
                              { label: 'LB (大字)', value: 'LB' },
                              { label: 'LT (大字+细)', value: 'LT' },
                              { label: 'SB (小字)', value: 'SB' },
                              { label: 'ST (小字+细)', value: 'ST' },
                            ]}
                            popupMatchSelectWidth={false}
                          />
                        </Form.Item>
                      </div>
                    </div>

                    {/* 边框配置 */}
                    <BorderConfig form={form} />
                  </div>
                ),
              },
              {
                key: 'heart',
                label: 'heart',
                children: (
                  <>
                    <Form.Item name="name" label="名字" rules={[{ required: true, message: '请输入名字' }]}>
                      <Input placeholder="请输入名字" />
                    </Form.Item>
                    <Form.Item name="avatars" label="头像">
                      <Select mode="tags" placeholder="输入头像URL后按回车" />
                    </Form.Item>
                    <Form.Item name="nicknames" label="外号">
                      <Select mode="tags" placeholder="输入外号后按回车" />
                    </Form.Item>
                    <Form.Item name="gender" label="性别">
                      <Select
                        allowClear
                        placeholder="请选择性别"
                        options={[
                          { label: '男', value: '男' },
                          { label: '女', value: '女' },
                          { label: '未知', value: '未知' },
                          { label: '伪男', value: '伪男' },
                          { label: '伪娘', value: '伪娘' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="firstMet" label="初识">
                      <DatePicker style={{ width: '100%' }} placeholder="请选择初识日期" />
                    </Form.Item>
                    <Form.Item name="contact" label="联系">
                      <InputNumber min={0} max={10} style={{ width: '100%' }} placeholder="时间戳或0-10" />
                    </Form.Item>
                    <Form.Item name="birthday" label="生日">
                      <DatePicker style={{ width: '100%' }} placeholder="请选择生日" />
                    </Form.Item>
                    <Form.Item name="identity" label="身份">
                      <Input placeholder="请输入身份" />
                    </Form.Item>
                    <Form.Item name="salutation" label="称呼">
                      <Input placeholder="请输入称呼" />
                    </Form.Item>
                    <Form.Item name="generation" label="辈分">
                      <Input placeholder="请输入辈分" />
                    </Form.Item>
                    <Form.Item name="relation" label="关系">
                      <Input placeholder="请输入关系" />
                    </Form.Item>
                    <Form.Item name="contacts" label="联系方式">
                      <Form.List name="contacts">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <div key={key} style={{ marginBottom: 12 }}>
                                <Space align="start" wrap>
                                  <Form.Item {...restField} name={[name, '账号名']} label="账号名" style={{ marginBottom: 0 }}>
                                    <Input placeholder="账号名" style={{ width: 120 }} />
                                  </Form.Item>
                                  <Form.Item {...restField} name={[name, '曾用名']} label="曾用名" style={{ marginBottom: 0 }}>
                                    <Select mode="tags" placeholder="曾用名" style={{ width: 120 }} />
                                  </Form.Item>
                                </Space>
                                <Space align="start" wrap>
                                  <Form.Item {...restField} name={[name, '账号']} label="账号" style={{ marginBottom: 0 }}>
                                    <Input placeholder="账号" style={{ width: 120 }} />
                                  </Form.Item>
                                  <Form.Item {...restField} name={[name, '平台']} label="平台" style={{ marginBottom: 0 }}>
                                    <Select placeholder="平台" style={{ width: 100 }} options={[
                                      { label: '微信', value: '微信' },
                                      { label: 'QQ', value: 'QQ' },
                                      { label: '手机', value: '手机' },
                                      { label: '邮箱', value: '邮箱' },
                                      { label: '微博', value: '微博' },
                                      { label: '抖音', value: '抖音' },
                                      { label: '小红书', value: '小红书' },
                                      { label: '其他', value: '其他' },
                                    ]} />
                                  </Form.Item>
                                  <Form.Item {...restField} name={[name, 'status']} label="status" style={{ marginBottom: 0 }}>
                                    <Select placeholder="状态" style={{ width: 100 }} options={[
                                      { label: '正常', value: '正常' },
                                      { label: '已注销', value: '已注销' },
                                      { label: '已冻结', value: '已冻结' },
                                    ]} />
                                  </Form.Item>
                                  <MinusCircleOutlined style={{ marginTop: 8 }} onClick={() => remove(name)} />
                                </Space>
                              </div>
                            ))}
                            <Button type="dashed" onClick={() => add({ 账号名: '', 曾用名: null, 账号: '', 平台: '', status: '正常' })} block icon={<PlusOutlined />}>
                              添加
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                    <Form.Item name="tags" label="标签">
                      <Form.List name="tags">
                        {(fields, { add, remove }) => (
                          <>
                            {fields.map(({ key, name, ...restField }) => (
                              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="start">
                                <Form.Item {...restField} name={[name, 'name']} style={{ marginBottom: 0 }}>
                                  <Input placeholder="标签名" />
                                </Form.Item>
                                <Form.Item {...restField} name={[name, 'status']} style={{ marginBottom: 0 }}>
                                  <Select placeholder="status" style={{ width: 120 }} options={[
                                    { label: '未改变', value: 'unchanged' },
                                    { label: '已改变', value: 'changed' },
                                    { label: '未知', value: 'unknown' },
                                  ]} />
                                </Form.Item>
                                <MinusCircleOutlined style={{ marginTop: 8 }} onClick={() => remove(name)} />
                              </Space>
                            ))}
                            <Button type="dashed" onClick={() => add({ name: '', status: 'unchanged', timestamp: Date.now() })} block icon={<PlusOutlined />}>
                              添加
                            </Button>
                          </>
                        )}
                      </Form.List>
                    </Form.Item>
                    <Form.Item name="notes" label="备注">
                      <Input.TextArea rows={4} placeholder="请输入备注" />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />

          <Divider />

          {/* 线和组的折叠面板 */}
          <Collapse
            defaultActiveKey={['lines', 'group']}
            items={[
              {
                key: 'lines',
                label: (
                  <Space>
                    <LinkOutlined />
                    <span>关联线</span>
                    <Tag color="blue">{pointLines.length}</Tag>
                  </Space>
                ),
                children: (
                  <>
                    {pointLines.length > 0 ? (
                      <div className="space-y-2">
                        {pointLines.map(line => (
                          <div key={line._id} className="p-2 border rounded hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-1">
                              <Space size={4}>
                                <div
                                  style={{
                                    width: 12, height: 12, borderRadius: '50%',
                                    backgroundColor: line.color,
                                    border: '1px solid #d9d9d9',
                                    display: 'inline-block',
                                  }}
                                />
                                <Tag
                                  color={
                                    line.status === 'unchanged' ? 'green' :
                                    line.status === 'changed' ? 'orange' : 'default'
                                  }
                                >
                                  {line.status === 'unchanged' ? '未变化' :
                                   line.status === 'changed' ? '已变化' : '未知'}
                                </Tag>
                              </Space>
                              <Space>
                                <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEditLineModal(line)} />
                                <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDeleteLine(line._id)} />
                              </Space>
                            </div>
                            <div className="text-sm text-gray-600">
                              {line.points[0].slice(-4)} → {line.points[1].slice(-4)}
                              {line.relations[0] && <span className="ml-2 text-gray-400">({line.relations[0]})</span>}
                            </div>
                            {line.relations.length > 1 && (
                              <div className="text-xs text-gray-400 mt-1">
                                {line.relations.slice(1).map((r, i) => <Tag key={i} style={{ fontSize: 11 }}>{r}</Tag>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Empty description="暂无线" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    )}
                    <Button type="dashed" block icon={<PlusOutlined />} onClick={handleOpenAddLineModal} style={{ marginTop: 12 }}>
                      添加线
                    </Button>
                  </>
                ),
              },
              {
                key: 'group',
                label: (
                  <Space>
                    <FolderOutlined />
                    <span>关联组</span>
                    <Tag color="blue">{pointGroup ? 1 : 0}</Tag>
                  </Space>
                ),
                children: (
                  <>
                    {pointGroup ? (
                      <div className="p-2 border rounded hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <Tag color={pointGroup.color}>{pointGroup.name}</Tag>
                          <Space>
                            <Button type="link" icon={<EditOutlined />} onClick={() => handleOpenEditGroupModal(pointGroup)} />
                            <Button type="link" danger icon={<LogoutOutlined />} onClick={async () => {
                              if (selectedPoint) {
                                try {
                                  await onUpdatePoint(selectedPoint, { heart: { ...selectedPoint.heart, 阵营: '' } });
                                  message.success('已退出组');
                                } catch (error) {
                                  console.error('退出组失败:', error);
                                  message.error('退出组失败');
                                }
                              }
                            }} />
                          </Space>
                        </div>
                        <div className="text-sm text-gray-600">成员点: {pointGroup.points.length} 个</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Select
                          showSearch
                          placeholder="搜索并选择组"
                          style={{ width: '100%' }}
                          options={groups.map(g => ({ label: g.name, value: g._id }))}
                          notFoundContent={groups.length === 0 ? <span className="text-gray-400">暂无组，请创建新组</span> : null}
                          onChange={async (groupId) => {
                            if (groupId && selectedPoint) {
                              await onUpdatePoint(selectedPoint, { heart: { ...selectedPoint.heart, 阵营: groupId } });
                              message.success('已加入组');
                            }
                          }}
                        />
                        <div className="text-center text-gray-400 text-sm">或</div>
                        <Button type="dashed" block icon={<PlusOutlined />} onClick={handleOpenAddGroupModal}>
                          创建组
                        </Button>
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />

          {mode !== 'page' && (
            <>
              <Divider />
              <div className="text-sm text-gray-500">
                <p>已加载 {points.length} 个点, {lines.length} 条线, {groups.length} 个组</p>
              </div>
            </>
          )}
        </>
      ) : (
        <Empty description="请选择一个点进行编辑" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </Form>
  );

  return (
    <>
      {renderFormContent()}

      {/* 添加线弹窗 */}
      <Modal title="添加线" open={addLineModalOpen} onCancel={() => setAddLineModalOpen(false)} footer={null}>
        <Form form={addLineForm} layout="vertical" onFinish={handleAddLine} initialValues={{ status: 'unchanged', color: '#FFD700' }}>
          <Form.Item label="起点">
            <Tag color="blue">{selectedPoint?.heart.名字 || selectedPoint?._id}</Tag>
          </Form.Item>
          <Form.Item name="endPointId" label="终点" rules={[{ required: true, message: '请选择终点' }]}>
            <Select showSearch placeholder="搜索并选择终点" options={points.filter(p => p._id !== selectedPoint?._id).map(p => ({ label: p.heart.名字 || p._id, value: p._id }))} />
          </Form.Item>
          <Form.Item name="relations" label="关系描述">
            <Select mode="tags" placeholder="输入关系描述后按回车添加" tokenSeparators={[',']} maxCount={2} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[
              { label: '未变化', value: 'unchanged' },
              { label: '已变化', value: 'changed' },
              { label: '未知', value: 'unknown' },
            ]} />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setAddLineModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑线弹窗 */}
      <Modal title="编辑线" open={editLineModalOpen} onCancel={() => { setEditLineModalOpen(false); setEditingLine(null); }} footer={null}>
        <Form form={editLineForm} layout="vertical" onFinish={handleEditLine}>
          <Form.Item name="startPointId" label="起点 ID" rules={[{ required: true }]}>
            <Select showSearch placeholder="选择起点" options={points.map(p => ({ label: p.heart.名字 || p._id, value: p._id }))} />
          </Form.Item>
          <Form.Item name="endPointId" label="终点 ID" rules={[{ required: true }]}>
            <Select showSearch placeholder="选择终点" options={points.map(p => ({ label: p.heart.名字 || p._id, value: p._id }))} />
          </Form.Item>
          <Form.Item name="relations" label="关系描述">
            <Select mode="tags" placeholder="输入关系描述后按回车添加" tokenSeparators={[',']} maxCount={2} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[
              { label: '未变化', value: 'unchanged' },
              { label: '已变化', value: 'changed' },
              { label: '未知', value: 'unknown' },
            ]} />
          </Form.Item>
          <Form.Item name="color" label="颜色" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => { setEditLineModalOpen(false); setEditingLine(null); }}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 添加组弹窗 */}
      <Modal title="添加组" open={addGroupModalOpen} onCancel={() => setAddGroupModalOpen(false)} footer={null}>
        <Form form={addGroupForm} layout="vertical" onFinish={handleAddGroup}>
          <Form.Item name="name" label="name" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="color" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="status" label="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[
              { label: '未变化', value: 'unchanged' },
              { label: '已变化', value: 'changed' },
              { label: '未知', value: 'unknown' },
            ]} />
          </Form.Item>
          <Form.Item name="parent" label="parent">
            <Select allowClear showSearch placeholder="选择父组（可选）" options={groups.map(g => ({ label: g.name, value: g._id }))} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={() => setAddGroupModalOpen(false)}>取消</Button>
              <Button type="primary" htmlType="submit">创建</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑组弹窗 */}
      <Modal title="编辑组" open={editGroupModalOpen} onCancel={() => { setEditGroupModalOpen(false); setEditingGroup(null); }} footer={null}>
        <Form form={editGroupForm} layout="vertical" onFinish={handleEditGroup}>
          <Form.Item name="name" label="name" rules={[{ required: true }]}>
            <Input placeholder="请输入组名称" />
          </Form.Item>
          <Form.Item name="color" label="color" getValueFromEvent={(color) => color.toHexString()} getValueProps={(value) => ({ value })}>
            <ColorPicker format="hex" />
          </Form.Item>
          <Form.Item name="status" label="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Select options={[
              { label: '未变化', value: 'unchanged' },
              { label: '已变化', value: 'changed' },
              { label: '未知', value: 'unknown' },
            ]} />
          </Form.Item>
          <Form.Item name="parent" label="parent">
            <Select allowClear showSearch placeholder="选择父组（可选）" options={groups.map(g => ({ label: g.name, value: g._id }))} />
          </Form.Item>
          {editingGroup?.parent && (
            <Form.Item>
              <Button type="link" onClick={() => {
                const parentGroup = groups.find(g => g._id === editingGroup.parent);
                if (parentGroup) {
                  setEditGroupModalOpen(false);
                  handleOpenEditGroupModal(parentGroup);
                } else {
                  message.warning('找不到父组');
                }
              }}>
                进入父组编辑页
              </Button>
            </Form.Item>
          )}
          <Form.Item>
            <Space>
              <Button onClick={() => { setEditGroupModalOpen(false); setEditingGroup(null); }}>取消</Button>
              <Button type="primary" htmlType="submit">保存</Button>
              <Button danger onClick={async () => {
                if (!editingGroup) return;
                try {
                  await onDeleteGroup(editingGroup._id);
                  message.success('组删除成功');
                  setEditGroupModalOpen(false);
                  setEditingGroup(null);
                } catch (error) {
                  console.error('删除组失败:', error);
                  message.error('删除组失败');
                }
              }}>
                删除组
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
