/* eslint-disable max-lines */
import { v4 } from "uuid";
import dayjs from "dayjs";
import axios from "axios";
import difference from "lodash-es/difference";

import { RequestBatchPipeline } from "./requestBatchPipeline";
import { fetchFilesUploadStatus, getFileUploadUrl, upload } from "./service";
import Model from "../index";

import {
  calcFileTypes,
  getNewFileName,
  isImage,
  validateExtension,
  formatBytes,
} from "@/utils/files";
import {
  CHECK_FILE_READY_MAX_RETRY,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_MIN_FILE_SIZE,
} from "./constants";
import getFileMd5 from "@/utils/getFileMd5";
import { runWaterfallPromises } from "@/utils/promiseTools";
import { isWithUploadInfoFileThumbnail } from "./service";
import {
  FileThumbnail,
  FileThumbnailWithUploadInfo,
  FileUploadedInfo,
  FileUploaderConfig,
  FileUploadInfo,
  FileUploadingStatusEnum,
  FileUploadStatusEnum,
  FileUploadUrlResponse,
  UploaderError,
  UploaderErrorEnum,
} from "./types";
import { conditional } from "@/utils/tool";
import compact from "lodash-es/compact";
import { Optional } from "@/typings/base";
import { isCanceledError } from "@/utils/httpClient";
import { ThumbnailModel } from "./thumbnailModel";

const batchCheckIsFileReady = new RequestBatchPipeline({
  requestFn: fetchFilesUploadStatus,
  pickResult: "sid",
  maxBatchParamsSize: 30,
  throttle: 300,
});

type FileUploaderModelData = {
  // 获取 uploadUrl 的函数
  thumbnailModels: ThumbnailModel[];
};

type UploadPipeLineContext = {
  uploadId: string;
  abortController: AbortController;
  uploadUrlRes?: FileUploadUrlResponse;
  isFileExisted?: boolean;
  isCustomizeUpload?: boolean;
  isReUpload: boolean;
};

const CHECK_FILE_INTERVAL = 1000;

const ALL_FILE_UPLOAD_FINISHED_STATUSES = [
  FileUploadStatusEnum.Ready,
  FileUploadStatusEnum.Failed,
  FileUploadStatusEnum.SizeLimitExceeded,
];

export const WAITING_STATUSES = [
  FileUploadStatusEnum.Waiting,
  FileUploadStatusEnum.WaitingForRetry,
];

export class FileUploaderModel extends Model<
  FileUploaderModelData,
  {
    beforeUpload: (
      thumbnail: FileThumbnailWithUploadInfo,
      isReUpload: boolean
    ) => void;
    changed: (fileIds: string[]) => void;
    uploaded: (info: FileUploadedInfo) => void;
    error: (error: UploaderError) => void;
    deleteThumbnail: (
      thumbnailModel: ThumbnailModel,
      thumbnailModels: ThumbnailModel[]
    ) => void;
    thumbnailsChanged: (thumbnailModels: ThumbnailModel[]) => void;
  }
