import Model from "../index";
import {
  FileInfoType,
  FileThumbnail,
  FileUploadStatusEnum,
  SupportedFileExtensionEnum,
} from "./types";
import { RequestBatchPipeline } from "./requestBatchPipeline";
import {
  getFileInfo,
  getPreviewUrls,
  getPreviewUrlsWithoutView,
} from "./service";
import { getBase64Url } from "@/utils/files";
import { Optional } from "@/typings/base";

export const SUPPORTED_IMAGE_EXTENSIONS: SupportedFileExtensionEnum[] = [
  SupportedFileExtensionEnum.PNG,
  SupportedFileExtensionEnum.JPEG,
  SupportedFileExtensionEnum.JPG,
  SupportedFileExtensionEnum.WEBP,
];

const batchGetFileInfo = new RequestBatchPipeline({
  requestFn: getFileInfo,
  maxBatchParamsSize: 30,
  pickResult: "sid",
});

const batchGetPreviewUrlWithoutView = new RequestBatchPipeline({
  requestFn: getPreviewUrlsWithoutView,
  maxBatchParamsSize: 30,
  pickResult: "sid",
});

const batchGetPreviewUrl = new RequestBatchPipeline({
  requestFn: getPreviewUrls,
  maxBatchParamsSize: 30,
  pickResult: "sid",
});

const DEFAULT_SERVICES = {
  batchGetFileInfo,
  batchGetPreviewUrlWithoutView,
  batchGetPreviewUrl,
};

export type ThumbnailModelServices = typeof DEFAULT_SERVICES;

type ThumbnailModelConfig = {
  supportedThumbnailExtensions: SupportedFileExtensionEnum[];
};

const UPLOADING_PROCESS_STATUSES = [
  FileUploadStatusEnum.Preparing,
  FileUploadStatusEnum.Uploading,
  FileUploadStatusEnum.Processing,
];

export class ThumbnailModel extends Model<
  FileThumbnail,
  {
    thumbnailChange: (model: ThumbnailModel) => void;
  }
