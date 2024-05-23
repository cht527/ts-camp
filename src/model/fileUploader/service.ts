import { RequestResult, ResponseList } from "@/typings/xhr";
import {
  DownloadOrViewFileResponse,
  FileInfoType,
  FileThumbnail,
  FileThumbnailWithUploadInfo,
  FileTypeEnum,
  FileUploadStatusWithId,
  FileUploadUrlResponse,
  PreviewUrlParams,
  UploadS3Params,
} from "./types";
import axios from "axios";

export const isWithUploadInfoFileThumbnail = (
  thumbnail?: FileThumbnail
): thumbnail is FileThumbnailWithUploadInfo => !!thumbnail?.newFileUpload;

export const fetchFilesUploadStatus = (ids: string[]) =>
  new Promise<RequestResult<ResponseList<FileUploadStatusWithId>>>((resolve) =>
    window.setTimeout(resolve, 3000)
  );

export const getFileUploadUrl = (
  filename: string,
  extension: string,
  md5: string,
  modifiedAt: number,
  fileType?: FileTypeEnum,
  isPublic?: boolean
) =>
  new Promise<RequestResult<FileUploadUrlResponse>>((resolve) =>
    window.setTimeout(resolve, 3000)
  );

export const upload = (
  { url, file, onProgress }: UploadS3Params,
  signal?: AbortSignal
) =>
  axios.request({
    url,
    method: "put",
    data: file,
    headers: {
      "Content-type": file.type,
    },
    onUploadProgress: onProgress,
    signal,
  });

export const getFileInfo = (ids: string | string[]) =>
  new Promise<RequestResult<ResponseList<FileInfoType>>>((resolve) =>
    window.setTimeout(resolve, 3000)
  );

export const getPreviewUrls = (ids: string[], params?: PreviewUrlParams) =>
  new Promise<RequestResult<ResponseList<DownloadOrViewFileResponse>>>(
    (resolve) => window.setTimeout(resolve, 3000)
  );

// 获取文件 thumbnail url 时，不计入 view
export const getPreviewUrlsWithoutView = (
  ids: string[],
  params?: PreviewUrlParams
) => getPreviewUrls(ids, { thumbnailUrlOnly: true, ...params });
