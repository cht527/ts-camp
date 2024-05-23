// 5GB = 5 * 1024 * 1024 * 1024

import { SupportedFileExtensionEnum } from "./types";

export const FILE_BYTE_SIZE_5GB = 5368709120;

// 100M = 100 * 1024 * 1024
export const FILE_BYTE_SIZE_100MB = 104857600;

// 10M = 10 * 1024 * 1024
export const FILE_BYTE_SIZE_10MB = 10485760;

// 默认上传的文件大小 上限（< 该值时可上传）
export const DEFAULT_MAX_FILE_SIZE = FILE_BYTE_SIZE_5GB;

// 默认上传的文件大小 下限（> 该值时可上传）
export const DEFAULT_MIN_FILE_SIZE = 0;

export const KB_SIZE = 1024;

export const DEFAULT_SUPPORTED_FILE_TYPES = Object.values(
  SupportedFileExtensionEnum
);

export const MAXIMUM_FILE_UPLOAD_COUNT_ONE_TIME = 50;

export const CHECK_FILE_READY_MAX_RETRY = 120;