> {
  static isUploadedOrFailed(thumbnailModel: ThumbnailModel) {
    const { newFileUpload } = thumbnailModel.get();
    const finishedStatus = [
      FileUploadStatusEnum.Ready,
      FileUploadStatusEnum.Failed,
      FileUploadStatusEnum.SizeLimitExceeded,
    ];

    return !newFileUpload || finishedStatus.includes(newFileUpload.status);
  }

  static isInUploadingProcess(thumbnailModel: ThumbnailModel) {
    const { newFileUpload } = thumbnailModel.get();

    return (
      !!newFileUpload &&
      UPLOADING_PROCESS_STATUSES.includes(newFileUpload.status)
    );
  }

  private config: ThumbnailModelConfig;
  private services: ThumbnailModelServices;
  // todo batchRequestPipeline 支持 abort 后用 abort 来处理
  private previewUrlReqCanceled?: boolean;

  constructor(
    data: FileThumbnail,
    config?: Partial<ThumbnailModelConfig> & {
      services?: ThumbnailModelServices;
    }
  ) {
    super({ data });

    const {
      supportedThumbnailExtensions = SUPPORTED_IMAGE_EXTENSIONS,
      services = DEFAULT_SERVICES,
      ...restConfig
    } = config ?? {};

    this.config = { supportedThumbnailExtensions, ...restConfig };
    this.services = services;

    this.subscribe(
      (
        { info, previewUrl, newFileUpload },
        {
          info: prevInfo,
          previewUrl: prevPreviewUrl,
          newFileUpload: prevUploadInfo,
        }
      ) => {
        if (
          info !== prevInfo ||
          previewUrl !== prevPreviewUrl ||
          newFileUpload?.status !== prevUploadInfo?.status
        ) {
          this.emit("thumbnailChange", this);
        }
      }
    );

    if (data.fileId) {
      this.loadFileThumbnailAndPreviewUrl();
    }
  }

  getThumbnailId = (): string => {
    const { newFileUpload, fileId } = this.get();

    const thumbnailId = fileId ?? newFileUpload?.id;

    if (!thumbnailId) {
      throw new Error("error: should be at least one file id and upload id");
    }

    return thumbnailId;
  };

  update(data: Partial<FileThumbnail>) {
    this.set({
      ...data,
    });
  }

  getIsLoaded() {
    const { info, previewUrl } = this.get();

    return !!info && (!this.isNeedGetPreviewUrl(info) || !!previewUrl);
  }

  /*
   * forceFetchPreviewUrl
   * 主要是用在预览组件获取 previewUrlInfo 的，一个是要考虑过期，还有一个是像 video 这种文件，作为缩略图时是不展示预览图封面图什么的，但是预览组件需要这些，所以要有参数控制。
   */
  public loadFileThumbnailAndPreviewUrl = async (
    forceFetchPreviewUrl?: boolean
  ) => {
    const { fileId, info, loading } = this.get();

    if (!fileId || (loading && !forceFetchPreviewUrl)) {
      return false;
    }

    this.set({ loading: true });

    const fileInfo = info ?? (await this.loadFileThumbnailFromServer());

    if (fileInfo) {
      const res = await this.loadPreviewUrlFromServer(
        fileInfo,
        forceFetchPreviewUrl
      );

      this.set({ loading: false });

      // VideoPlayer 会使用这个返回值来判断是否重试成功
      return res;
    }

    this.set({ loading: false });
    return false;
  };

  public updatePreviewUrlByRawFile = () => {
    const { newFileUpload } = this.get();

    if (!newFileUpload) {
      return;
    }

    const { raw } = newFileUpload;

    getBase64Url(raw).then((base64) => {
      this.set({ previewUrl: base64 });
    });
  };

  public clearPreviewUrl = () => {
    this.previewUrlReqCanceled = true;
    // thumbnailUrl 不需要清除，考虑到 pdf 类型的文件有需要展示封面的需求。
    this.set({ previewUrl: undefined, fileTranscribeUrl: undefined });
  };

  setViewerDrawerVisible = (viewerDrawerVisible: boolean) => {
    this.set({ viewerDrawerVisible });
  };

  private async loadFileThumbnailFromServer(): Promise<Optional<FileInfoType>> {
    const { fileId } = this.get();

    if (!fileId) {
      return;
    }
    const [fileInfo] = await this.services.batchGetFileInfo.sendRequest(fileId);

    if (!fileInfo) {
      return;
    }

    this.set({
      filename: fileInfo.name,
      info: fileInfo,
    });

    return fileInfo;
  }

  private loadPreviewUrlFromServer = async (
    fileInfo: FileInfoType,
    forceFetchPreviewUrl?: boolean
  ) => {
    const { previewUrl } = this.get();

    if (
      (previewUrl || !this.isNeedGetPreviewUrl(fileInfo)) &&
      !forceFetchPreviewUrl
    ) {
      return false;
    }
    this.previewUrlReqCanceled = false;

    const { sid } = fileInfo;

    // 如果是缩略图就调用不统计 viewed 的接口，如果是预览组件则统计 viewed
    const [previewUrlInfo] = await (forceFetchPreviewUrl
      ? this.services.batchGetPreviewUrl.sendRequest(sid)
      : this.services.batchGetPreviewUrlWithoutView.sendRequest(sid));

    if (!previewUrlInfo || this.previewUrlReqCanceled) {
      return false;
    }

    this.set({
      previewUrl: previewUrlInfo.url,
      thumbnailUrl: previewUrlInfo.thumbnailUrl,
      fileTranscribeUrl: previewUrlInfo.fileTranscribeUrl,
    });

    return true;
  };

  private isNeedGetPreviewUrl(info: FileInfoType) {
    const { isPreviewable, extension } = info;
    const { supportedThumbnailExtensions } = this.config;

    return isPreviewable && supportedThumbnailExtensions.includes(extension);
  }
}
