import {
  FileTypeEnum,
  SupportedFileExtensionEnum,
} from "@/model/fileUploader/types";
import { Optional } from "@/typings/base";
import { isImageExtension } from "./compressImage";
import { enumGuard } from "power-guard";

export type Size = {
  width: number;
  height: number;
};

export const getBase64Url = (file: File): Promise<Optional<string>> =>
  new Promise((resolve) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => resolve("");
  });

export const getImageLocalUrlAndSize = async (
  file: File
): Promise<Optional<{ size: Size; url: string }>> => {
  const localUrl = await getBase64Url(file);

  if (localUrl) {
    return new Promise((res, rej) => {
      const img = new Image();

      img.src = localUrl;

      img.onload = () => {
        const { width, height } = img;

        res({ size: { width, height }, url: localUrl });
      };
      img.onerror = rej;
    });
  }
};

export const calcFileTypes = (filename: string) => {
  return FileTypeEnum.Other;
};

const getFileExtensionIndex = (filename?: string) => {
  if (!filename) {
    return -1;
  }

  return filename.lastIndexOf(".");
};

export const getFileExtension = (filename = "") => {
  const index = getFileExtensionIndex(filename);

  if (index < 0) {
    return filename;
  }
  return filename.slice(index).toLowerCase();
};

export const getNewFileName = (
  name: string,
  hasSameName?: (filename: string) => boolean
) => {
  if (!hasSameName?.(name)) {
    return name;
  }

  const extensionIndex = name.lastIndexOf(".");
  const extension = getFileExtension(name);
  const nameBody = extensionIndex === -1 ? name : name.slice(0, extensionIndex);
  let index = 1;

  while (hasSameName(`${nameBody} (${index})${extension}`)) {
    index += 1;
  }

  return `${nameBody} (${index})${extension}`;
};

export const isImage = (filename?: string) =>
  isImageExtension(getFileExtension(filename));

export const validateExtension = (
  filename: string,
  supportedFileExtensions?: SupportedFileExtensionEnum[]
): [extension: Optional<SupportedFileExtensionEnum>, errorMessage: string] => {
  const rawExtension = getFileExtension(filename);

  // 判断是否在传入的支持类型中
  if (
    rawExtension &&
    supportedFileExtensions &&
    supportedFileExtensions.every(
      (supportFileExtension) => supportFileExtension !== rawExtension
    )
  ) {
    return [undefined, "file_type_not_support"];
  }

  // 判断是否在所有的支持类型中
  try {
    return [enumGuard(SupportedFileExtensionEnum).required(rawExtension), ""];
  } catch {
    return [undefined, "unsupported_file_type"];
  }
};

export function formatBytes(bytes: number, decimals = 0) {
  if (bytes === 0) {
    return "0 B";
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
