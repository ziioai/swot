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
  // 清除缓存，确保下次获取时能拿到最新数据
  clearQtBookBackupsCache();
  return result;
}
export const getQtBookBackups = async (offset: number = 0, limit: number = 10) => {
  const startTime = performance.now(); // 使用performance.now()以获得更高精度的计时
  
  try {
    // 记录查询开始时的内存使用情况（如果浏览器支持）
    const memoryBefore = (window.performance as any).memory ? 
      (window.performance as any).memory.usedJSHeapSize : 'Not available';
    
    console.log(`开始获取备份数据 (offset=${offset}, limit=${limit})`);
    
    // 使用复合查询减少数据传输量，只获取需要的字段
    const backups = await db.qtBookBackups
      .orderBy('id')
      // .reverse() // 默认获取最新的备份
      .offset(offset)
      .limit(limit)
      .toArray();
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    // 记录查询结束时的内存使用情况
    const memoryAfter = (window.performance as any).memory ? 
      (window.performance as any).memory.usedJSHeapSize : 'Not available';
    
    console.log(`获取备份数据成功: ${backups.length} 条记录`);
    console.log(`获取备份数据耗时: ${timeDiff.toFixed(2)} ms`);
    
    if (memoryBefore !== 'Not available') {
      const memoryDiff = memoryAfter - memoryBefore;
      console.log(`内存使用变化: ${formatBytes(memoryDiff)} (${formatBytes(memoryBefore)} -> ${formatBytes(memoryAfter)})`);
    }
    
    return backups;
  } catch (error) {
    const endTime = performance.now();
    console.error(`获取备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}
export const getQtBookBackupsCount = async () => {
  console.log(`开始获取备份数据总数`);
  const startTime = performance.now();
  const count = await db.qtBookBackups.count();
  const endTime = performance.now();
  const timeDiff = endTime - startTime;
  console.log(`获取备份数据总数成功: ${count} 条记录`);
  console.log(`获取备份数据总数耗时: ${timeDiff.toFixed(2)} ms`);
  return count;
}

export const deleteQtBookBackup = async (id: number) => {
  await db.qtBookBackups.delete(id);
  // 清除缓存，确保下次获取时能拿到最新数据
  clearQtBookBackupsCache();
  return true;
}

export const 记录版本笔记数据 = async (data: any, version?: string) => {
  version = version ?? data?.version ?? data?.notebookVersion ?? nanoid();
  const found = await db.qtBookBackups.get({key: version});
  if (found != null) {
    await db.qtBookBackups.update(found.id, {key: version, data: _.cloneDeep(data)});
    clearQtBookBackupsCache();
    return found.id;
  }
  const result = await db.qtBookBackups.put({key: version, data: _.cloneDeep(data)});
  clearQtBookBackupsCache();
  return result;
};

/**
 * 获取 IndexedDB 数据库占用的存储空间
 * 使用 StorageManager API 进行精确计算
 * @returns 包含存储使用信息的对象
 */
export const getIDBStorageSize = async () => {
  console.log(`开始获取存储信息`);
  const startTime = performance.now();
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

      const endTime = performance.now();
      const timeDiff = endTime - startTime;
      console.log(`获取存储信息成功: ${formatBytes(usageBytes)} / ${formatBytes(quotaBytes)}`);
      console.log(`存储使用百分比: ${percentUsed.toFixed(2)}%`);
      console.log(`KVS 表记录数: ${kvsCount}`);
      console.log(`ChatRecords 表记录数: ${chatRecordsCount}`);
      console.log(`QtBookBackups 表记录数: ${qtBookBackupsCount}`);
      console.log(`总记录数: ${kvsCount + chatRecordsCount + qtBookBackupsCount}`);
      console.log(`获取存储信息耗时: ${timeDiff.toFixed(2)} ms`);

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
      const endTime = performance.now();
      const timeDiff = endTime - startTime;
      console.log(`获取存储信息失败: 浏览器不支持 StorageManager API`);
      console.log(`获取存储信息耗时: ${timeDiff.toFixed(2)} ms`);
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
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    console.log(`获取存储信息失败，耗时 ${(timeDiff).toFixed(2)} ms`);
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

// 缓存系统 - 用于提高重复查询的性能
const backupsCache = new Map<string, {data: any[], timestamp: number}>();
const CACHE_TTL = 30000; // 缓存有效期，单位毫秒（30秒）

/**
 * 获取备份数据的缓存版本，可以显著提高重复查询的性能
 */
export const getQtBookBackupsWithCache = async (offset: number = 0, limit: number = 10) => {
  const cacheKey = `backups_${offset}_${limit}`;
  const currentTime = Date.now();
  const cachedResult = backupsCache.get(cacheKey);
  
  // 如果缓存存在且未过期，直接返回缓存数据
  if (cachedResult && (currentTime - cachedResult.timestamp < CACHE_TTL)) {
    console.log(`从缓存获取备份数据 (offset=${offset}, limit=${limit})`);
    return cachedResult.data;
  }
  
  // 缓存不存在或已过期，重新查询
  const backups = await getQtBookBackups(offset, limit);
  
  // 更新缓存
  backupsCache.set(cacheKey, {
    data: backups,
    timestamp: currentTime
  });
  
  return backups;
};

/**
 * 清除备份缓存，在添加、删除或修改备份后调用
 */
export const clearQtBookBackupsCache = () => {
  backupsCache.clear();
  console.log('备份数据缓存已清除');
};


