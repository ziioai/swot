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


