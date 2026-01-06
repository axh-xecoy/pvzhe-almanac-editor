export type AlmanacColorPreset = {
  value: string;
  meta: string;
};

export const DEFAULT_DETAIL_COLOR = '#000000';

export const ALMANAC_COLOR_PRESETS: AlmanacColorPreset[] = [
  { value: 'cc241d', meta: '属性值' },
  { value: 'ff0000', meta: '获取方式' },
  { value: '0000cd', meta: '获取方式内容' },
  { value: 'c71585', meta: '特性' },
  { value: '441d62', meta: '弱点' },
  { value: '0000ff', meta: '紫卡植物' },
  { value: 'ffff00', meta: '至尊金卡' },
];
