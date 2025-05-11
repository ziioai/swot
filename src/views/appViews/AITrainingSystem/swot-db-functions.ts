/* eslint-disable @typescript-eslint/no-explicit-any */

import _ from 'lodash';
import { nanoid } from 'nanoid';
import * as zipson from "zipson";
import Dexie, { Table } from 'dexie';

const ddb = new Dexie('DB-of-SWOT-Demo');
ddb.version(1).stores({
  kvs: '++id, &key, value',
  chatRecords: '++id, &key',
  qtBookBackups: '++id, &key',
});

export default ddb;

interface Database {
  kvs: Table<{ [key: string]: any }, number>;
  chatRecords: Table<{ [key: string]: any }, number>;
  qtBookBackups: Table<{ [key: string]: any }, number>;
}
const db = ddb as unknown as Database;

export const load = async (key: string) => {
  const value_ = (await db.kvs.get({key}))?.value;
  if (value_ == null) { return null; }
  return zipson.parse(value_);
}
export const save = async (key: string, value: any) => {
  const value_ = zipson.stringify(value);
  await db.kvs.put({id: key, key, value: value_});
};

export const saveChatRecord = async (item: Record<string, any>) => {
  const result = await db.chatRecords.put(_.cloneDeep(item));
  return result;
};
export const getChatRecords = async (offset: number = 0, limit: number = 10) => {
  const records = await db.chatRecords.orderBy('id').offset(offset).limit(limit).toArray();
  return records;
};
export const 记录调模型时的数据 = async (data: any) => {
  const result = await saveChatRecord({key: nanoid(12), data});
  return result;
};

export const saveQtBookBackup = async (item: Record<string, any>) => {
  const result = await db.qtBookBackups.put(_.cloneDeep(item));
  return result;
}
export const getQtBookBackups = async (offset: number = 0, limit: number = 10) => {
  const backups = await db.qtBookBackups.orderBy('id').offset(offset).limit(limit).toArray();
  return backups;
}

export const getQtBookBackupsCount = async () => {
  const count = await db.qtBookBackups.count();
  return count;
}

export const deleteQtBookBackup = async (id: number) => {
  await db.qtBookBackups.delete(id);
  return true;
}

export const 记录版本笔记数据 = async (data: any, version?: string) => {
  version = version ?? data?.version ?? data?.notebookVersion ?? nanoid();
  const found = await db.qtBookBackups.get({key: version});
  if (found != null) {
    await db.qtBookBackups.update(found.id, {key: version, data: _.cloneDeep(data)});
    return found.id;
  }
  const result = await db.qtBookBackups.put({key: version, data: _.cloneDeep(data)});
  return result;
};

/**
 * 获取 IndexedDB 数据库占用的存储空间
 * 使用 StorageManager API 进行精确计算
 * @returns 包含存储使用信息的对象
 */
export const getIDBStorageSize = async () => {
  try {
    // 获取表记录数量（用于显示）
    const kvsCount = await db.kvs.count();
    const chatRecordsCount = await db.chatRecords.count();
    const qtBookBackupsCount = await db.qtBookBackups.count();

    // 使用 StorageManager API 获取存储使用情况
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const percentUsed = quotaBytes ? (usageBytes / quotaBytes) * 100 : 0;

      // 由于 StorageManager API 无法获取单个数据库的使用情况，
      // 这里我们只能获取整个来源的存储使用
      return {
        total: {
          bytes: usageBytes,
          formatted: formatBytes(usageBytes),
          percentUsed: percentUsed.toFixed(2) + "%",
          quota: {
            bytes: quotaBytes,
            formatted: formatBytes(quotaBytes)
          }
        },
        // 由于无法精确获取各表大小，我们仅提供记录数量
        tableCounts: {
          kvs: kvsCount,
          chatRecords: chatRecordsCount,
          qtBookBackups: qtBookBackupsCount,
          total: kvsCount + chatRecordsCount + qtBookBackupsCount
        }
      };
    } else {
      // 浏览器不支持 StorageManager API，返回简化信息
      return {
        total: {
          bytes: 0,
          formatted: "未知 (浏览器不支持存储估算)",
          percentUsed: "未知",
          quota: {
            bytes: 0,
            formatted: "未知"
          }
        },
        tableCounts: {
          kvs: kvsCount,
          chatRecords: chatRecordsCount,
          qtBookBackups: qtBookBackupsCount,
          total: kvsCount + chatRecordsCount + qtBookBackupsCount
        },
        unsupported: true
      };
    }
  } catch (error: any) {
    console.error("获取存储信息时出错:", error);
    return {
      error: true,
      message: `获取存储信息失败: ${error?.message || "未知错误"}`
    };
  }
};

/**
 * 将字节数格式化为可读性更好的字符串（KB, MB, GB）
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


