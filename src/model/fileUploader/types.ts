import type { ThumbnailModel } from './thumbnailModel'
import { Optional } from "@/typings/base";

import type { AxiosProgressEvent } from "axios";

export type UserPreview = {
  id: number;
  name: string;
  email: string;
};

export declare enum SupportedFileExtensionEnum {
  PDF = ".pdf",
  TXT = ".txt",
  RTF = ".rtf",
  CSV = ".csv",
  DOC = ".doc",
  DOCX = ".docx",
  PPT = ".ppt",
  PPTX = ".pptx",
  XLS = ".xls",
  XLSX = ".xlsx",
  XLSM = ".xlsm",
  PNG = ".png",
  JPG = ".jpg",
  JPEG = ".jpeg",
  WEBP = ".webp",
  MP4 = ".mp4",
  M4A = ".m4a",
  VTT = ".vtt",
}

export declare enum EncodingEnum {
  BASE64 = "base64",
  HEX = "hex",
}

export declare enum FileTypeEnum {
  Other = "Other",
  SPA = "SPA",
  TermSheet = "TermSheet",
  BridgeLoan = "BridgeLoan",
  BusinessPlan = "Business Plan",
  InternalLegalMemo = "Internal Legal Memo",
}

export enum FileUploadStatusEnum {
  Preparing,
  Uploading,
  Processing,
  Ready,
  Failed,
  SizeLimitExceeded,
  Waiting,
  WaitingForRetry,
}

export type Double = number;

export type FileMetadataDimensions = {
  width: number;
  height: number;
};

export declare enum FileVectoringStatusEnum {
  NotVectorized = "NotVectorized",
  Processing = "Processing",
  Ready = "Ready",
  Failed = "Failed",
}

export type FileMetadataDBEntry = {
  transcribeUrlInChinese?: string;
  transcribeUrlInEnglish?: string;
  hasTranscribe?: boolean;
  isTranscribeDefaultShow?: boolean;
  contentSummary?: string;
  contentSummaryVector?: Double[];
  contentChineseSummary?: string;
  contentChineseSummaryVector?: Double[];
  dimensions?: FileMetadataDimensions;
  vectoringStatus?: FileVectoringStatusEnum;
  tags?: string[];
};

export type FileDBEntry = {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  md5Hash: string;
  size: number;
  extension: SupportedFileExtensionEnum;
  ownerIds: number[];
  uploadByUserId: number;
  uploadedAt: number;
  uploadStatus: FileUploadingStatusEnum;
  attachmentId?: number;
  path?: string;
  activityTracingIds: number[];
  passwordProtected: boolean;
  videoDurationSeconds?: number;
  isDownloadable: boolean;
  isPreviewable: boolean;
  isOriginalFileDownloadable: boolean;
  modifiedAt: number;
  fileType: FileTypeEnum;
  uploadByEmail?: string;
  totalDurationInSecondsOrPages?: number;
  metadata: FileMetadataDBEntry;
  isPublic: boolean;
  viewerIds: number[];
  viewerGroups: string[];
  onlineFileId?: number;
};

export declare const fileMetadataForUserPickFields: readonly [
  "transcribeUrlInChinese",
  "transcribeUrlInEnglish",
  "hasTranscribe",
  "isTranscribeDefaultShow",
  "contentSummary",
  "contentChineseSummary",
  "dimensions",
  "vectoringStatus",
  "tags"
];

export type FileMetadata = Pick<
  FileMetadataDBEntry,
  (typeof fileMetadataForUserPickFields)[number]
>;

export type FileBase = Omit<
  FileDBEntry,
  "url" | "thumbnailUrl" | "previewUrl" | "metadata"
> & {
  sid: string;
  sizeString: string;
  refTypes: string[];
  publicUrl?: string;
  metadata: FileMetadata;
};

export type FileUploadInfo = {
  id: string;
  raw: File;
  filename: string;
  fileId?: string;
  progress?: number;
  status: FileUploadStatusEnum;
  extension: SupportedFileExtensionEnum;
  uploadedAt: number;
  uploader: UserPreview;
  uploadUrl?: string;
  previewUrl?: string; // for image uploads
  errorMessage?: string;
  inlineImage?: boolean;
  // 上传部分成功但是后端转换失败(或者扩展名不太对什么的)的文件(业务逻辑上来说这种文件禁止重传, 因为重传也会失败)
  canRetry: boolean;
  type: FileTypeEnum;
  md5?: string;
};

export type FileThumbnailWithAdditionalInfo<T> = {
  model: ThumbnailModel;
  additionalInfo: T;
};

export type ReadingProgress = {
  progress?: number;
  isFinishedReading: boolean;
};

export type FileInfoType = FileBase & {
  viewedUserIds: number[];
  downloadedUserIds: number[];
  finishedReadingUserIds: number[];
  isOnlineFileEditable?: boolean;
  isRead: boolean;
  latestReadingProgress: ReadingProgress;
  maxReadingProgress: ReadingProgress;
};

