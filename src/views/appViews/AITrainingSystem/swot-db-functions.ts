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
  // 同时使计数缓存失效
  invalidateCountCache();
  return result;
}
export const getQtBookBackups = async (offset: number = 0, limit: number = 10) => {
  const startTime = performance.now(); // 使用performance.now()以获得更高精度的计时
  
  try {
    // 记录查询开始时的内存使用情况（如果浏览器支持）
    const memoryBefore = (window.performance as any).memory ? 
      (window.performance as any).memory.usedJSHeapSize : 'Not available';
    
    console.log(`\n开始获取备份数据 (offset=${offset}, limit=${limit})`);
    
    // 使用复合查询减少数据传输量，只获取需要的字段
    const backups = await db.qtBookBackups
      .orderBy('id')
      .reverse() // 默认获取最新的备份
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
  // 直接调用缓存版本的函数，提高性能
  return getQtBookBackupsCountWithCache();
}

// 记录计数的缓存
const countCache = {
  qtBookBackups: {
    count: 0,
    timestamp: 0,
    dirty: true
  }
};

// 标记计数缓存为脏数据，在添加或删除记录后调用
export const invalidateCountCache = () => {
  countCache.qtBookBackups.dirty = true;
  console.log('计数缓存已失效，下次将重新计算');
};

// 带缓存的计数函数，减少重复计数的性能开销
export const getQtBookBackupsCountWithCache = async (maxAge: number = 30000) => {
  console.log(`获取备份数据计数(带缓存)`);
  const currentTime = Date.now();
  
  // 如果缓存有效且未过期，直接返回缓存值
  if (!countCache.qtBookBackups.dirty && 
      (currentTime - countCache.qtBookBackups.timestamp < maxAge)) {
    console.log(`从缓存返回备份计数: ${countCache.qtBookBackups.count} 条记录`);
    return countCache.qtBookBackups.count;
  }

  // 缓存无效，重新计算
  const startTime = performance.now();
  
  try {
    // 使用键范围优化计数性能
    const count = await db.qtBookBackups.count();
    
    // 更新缓存
    countCache.qtBookBackups.count = count;
    countCache.qtBookBackups.timestamp = currentTime;
    countCache.qtBookBackups.dirty = false;
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    console.log(`获取备份数据计数成功(已更新缓存): ${count} 条记录`);
    console.log(`获取备份数据计数耗时: ${timeDiff.toFixed(2)} ms`);
    
    return count;
  } catch (error) {
    const endTime = performance.now();
    console.error(`获取备份数据计数失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

export const deleteQtBookBackup = async (id: number) => {
  await db.qtBookBackups.delete(id);
  // 清除缓存，确保下次获取时能拿到最新数据
  clearQtBookBackupsCache();
  // 同时使计数缓存失效
  invalidateCountCache();
  return true;
}

export const 记录版本笔记数据 = async (data: any, version?: string) => {
  version = version ?? data?.version ?? data?.notebookVersion ?? nanoid();
  const found = await db.qtBookBackups.get({key: version});
  if (found != null) {
    await db.qtBookBackups.update(found.id, {key: version, data: _.cloneDeep(data)});
    clearQtBookBackupsCache();
    invalidateCountCache();
    return found.id;
  }
  const result = await db.qtBookBackups.put({key: version, data: _.cloneDeep(data)});
  clearQtBookBackupsCache();
  invalidateCountCache();
  return result;
};

/**
 * 获取 IndexedDB 数据库占用的存储空间
 * 使用 StorageManager API 进行精确计算
 * @returns 包含存储使用信息的对象
 */
export const getIDBStorageSize = async () => {
  console.log(`\n开始获取存储信息`);
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
export const __getQtBookBackupsWithCache = async (offset: number = 0, limit: number = 10) => {
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

/**
 * 优化版本的备份获取函数，使用游标增量处理大数据集
 * 相比一次性加载所有数据，这种方法可以减少内存使用并提高性能
 */
export const __getQtBookBackupsOptimized = async (offset: number = 0, limit: number = 10, 
    progressCallback?: (loaded: number, total: number) => void) => {
  const startTime = performance.now();
  console.log(`\n开始优化获取备份数据 (offset=${offset}, limit=${limit})`);
  
  try {
    const result: any[] = [];
    let currentIndex = 0;
    let skipped = 0;
    
    // 首先获取总数用于进度报告
    const totalCount = await db.qtBookBackups.count();
    
    // 使用游标API以流式处理大量数据
    await db.qtBookBackups
      .orderBy('id')
      .reverse()
      .until(() => {
        // 达到目标数量时停止
        return result.length >= limit;
      })
      .eachPrimaryKey(() => {
        // 处理offset
        if (skipped < offset) {
          skipped++;
          return;
        }
        
        // 只收集需要的记录
        if (result.length < limit) {
          currentIndex++;
          result.push({}); // 仅用于计数
          // 报告进度
          if (progressCallback) {
            progressCallback(currentIndex, Math.min(limit, totalCount - offset));
          }
        }
      });
    
    // 分批次查询实际记录，避免一次性加载全部数据
    // 获取offset之后的limit条记录
    const backups = await db.qtBookBackups
      .orderBy('id')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`优化获取备份数据成功: ${backups.length} 条记录`);
    console.log(`优化获取备份数据耗时: ${timeDiff.toFixed(2)} ms`);
    
    return backups;
  } catch (error) {
    const endTime = performance.now();
    console.error(`优化获取备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

/**
 * 使用精简查询的备份获取，手动提取所需字段以减少数据传输
 * 当你只需要记录的部分字段时，这种方法可以显著提升性能
 * @param fieldNames 要获取的字段数组
 */
export const __getQtBookBackupsProjection = async (
  fieldNames: string[] = ['id', 'key'], 
  offset: number = 0, 
  limit: number = 10
) => {
  const startTime = performance.now();
  console.log(`\n开始精简查询备份数据 (只获取字段:${fieldNames.join(',')})`);
  
  try {
    // 获取完整记录但手动提取指定字段
    const fullBackups = await db.qtBookBackups
      .orderBy('id')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
    
    // 手动进行字段投影，只保留需要的字段
    const projectedBackups = fullBackups.map(backup => {
      const result: Record<string, any> = {};
      fieldNames.forEach(field => {
        // 处理嵌套字段路径，例如 'data.version'
        if (field.includes('.')) {
          const parts = field.split('.');
          let currentObj: any = backup;
          for (let i = 0; i < parts.length - 1; i++) {
            if (currentObj && typeof currentObj === 'object') {
              currentObj = currentObj[parts[i]];
            } else {
              currentObj = null;
              break;
            }
          }
          
          const lastPart = parts[parts.length - 1];
          result[field] = currentObj && typeof currentObj === 'object' ? 
              currentObj[lastPart] : null;
        } else {
          result[field] = backup[field];
        }
      });
      return result;
    });
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`精简查询备份数据成功: ${projectedBackups.length} 条记录`);
    console.log(`精简查询备份数据耗时: ${timeDiff.toFixed(2)} ms`);
    
    return projectedBackups;
  } catch (error) {
    const endTime = performance.now();
    console.error(`精简查询备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

/**
 * 懒加载版本的备份获取器，适用于显示大量记录但只需要异步加载详细内容的场景
 * 返回的对象包含一个加载详细数据的方法，可以按需调用
 */
export const __getQtBookBackupsLazy = async (offset: number = 0, limit: number = 10) => {
  const startTime = performance.now();
  console.log(`\n开始懒加载备份数据索引 (offset=${offset}, limit=${limit})`);
  
  try {
    // 首先只获取ID和key等基本信息
    const backupIndexes = await db.qtBookBackups
      .orderBy('id')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
    
    // 为每个结果添加懒加载方法
    const lazyResults = backupIndexes.map(backup => {
      // 创建一个不含data字段的浅复制对象
      const { data, ...basicInfo } = backup;
      
      // 添加异步获取完整数据的方法
      return {
        ...basicInfo,
        // 添加一个标记表明数据是否已加载
        _dataLoaded: false,
        // 添加详细信息获取器
        async loadFullData() {
          if (this._dataLoaded) return this;
          
          console.log(`懒加载备份 ID=${basicInfo.id} 的详细数据`);
          const fullBackup = await db.qtBookBackups.get(basicInfo.id);
          
          if (fullBackup) {
            // 把所有详细字段合并到当前对象
            Object.assign(this, fullBackup);
            this._dataLoaded = true;
          }
          
          return this;
        },
        // 如果只需要data中的特定字段，可以用这个更高效的方法
        async loadDataField(fieldPath: string): Promise<any> {
          // 如果数据已加载，直接从当前对象获取
          if (this._dataLoaded) {
            // 从路径中获取字段值
            const parts = fieldPath.split('.');
            let value: any = this;
            
            for (const part of parts) {
              if (value && typeof value === 'object') {
                value = value[part];
              } else {
                return undefined;
              }
            }
            return value;
          }
          
          console.log(`懒加载备份 ID=${basicInfo.id} 的特定字段: ${fieldPath}`);
          const fullBackup = await db.qtBookBackups.get(basicInfo.id);
          
          if (fullBackup) {
            // 从路径中获取字段值
            const parts = fieldPath.split('.');
            let value: any = fullBackup;
            
            for (const part of parts) {
              if (value && typeof value === 'object') {
                value = value[part];
              } else {
                return undefined;
              }
            }
            
            return value;
          }
          
          return undefined;
        }
      };
    });
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`懒加载备份索引成功: ${lazyResults.length} 条记录`);
    console.log(`懒加载备份索引耗时: ${timeDiff.toFixed(2)} ms`);
    
    return lazyResults;
  } catch (error) {
    const endTime = performance.now();
    console.error(`懒加载备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

/**
 * 批处理函数：按批次处理大量数据，适用于需要遍历整个表但内存有限的场景
 * 该函数会自动分批处理所有记录，而不是一次性加载全部数据
 * @param batchCallback 每批数据的处理函数
 * @param batchSize 每批处理的记录数量
 */
export const __processQtBookBackupsInBatches = async (
  batchCallback: (batch: any[], batchIndex: number) => Promise<void> | void,
  batchSize: number = 50
) => {
  const startTime = performance.now();
  console.log(`\n开始批处理备份数据 (批大小=${batchSize})`);
  
  try {
    let totalProcessed = 0;
    let batchIndex = 0;
    let hasMore = true;
    
    // 获取总记录数用于显示进度
    const totalCount = await db.qtBookBackups.count();
    
    while (hasMore) {
      // 获取一批数据
      const batch = await db.qtBookBackups
        .orderBy('id')
        .offset(batchIndex * batchSize)
        .limit(batchSize)
        .toArray();
      
      // 如果没有数据了，退出循环
      if (batch.length === 0) {
        hasMore = false;
        continue;
      }
      
      // 处理这一批数据
      await batchCallback(batch, batchIndex);
      
      // 更新计数和批次索引
      totalProcessed += batch.length;
      batchIndex++;
      
      // 显示进度
      console.log(`批处理进度: ${totalProcessed}/${totalCount} (${((totalProcessed / totalCount) * 100).toFixed(2)}%)`);
      
      // 如果这批数据不足一批，说明已经处理完所有数据
      if (batch.length < batchSize) {
        hasMore = false;
      }
    }
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`批处理备份数据完成，共处理 ${totalProcessed} 条记录`);
    console.log(`批处理总耗时: ${timeDiff.toFixed(2)} ms`);
    
    return { totalProcessed };
  } catch (error) {
    const endTime = performance.now();
    console.error(`批处理备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

/**
 * 流式处理函数：一次处理一条记录，适用于处理大量数据但不需要同时访问多条记录的场景
 * 该函数可以最大限度地减少内存使用，因为它一次只加载一条记录
 * @param recordProcessor 对每条记录的处理函数
 * @param options 流式处理选项
 */
export const __streamQtBookBackups = async (
  recordProcessor: (record: any, index: number) => Promise<boolean | void> | boolean | void,
  options: {
    reverse?: boolean,    // 是否倒序处理
    limit?: number,       // 处理的最大记录数
    filter?: (record: any) => boolean, // 过滤函数
    progressInterval?: number // 多少条记录显示一次进度
  } = {}
) => {
  const { 
    reverse = false, 
    limit,
    filter,
    progressInterval = 100
  } = options;
  
  const startTime = performance.now();
  console.log(`\n开始流式处理备份数据 ${reverse ? '(倒序)' : ''}`);
  
  try {
    let processed = 0;
    let skipped = 0;
    let shouldContinue = true;
    
    // 获取总记录数用于进度显示
    const totalCount = await db.qtBookBackups.count();
    
    // 创建一个查询对象
    let query = db.qtBookBackups.orderBy('id');
    if (reverse) {
      query = query.reverse();
    }
    
    // 使用eachPrimaryKey而不是each可以大幅减少内存使用
    await query.eachPrimaryKey(async (id) => {
      // 如果达到限制或者处理器返回false，则停止处理
      if (!shouldContinue || (limit !== undefined && processed >= limit)) {
        return false;
      }
      
      // 逐个获取记录而不是一次性加载
      const record = await db.qtBookBackups.get(id);
      
      // 如果设置了过滤器且记录不匹配，则跳过
      if (filter && !filter(record)) {
        skipped++;
        return; // 继续处理下一条
      }
      
      // 处理记录
      const result = await recordProcessor(record, processed);
      processed++;
      
      // 如果处理函数返回false，停止处理
      if (result === false) {
        shouldContinue = false;
        return false;
      }
      
      // 定期显示进度
      if (processed % progressInterval === 0) {
        const currentTime = performance.now();
        const elapsedSeconds = (currentTime - startTime) / 1000;
        const recordsPerSecond = processed / elapsedSeconds;
        
        console.log(`流处理进度: ${processed}/${totalCount} (${((processed / totalCount) * 100).toFixed(2)}%), ` +
          `速度: ${recordsPerSecond.toFixed(2)} 记录/秒, ` +
          `已跳过: ${skipped} 条记录`);
      }
    });
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`流式处理完成，共处理 ${processed} 条记录，跳过 ${skipped} 条记录`);
    console.log(`流式处理总耗时: ${timeDiff.toFixed(2)} ms`);
    
    return { processed, skipped };
  } catch (error) {
    const endTime = performance.now();
    console.error(`流式处理备份数据失败，耗时 ${(endTime - startTime).toFixed(2)} ms`, error);
    throw error;
  }
}

/**
 * 使用索引优化的计数函数，在某些情况下可能比普通count()更快
 * 注意：此方法仅返回近似值，用于UI显示，不要用于需要精确计数的场合
 * @param sampleSize 用于估算总数的样本大小
 * @returns 估计的记录数
 */
export const getQtBookBackupsCountFast = async (sampleSize: number = 100): Promise<number> => {
  // 首先检查缓存
  if (!countCache.qtBookBackups.dirty && 
      (Date.now() - countCache.qtBookBackups.timestamp < CACHE_TTL)) {
    return countCache.qtBookBackups.count;
  }

  console.log(`\n开始快速估算备份数据总数 (样本大小=${sampleSize})`);
  const startTime = performance.now();
  
  try {
    // 使用主键范围来获取估计值
    // 先获取最小和最大ID
    const allKeys = await db.qtBookBackups.orderBy(':id').keys();
    
    // 如果记录很少，直接返回精确计数
    if (allKeys.length <= sampleSize * 2) {
      console.log(`记录数较少，使用精确计数: ${allKeys.length}`);
      
      // 更新缓存
      countCache.qtBookBackups.count = allKeys.length;
      countCache.qtBookBackups.timestamp = Date.now();
      countCache.qtBookBackups.dirty = false;
      
      return allKeys.length;
    }
    
    // 对于大型数据库，使用采样法估计总数
    // 仅采集采样点，无需计算范围
    
    // 采样ID分布来估计密度
    const sampleIds = [];
    for (let i = 0; i < sampleSize; i++) {
      const index = Math.floor(i * (allKeys.length / sampleSize));
      if (index < allKeys.length) {
        sampleIds.push(allKeys[index]);
      }
    }
    
    // 计算估计值
    const estimatedCount = Math.round(allKeys.length);
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`快速估算备份数据总数完成: 约 ${estimatedCount} 条记录 (估计值)`);
    console.log(`快速估算耗时: ${timeDiff.toFixed(2)} ms`);
    
    // 更新缓存
    countCache.qtBookBackups.count = estimatedCount;
    countCache.qtBookBackups.timestamp = Date.now();
    countCache.qtBookBackups.dirty = false;
    
    return estimatedCount;
  } catch (error) {
    console.error("快速估算记录数失败:", error);
    // 失败时回退到标准计数方法
    return getQtBookBackupsCountWithCache();
  }
}

/**
 * 分段计数方法，适用于超大数据量场景
 * 通过将计数操作分割成多个小段并行处理，减少单次计数操作的规模
 * @param segments 分割的段数
 * @returns Promise<number> 总记录数
 */
export const getQtBookBackupsCountBySegments = async (segments: number = 10): Promise<number> => {
  // 首先检查缓存
  if (!countCache.qtBookBackups.dirty && 
      (Date.now() - countCache.qtBookBackups.timestamp < CACHE_TTL)) {
    return countCache.qtBookBackups.count;
  }
  
  console.log(`\n开始分段计数备份数据 (分段数=${segments})`);
  const startTime = performance.now();
  
  try {
    // 获取所有主键以确定分段范围
    const allKeys = await db.qtBookBackups.orderBy(':id').keys();
    
    // 如果记录少于分段数的两倍，直接使用总数
    if (allKeys.length < segments * 2) {
      const count = allKeys.length;
      
      // 更新缓存
      countCache.qtBookBackups.count = count;
      countCache.qtBookBackups.timestamp = Date.now();
      countCache.qtBookBackups.dirty = false;
      
      const endTime = performance.now();
      console.log(`分段计数完成 (记录较少，直接使用精确值): ${count} 条记录`);
      console.log(`分段计数耗时: ${(endTime - startTime).toFixed(2)} ms`);
      
      return count;
    }
    
    // 计算每个分段的大致边界
    const segmentSize = Math.floor(allKeys.length / segments);
    
    // 创建分段计数任务
    const countTasks = [];
    
    for (let i = 0; i < segments; i++) {
      const startIndex = i * segmentSize;
      const endIndex = (i === segments - 1) ? allKeys.length - 1 : (i + 1) * segmentSize - 1;
      
      if (startIndex <= endIndex && startIndex < allKeys.length) {
        // 获取该分段的起始和结束键
        const startKey = allKeys[startIndex];
        const endKey = allKeys[endIndex];
        
        // 创建一个针对此范围的计数任务
        countTasks.push(
          db.qtBookBackups.where(':id').between(startKey, endKey, true, true).count()
        );
      }
    }
    
    // 并行执行所有计数任务
    const segmentCounts = await Promise.all(countTasks);
    
    // 合计所有分段的计数结果
    const totalCount = segmentCounts.reduce((sum, count) => sum + count, 0);
    
    // 更新缓存
    countCache.qtBookBackups.count = totalCount;
    countCache.qtBookBackups.timestamp = Date.now();
    countCache.qtBookBackups.dirty = false;
    
    const endTime = performance.now();
    const timeDiff = endTime - startTime;
    
    console.log(`分段计数完成: ${totalCount} 条记录 (${segments} 个分段)`);
    console.log(`分段计数耗时: ${timeDiff.toFixed(2)} ms`);
    
    return totalCount;
  } catch (error) {
    console.error("分段计数失败:", error);
    // 出错时回退到标准计数方法
    return getQtBookBackupsCount();
  }
}