> {
  static isAllUploaded = (thumbnailModels: ThumbnailModel[]) =>
    !thumbnailModels.some((model) => {
      const { newFileUpload } = model.get();

      return (
        newFileUpload && newFileUpload.status !== FileUploadStatusEnum.Ready
      );
    });

  static isUploading = (thumbnailModels: ThumbnailModel[]) =>
    thumbnailModels.some((model) => {
      const { newFileUpload } = model.get();

      return (
        newFileUpload &&
        !ALL_FILE_UPLOAD_FINISHED_STATUSES.includes(newFileUpload.status)
      );
    });

  static isNewUploadThumbnail = (
    thumbnail: FileThumbnail
  ): thumbnail is FileThumbnailWithUploadInfo => !!thumbnail.newFileUpload;

  static getNewUploadThumbnails = (
    thumbnailModels: ThumbnailModel[]
  ): FileThumbnailWithUploadInfo[] => {
    const thumbnails = thumbnailModels.map((model) => model.get());

    return thumbnails.filter(FileUploaderModel.isNewUploadThumbnail);
  };

  private config: FileUploaderConfig = {};
  private destroyed = false;
  private uploadingMetaDataMap: Map<
    string,
    { timer: number; count: number; abortController: AbortController }
  > = new Map();
  constructor({ ...config }: FileUploaderConfig) {
    super({
      data: {
        thumbnailModels: [],
      },
    });

    this.syncConfig(config);
    this.subscribe(
      ({ thumbnailModels } , { thumbnailModels: prevThumbnailModels }) => {
        if (thumbnailModels !== prevThumbnailModels) {
          this.emit("thumbnailsChanged", thumbnailModels);
        }
      }
    );
  }

  uploadFiles = (files: File[]) => {
    const { thumbnailModels } = this.get();
    const { onAfterSelectFile, maxTotalFileCount } = this.config;
    const filesCount = thumbnailModels.length;

    // 总数超出不处理
    if (maxTotalFileCount && filesCount + files.length > maxTotalFileCount) {
      this.emit("error", {
        code: UploaderErrorEnum.CountLimit,
        message: "upload_file_count_limit:" + maxTotalFileCount,
      });

      return;
    }

    files.forEach(async (f) => {
      try {
        const file = onAfterSelectFile ? await onAfterSelectFile(f) : f;

        if (!file) {
          return;
        }

        this.pushToUploadPipeline(file);
      } catch (error) {
        const errorMessage =
          (error instanceof Error ? error.message : String(error)) ||
          "file_preprocessing_failed";

        console.error({
          scope: "inline-image",
          message: errorMessage,
          level: "error",
          extra: {
            filename: f.name,
            fileType: f.type,
            fileSize: f.size,
          },
        });

        this.emit("error", {
          code: UploaderErrorEnum.Other,
          message: errorMessage,
        });
      }
    });
  };

  retryUpload = (thumbnailModel: ThumbnailModel) => {
    const uploadId = thumbnailModel.get().newFileUpload?.id;

    if (uploadId) {
      this.retryUploadByUploadId(uploadId);
    }
  };

  retryUploadByUploadId = (uploadId: string) => {
    // 已经上传完成的文件不可能重传，所以这里只需要从新上传的文件中找即可
    const retryThumbnail = this.get().thumbnailModels.find((model) => {
      const { newFileUpload } = model.get();

      return newFileUpload?.id === uploadId;
    });

    if (retryThumbnail) {
      const { newFileUpload } = retryThumbnail.get();

      if (newFileUpload) {
        const oldModel = this.getThumbnailModelByUploadId(uploadId);

        if (!oldModel) {
          return;
        }

        const { filename, previewUrl } = oldModel.get();

        this.updateFileThumbnail(uploadId, {
          newFileUpload: {
            uploadedAt: dayjs().unix(),
            errorMessage: "",
          },
        });

        if (isImage(filename) && !previewUrl) {
          this.deferredUpdateFileThumbnailByUploadId(uploadId);
        }

        this.startUploadProcess(uploadId, true);
      }
    }
  };

  protected getUploadedFileIds() {
    const { thumbnailModels } = this.get();

    return compact(
      thumbnailModels.map((model) => {
        const { newFileUpload, fileId } = model.get();

        return conditional(
          (!newFileUpload ||
            newFileUpload.status === FileUploadStatusEnum.Ready) &&
            fileId
        );
      })
    );
  }

  onDestroy = () => {
    this.destroyed = true;

    // 取消轮询文件上传是否完成的定时器
    this.uploadingMetaDataMap.forEach((metaData) => {
      const { abortController, timer } = metaData;

      abortController.abort();
      window.clearTimeout(timer);
    });
  };

  clearThumbnails = () => {
    this.set({ thumbnailModels: [] });
    this.emit("changed", []);
  };

  public buildThumbnailModelsByFileIds = async (fileIds: string[]) => {
    const uploadedFileIds = this.getUploadedFileIds();

    // 这是因为服务端下发的 fileIds 的顺序是依照上传时间排序的，同时也上传的文件可能会有重复，所以这里用来保证上传过程中文件顺序不变
    if (
      fileIds.length !== 0 &&
      fileIds.length === uploadedFileIds.length &&
      difference(fileIds, uploadedFileIds).length === 0
    ) {
      return;
    }

    const { thumbnailModels } = this.get();

    const uploadingFileIds = compact(
      thumbnailModels.map((model) => {
        const { newFileUpload, fileId } = model.get();

        if (newFileUpload && fileId) {
          return fileId;
        }
      })
    );

    // 当前已经存在的文件
    const existedThumbnailModels = compact(
      this.get().thumbnailModels.map((model) => {
        const { newFileUpload, fileId } = model.get();

        if (fileId && fileIds.includes(fileId) && !newFileUpload) {
          return model;
        }
      })
    );

    const newThumbnailModels = compact(fileIds.map((id) => {
      if (uploadingFileIds.includes(id)) {
        return;
      }

      const existedThumbnailModel = existedThumbnailModels.find(
        (model) => model.get().fileId === id
      );

      if (existedThumbnailModel) {
        return existedThumbnailModel;
      }

      return this.createThumbnailModel({ fileId: id });
    }));

    const mergedThumbnailModels = newThumbnailModels
      // 当前 model 不存在的文件放在前面(一般是轮询场景), 存在的文件不要打破之前的顺序
      .concat(
        compact(this.get().thumbnailModels.map((thumbnailModel) => {
          const { newFileUpload } = thumbnailModel.get();

          if (newFileUpload) {
            return thumbnailModel;
          }
        })
      ));

    this.set({
      thumbnailModels: mergedThumbnailModels,
    });
  };

  deleteFileThumbnail = async (model: ThumbnailModel) => {
    const { fileId, newFileUpload, info } = model.get();
    const isUploaded =
      !!fileId &&
      (!newFileUpload || newFileUpload.status === FileUploadStatusEnum.Ready);
    const { onDelete } = this.config;
    const uploadId = newFileUpload?.id;

    if (isUploaded) {
      if (onDelete) {
        const deleted = await onDelete(fileId, info?.onlineFileId);

        if (!deleted) {
          return;
        }
      }

      // 不能直接使用 thumbnailModels, 有闭包问题
      const deletedModels = this.get().thumbnailModels.filter(
        (model) => model.get().fileId !== fileId
      );

      this.set({ thumbnailModels: deletedModels });
      this.emit("deleteThumbnail", model, deletedModels);
      this.emit("changed", this.getUploadedFileIds());
    } else {
      const metaData = conditional(
        uploadId && this.uploadingMetaDataMap.get(uploadId)
      );

      if (metaData) {
        metaData.abortController.abort();
      }

      const deletedModels = this.get().thumbnailModels.filter((model) => {
        const { newFileUpload } = model.get();

        return !(newFileUpload && newFileUpload.id === uploadId);
      });

      this.set({
        thumbnailModels: deletedModels,
      });

      this.emit("deleteThumbnail", model, deletedModels);
      this.continueUploadIfHasWaitingFiles();
    }
  };

  batchDeleteThumbnailModels = (thumbnailModels: ThumbnailModel[]) =>
    Promise.all(
      thumbnailModels.map((model) => this.deleteFileThumbnail(model))
    );

  updateFileThumbnail = <K extends "newFileUpload" | "info">(
    uploadId: string,
    updated: Partial<Omit<FileThumbnail, K>> & {
      [Key in K]?: Partial<FileThumbnail[Key]>;
    }
  ) => {
    const { thumbnailModels } = this.get();

    const targetModel = thumbnailModels.find((model) => {
      const { newFileUpload } = model.get();

      return newFileUpload?.id === uploadId;
    });

    if (targetModel) {
      const thumbnail = targetModel.get();

      targetModel.update(
        Object.entries(updated).reduce<FileThumbnail>((acc, [key, value]) => {
          if (
            (key === "newFileUpload" || key === "info") &&
            typeof value === "object"
          ) {
            return {
              ...acc,
              [key]: {
                ...acc[key],
                ...value,
              },
            };
          }
          return {
            ...acc,
            [key]: value,
          };
        }, thumbnail)
      );
    }
  };

  private pushToUploadPipeline = async (file: File) => {
    const uploadId = v4();

    const uploadInfo = this.getUploadInfo(file, uploadId);

    if (uploadInfo) {
      this.addFileThumbnail(uploadInfo);
    }

    if (uploadInfo?.status !== FileUploadStatusEnum.SizeLimitExceeded) {
      this.startUploadProcess(uploadId, false);
    }
  };

  private startUploadProcess = async (
    uploadId: string,
    isReUpload: boolean
  ) => {
    const { maxConcurrencyCount } = this.config;

    // 并发数超出
    const concurrencyLimitExceeded =
      maxConcurrencyCount &&
      this.get().thumbnailModels.filter((model) =>
        ThumbnailModel.isInUploadingProcess(model)
      ).length >= maxConcurrencyCount;

    if (concurrencyLimitExceeded) {
      this.updateFileThumbnail(uploadId, {
        newFileUpload: {
          status: isReUpload
            ? FileUploadStatusEnum.WaitingForRetry
            : FileUploadStatusEnum.Waiting,
        },
      });

      return;
    }

    this.updateFileThumbnail(uploadId, {
      newFileUpload: {
        status: FileUploadStatusEnum.Preparing,
      },
    });

    const { customizeUpload } = this.config;

    const uploadPipeLine = [
      this.getFileMd5,
      this.getUploadUrl,
      this.checkFileExists,
      this.uploadToServer,
      this.loopCheckFileReadiness,
    ];

    const abortController = new AbortController();
    const metaData = this.uploadingMetaDataMap.get(uploadId);

    this.uploadingMetaDataMap.set(uploadId, {
      ...(metaData ?? {}),
      timer: -1,
      abortController,
      count: 0,
    });

    await runWaterfallPromises(uploadPipeLine, {
      isCustomizeUpload: !!customizeUpload,
      uploadId,
      abortController,
      isReUpload,
    });

    this.uploadingMetaDataMap.delete(uploadId);
  };

  private getUploadInfo = (
    file: File,
    uploadId: string
  ): Optional<FileUploadInfo> => {
    const { userInfo, supportedFileExtensions, maxFileSize, minFileSize } =
      this.config;

    // 理论上应该不会有这种情况, 不过老逻辑里有这种情况
    if (!userInfo) {
      this.emit("error", {
        uploadId,
        code: UploaderErrorEnum.NoAccess,
        message: "no_access_to_upload_files",
      });

      return;
    }

    const { name: filename, size: fileSize } = file;
    // 在 useDropZone 那里其实已经限制了文件类型了,这里再次判断是为了防止绕过前端的限制
    const [extension, extensionErrorMessage] = validateExtension(
      filename,
      supportedFileExtensions
    );

    if (!extension) {
      this.emit("error", {
        uploadId,
        code: UploaderErrorEnum.NotSupportedType,
        message: extensionErrorMessage,
      });
      return;
    }

    const maxSizeExceeded = maxFileSize !== undefined && fileSize > maxFileSize;
    const minSizeNotReached =
      minFileSize !== undefined && fileSize <= minFileSize;
    const sizeLimitExceeded = maxSizeExceeded || minSizeNotReached;
    const sizeErrorMessage =
      conditional(
        maxSizeExceeded &&
          "max_upload_file_size_limit:" + formatBytes(maxFileSize)
      ) ??
      conditional(
        minSizeNotReached &&
          (minFileSize === 0
            ? "empty_upload_file_limit"
            : "min_upload_file_size_limit:"+(formatBytes(minFileSize)))
      );

    const uploadInfo = {
      id: uploadId,
      raw: file,
      filename: getNewFileName(filename, this.checkFilenameExists),
      status: sizeLimitExceeded
        ? FileUploadStatusEnum.SizeLimitExceeded
        : FileUploadStatusEnum.Waiting,
      extension,
      uploader: userInfo,
      uploadedAt: dayjs().unix(),
      type: calcFileTypes(filename),
      errorMessage: sizeErrorMessage,
      canRetry: !sizeLimitExceeded,
    };

    if (sizeLimitExceeded && sizeErrorMessage) {
      this.emit("error", {
        code: UploaderErrorEnum.SizeLimit,
        message: sizeErrorMessage,
        uploadId,
      });
    }

    return uploadInfo;
  };

  private getFileMd5 = async (
    context: UploadPipeLineContext
  ): Promise<Optional<UploadPipeLineContext>> => {
    const { uploadId, abortController, isReUpload } = context;
    const thumbnail = this.getThumbnailWithUploadInfo(uploadId);

    if (!thumbnail || abortController.signal.aborted) {
      return;
    }

    if (isReUpload) {
      return context;
    }

    const md5 = await getFileMd5(thumbnail.newFileUpload.raw);

    if (!md5) {
      const errorMessage =
        "meeting.agenda.file_md5_generation_failed";

      this.updateFileThumbnail(uploadId, {
        newFileUpload: {
          status: FileUploadStatusEnum.Failed,
          errorMessage,
        },
      });

      this.emit("error", {
        uploadId,
        code: UploaderErrorEnum.getMd5Failed,
        message: errorMessage,
      });

      this.continueUploadIfHasWaitingFiles();
      return;
    }

    this.updateFileThumbnail(uploadId, { newFileUpload: { md5 } });

    return context;
  };

  private getUploadUrl = async (
    context: UploadPipeLineContext
  ): Promise<Optional<UploadPipeLineContext>> => {
    const { uploadId, abortController, isCustomizeUpload, isReUpload } =
      context;
    const { fileType, isPublic } = this.config;
    const thumbnail = this.getThumbnailWithUploadInfo(uploadId);
    const { newFileUpload } = thumbnail ?? {};

    if (!thumbnail || !newFileUpload?.md5 || abortController.signal.aborted) {
      return;
    }

    // trigger beforeUpload hook
    this.emit("beforeUpload", thumbnail, isReUpload);

    if (isCustomizeUpload) {
      return context;
    }

    const { filename, extension, raw } = thumbnail.newFileUpload;
    const { lastModified } = raw;

    // 获取默认的上传地址
    const [uploadUrlRes] = await getFileUploadUrl(
      filename,
      extension,
      newFileUpload.md5,
      dayjs(lastModified).unix(),
      fileType,
      isPublic
    );

    if (uploadUrlRes) {
      return {
        ...context,
        uploadUrlRes,
      };
    }

    const errorMessage =
      "meeting.agenda.get_file_upload_url_failed";

    // 顺序不要动，先设置好错误状态再 emit error
    this.updateFileThumbnail(uploadId, {
      newFileUpload: {
        status: FileUploadStatusEnum.Failed,
        errorMessage,
      },
    });

    this.emit("error", {
      uploadId,
      code: UploaderErrorEnum.getUploadUrlFailed,
      message: errorMessage,
    });

    this.continueUploadIfHasWaitingFiles();
  };

  private checkFilenameExists = (filename: string) =>
    this.get().thumbnailModels.some(
      (model) => model.get().filename === filename
    );

  private checkFileExists = async (
    context: UploadPipeLineContext
  ): Promise<Optional<UploadPipeLineContext>> => {
    const { uploadUrlRes, uploadId, isCustomizeUpload, abortController } =
      context;

    if (abortController.signal.aborted) {
      return;
    }

    // 自定义上传直接跳过这一步
    if (isCustomizeUpload) {
      return context;
    }

    const thumbnail = this.getThumbnailWithUploadInfo(uploadId);

    if (!thumbnail || !uploadUrlRes) {
      return;
    }

    const { uploadUrl, type, sid } = uploadUrlRes;

    // 没有 uploadUrl 说明该文件已存在
    const isFileExisted = !uploadUrl;

    this.updateFileThumbnail(uploadId, {
      fileId: sid,
      newFileUpload: {
        type,
        status: FileUploadStatusEnum.Uploading,
        progress: isFileExisted ? 99 : 0,
      },
    });

    return {
      ...context,
      isFileExisted,
    };
  };

  private uploadToServer = async (
    context: UploadPipeLineContext
  ): Promise<Optional<UploadPipeLineContext>> => {
    const { customizeUpload } = this.config;
    const {
      isFileExisted,
      uploadId,
      uploadUrlRes,
      isCustomizeUpload,
      abortController,
    } = context;
    const thumbnail = this.getThumbnailWithUploadInfo(uploadId);

    if (!thumbnail || abortController.signal.aborted) {
      return;
    }

    const {
      newFileUpload: { raw },
    } = thumbnail;

    console.info(["Component-UploadFile"], {
      filename: raw.name,
      fileSize: raw.size,
      fileType: raw.type,
    });

    if (isCustomizeUpload && customizeUpload) {
      const uploadedThumbnail = await customizeUpload(
        thumbnail,
        ({ loaded, total }: ProgressEvent) => {
          this.updateFileThumbnail(uploadId, {
            newFileUpload: {
              // 只要没到 ready 状态,最高进度就是 99
              progress: Math.floor((loaded / total) * 99),
              status: FileUploadStatusEnum.Uploading,
            },
          });
        },
        abortController
      );

      // 如果自定义上传函数没用用我们给的 abortController 这里需要手动判断是否已经被取消(虽然不判断也不会有什么问题)
      const curAbortController = this.uploadingMetaDataMap.get(uploadId);

      if (
        !uploadedThumbnail ||
        curAbortController?.abortController.signal.aborted
      ) {
        return;
      }
      this.updateFileThumbnail(uploadId, uploadedThumbnail);

      return context;
    }

    if (isFileExisted) {
      return context;
    }

    if (!thumbnail.fileId || !uploadUrlRes?.uploadUrl) {
      return;
    }
    try {
      await upload(
        {
          url: uploadUrlRes.uploadUrl,
          file: raw,
          onProgress: ({ progress }) => {
            if (progress === undefined) {
              return;
            }
            this.updateFileThumbnail(uploadId, {
              newFileUpload: {
                progress: Math.floor(progress * 99),
                status: FileUploadStatusEnum.Uploading,
              },
            });
          },
        },
        abortController.signal
      );
      return context;
    } catch (error) {
      if (isCanceledError(error)) {
        return;
      }

      const isAxiosError = axios.isAxiosError(error);
      // 这里不要直接展示 Network Error, 错误提示做友好一点
      const errorMessage = isAxiosError
        ? "gateway_error"
        : "unknown_upload_error";

      this.updateFileThumbnail(uploadId, {
        newFileUpload: {
          status: FileUploadStatusEnum.Failed,
          errorMessage,
        },
      });

      this.emit("error", {
        uploadId,
        code: isAxiosError
          ? UploaderErrorEnum.AxiosError
          : UploaderErrorEnum.Other,
        message: errorMessage,
      });

      this.continueUploadIfHasWaitingFiles();
    }
  };

  private loopCheckFileReadiness = async (
    context: UploadPipeLineContext
  ): Promise<Optional<UploadPipeLineContext>> => {
    if (context.abortController.signal.aborted) {
      return;
    }

    // todo: Processing 看上去之后也可以干掉，好像就 agenda 相关文档那里用到，可以替换的时候和 ui 沟通
    this.updateFileThumbnail(context.uploadId, {
      newFileUpload: {
        status: FileUploadStatusEnum.Processing,
      },
    });

    return new Promise((resolve) => {
      this.uploadingMetaDataMap.set(context.uploadId, {
        abortController: context.abortController,
        timer: window.setTimeout(() => {
          this.checkFileReadiness(context, resolve);
        }, CHECK_FILE_INTERVAL),
        count: 1,
      });
    });
  };

  private checkFileReadiness = async (
    context: UploadPipeLineContext,
    resolve: (context: Optional<UploadPipeLineContext>) => void
  ) => {
    const { uploadId, abortController } = context;
    const thumbnail = this.getThumbnailWithUploadInfo(uploadId);
    const { retainUploadInfoAfterUploaded } = this.config;

    if (!thumbnail || !thumbnail.fileId) {
      return;
    }
    const { fileId } = thumbnail;

    if (abortController.signal.aborted) {
      return;
    }

    const [data] = await batchCheckIsFileReady.sendRequest([fileId]);
    const metaData = this.uploadingMetaDataMap.get(uploadId);

    if (!metaData) {
      return;
    }
    const { abortController: curAbortController, count } = metaData;

    if (curAbortController.signal.aborted) {
      return;
    }

    const retry = () => {
      this.uploadingMetaDataMap.set(uploadId, {
        abortController: curAbortController,
        timer: window.setTimeout(() => {
          this.checkFileReadiness(context, resolve);
        }, CHECK_FILE_INTERVAL),
        count: count + 1,
      });
    };

    const handleFailed = (
      uploadingStatus?:
        | FileUploadingStatusEnum.UploadFailed
        | FileUploadingStatusEnum.ConvertFailed
    ) => {
      let canRetry;
      let errorMessage;

      switch (uploadingStatus) {
        case FileUploadingStatusEnum.UploadFailed:
        case FileUploadingStatusEnum.ConvertFailed: {
          canRetry = false;
          errorMessage = "meeting.agenda.file_conversion_failed";
          break;
        }
        default: {
          canRetry = true;
          errorMessage = "meeting.agenda.file_uploading_timeout";
        }
      }

      this.updateFileThumbnail(uploadId, {
        newFileUpload: {
          status: FileUploadStatusEnum.Failed,
          canRetry,
          errorMessage,
        },
      });

      this.emit("error", {
        uploadId,
        code: UploaderErrorEnum.CheckFileExistFailed,
        message: errorMessage,
      });

      this.continueUploadIfHasWaitingFiles();

      resolve(undefined);
    };

    if (!data) {
      if (count === CHECK_FILE_READY_MAX_RETRY) {
        handleFailed();
      } else {
        retry();
      }
      return;
    }

    switch (data.uploadStatus) {
      case FileUploadingStatusEnum.Uploading:
      case FileUploadingStatusEnum.Converting: {
        if (count === CHECK_FILE_READY_MAX_RETRY) {
          handleFailed();
        } else {
          retry();
        }
        return;
      }
      case FileUploadingStatusEnum.ConvertFailed:
      case FileUploadingStatusEnum.UploadFailed: {
        handleFailed(data.uploadStatus);
        return;
      }
      case FileUploadingStatusEnum.Ready: {
        this.updateFileThumbnail(uploadId, {
          fileId,
          newFileUpload: {
            progress: 100,
            status: FileUploadStatusEnum.Ready,
            fileId,
          },
        });

        const uploadedFileIds = this.getUploadedFileIds();

        const model = this.getThumbnailModelByUploadId(uploadId);

        if (!model) {
          return;
        }

        this.continueUploadIfHasWaitingFiles();

        // 这个顺序不要动，先 emit uploaded 再 emit changed, 因为要先更新 isAllUploaded 的状态 再触发 changed, 部分组件会在 onChange 时更新 uploading 状态
        this.emit("uploaded", {
          lastUploadedFileId: fileId,
          thumbnail: model.get(),
          fileIds: uploadedFileIds,
          isAllUploaded: FileUploaderModel.isAllUploaded(
            this.get().thumbnailModels
          ),
          isAllUploadedOrFailed: this.isAllUploadedOrFailed(),
          thumbnailModels: this.get().thumbnailModels,
        });

        this.emit("changed", uploadedFileIds);

        await model.loadFileThumbnailAndPreviewUrl();

        if (!retainUploadInfoAfterUploaded) {
          this.updateFileThumbnail(uploadId, {
            newFileUpload: undefined,
          });
        }

        resolve(context);
      }
    }
  };

  // 创建新上传文件的 FileThumbnail
  private addFileThumbnail = (uploadInfo: FileUploadInfo) => {
    const { filename } = uploadInfo;

    const model = this.createThumbnailModel({
      filename,
      newFileUpload: uploadInfo,
    });

    const thumbnailModels = this.get().thumbnailModels.concat(model);

    this.set({
      thumbnailModels,
    });

    /*
     * 先设置一个占位的 thumbnail, 等待后续获取到 previewUrl 之后再更新, 防止顺序和用户选择的不符,
     * 这里不 await 的原因是加快速度 不阻塞后续获取 md5 | uploadUrl 等操作
     */
    if (isImage(filename)) {
      model.updatePreviewUrlByRawFile();
    }
  };

  private deferredUpdateFileThumbnailByUploadId = (uploadId: string) => {
    this.getThumbnailModelByUploadId(uploadId)?.updatePreviewUrlByRawFile();
  };

  private getThumbnailWithUploadInfo = (uploadId: string) => {
    const find = this.getThumbnailModelByUploadId(uploadId);

    const thumbnail = find?.get();

    if (isWithUploadInfoFileThumbnail(thumbnail)) {
      return thumbnail;
    }
  };

  private createThumbnailModel(thumbnail: FileThumbnail) {
    const { supportedThumbnailExtensions, isAnonymous, hideDetailViewers } =
      this.config;

    return new ThumbnailModel(
      { isAnonymous, hideDetailViewers, ...thumbnail },
      { supportedThumbnailExtensions }
    );
  }

  isAllUploadedOrFailed() {
    return this.get().thumbnailModels.every((model) =>
      ThumbnailModel.isUploadedOrFailed(model)
    );
  }

  private continueUploadIfHasWaitingFiles = () => {
    const waitingThumbnailModel = this.get().thumbnailModels.find((model) => {
      const { newFileUpload } = model.get();

      return (
        newFileUpload?.status !== undefined &&
        WAITING_STATUSES.includes(newFileUpload.status)
      );
    });

    if (!waitingThumbnailModel) {
      return;
    }

    const { newFileUpload } = waitingThumbnailModel.get();

    if (newFileUpload) {
      this.startUploadProcess(
        newFileUpload.id,
        newFileUpload.status === FileUploadStatusEnum.WaitingForRetry
      );
    }
  };

  getThumbnailModelByUploadId = (uploadId: string) =>
    this.get().thumbnailModels.find(
      (model) => model.get().newFileUpload?.id === uploadId
    );

  get isMaxFileCountReached() {
    const { maxTotalFileCount } = this.config;
    const { thumbnailModels } = this.get();

    return !!(maxTotalFileCount && thumbnailModels.length >= maxTotalFileCount);
  }

  syncConfig(newConfig: FileUploaderConfig) {
    const config = {
      ...this.config,
      ...newConfig,
    };

    const {
      maxFileSize = DEFAULT_MAX_FILE_SIZE,
      minFileSize = DEFAULT_MIN_FILE_SIZE,
      // 轮询+受控场景，没办法区分到底是暂时没有已上传的文件还是要清除所有文件，但是可以通过是否保留新上传文件的上传信息来区分
      retainUploadInfoAfterUploaded = false,
      ...others
    } = config;

    this.config = {
      retainUploadInfoAfterUploaded,
      minFileSize,
      maxFileSize,
      ...others,
    };
  }

  getUploadedImageThumbnailModels = () =>
    compact(this.get().thumbnailModels.map((model) => {
      const { fileId, filename } = model.get();

      if (isImage(filename) && fileId) {
        return model;
      }
    }));
}