export type FileThumbnail = {
  fileId?: string;
  filename?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
  fileTranscribeUrl?: string;
  loading?: boolean;
  info?: FileInfoType;
  newFileUpload?: FileUploadInfo;
  isPreviewing?: boolean;
  isAnonymous?: boolean;
  hideDetailViewers?: boolean;
  viewerDrawerVisible?: boolean;
};

export type FileThumbnailWithUploadInfo = Omit<
  FileThumbnail,
  "newFileUpload"
> & {
  newFileUpload: FileUploadInfo;
};

export type FileConversionFailureCount = {
  fileSid: string;
  count: number;
};

export type FileUploadUrlResponse = {
  id: number;
  sid: string;
  uploadUrl?: string;
  type: FileTypeEnum;
};

export type FileViewerData = Pick<FileInfoType, "name"> &
  Partial<FileInfoType> & {
    // 当前文件的时间信息
    timeInfo?: string;
  };

export type EncodedString = {
  encoding: EncodingEnum;
  raw: string;
};

/** 文件阅读进度 */
export type FileReadingProgress = {
  /** 文件 id */
  fileSid: string;
  /** 当前阅读页数 */
  currentNumber: number;
  /** 最大阅读页数 */
  maxNumber: number;
};

export type UploadS3Params = {
  url: string;
  file: File;
  onProgress?: (progressEvent: AxiosProgressEvent) => void;
};

export type ExternalFileInformation = {
  id: string;
  filename: string;
  raw?: File;
  extension: SupportedFileExtensionEnum;
  uploadTime?: number;
};

export enum FileDownloadTypeEnum {
  NORMAL = "NORMAL",
  ORIGINAL = "ORIGINAL",
}

export type FileUploadStatusWithId = {
  id: number;
  sid: string;
  uploadStatus: FileUploadingStatusEnum;
};

export declare enum FileUploadingStatusEnum {
  Uploading = "Uploading",
  Converting = "Converting",
  Ready = "Ready",
  ConvertFailed = "ConvertFailed",
  UploadFailed = "UploadFailed",
}

export type FileUploadedInfo = {
  lastUploadedFileId: string;
  thumbnail: FileThumbnail;
  fileIds: string[];
  isAllUploaded: boolean; // 文件是否都上传完成
  isAllUploadedOrFailed: boolean; // 文件是否都上传完成或者失败
  thumbnailModels: ThumbnailModel[];
};

export type FileUploaderConfig = {
  uploadFileSizeLimit?: number;
  userInfo?: any;
  supportedFileExtensions?: SupportedFileExtensionEnum[];
  supportedThumbnailExtensions?: SupportedFileExtensionEnum[];
  maxFileSize?: number;
  minFileSize?: number;
  onDelete?: (
    fileId: string,
    onlineFileId?: number
  ) => boolean | Promise<boolean>;
  onDeleteThumbnail?: (
    thumbnail: ThumbnailModel,
    thumbnails: ThumbnailModel[]
  ) => void;
  // 选中文件之后调用，用于上传之前裁剪图片一类的操作
  onAfterSelectFile?: (file: File) => Optional<File> | Promise<Optional<File>>;
  // 自定义上传行为时用，返回值要确保有 fileId 字段，后续查询进度时要用到
  customizeUpload?: (
    thumbnail: FileThumbnailWithUploadInfo,
    onProgress: (event: ProgressEvent) => void,
    abortController: AbortController
  ) => Promise<Optional<FileThumbnailWithUploadInfo>>;
  maxTotalFileCount?: number;
  // 业务中用到的文件类型 (比如 checklist 的签字文件要指定签字文件的类型)
  fileType?: FileTypeEnum;
  isPublic?: boolean;
  retainUploadInfoAfterUploaded?: boolean;
  isAnonymous?: boolean;
  hideDetailViewers?: boolean; // 隐藏文件详情中的查看文件人数的信息
  maxConcurrencyCount?: number; // 最大并发上传数
};

export enum UploaderErrorEnum {
  CountLimit,
  SizeLimit,
  NoAccess,
  AxiosError,
  getMd5Failed,
  NotSupportedType,
  getUploadUrlFailed,
  CheckFileExistFailed,
  Other,
}

export type UploaderError = {
  uploadId?: string; // 如果有 uploadId，说明是上传开始之后发生的错误, 在这个阶段之前的错误，比如数量或者被文件大小限制或者 getFileMd5 报错是没有 uploadId 的
  message: string;
  code: UploaderErrorEnum;
};

export type PreviewUrlParams = {
  /** 是否同时获取完整的 File */
  fetchFile?: boolean;
  /** 是否计入 viewed */
  thumbnailUrlOnly?: boolean;
};

export type DownloadOrViewFileResponse = {
    sid: string;
    url: string;
    urlExpirationTime: number;
    filename: string;
    md5Hash: string;
    thumbnailUrl?: string;
    fileTranscribeUrl?: string;
    file?: FileInfoType;
};
