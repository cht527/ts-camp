type Size = {
  width: number;
  height: number;
};

export const FILE_BYTE_SIZE_10MB = 10485760;

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".jpeg", ".jpg", ".webp"];
export const isImageExtension = (extension: string) =>
  SUPPORTED_IMAGE_EXTENSIONS.some((ext) => ext === extension);

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

export const isImage = (filename?: string) =>
  isImageExtension(getFileExtension(filename));

const calcImageDisplayedSize = (
  size: Size,
  maxWidth: number,
  maxHeight?: number
): Size => {
  const imageOutlineWidth = 2;
  const actualMaxWidth = Math.max(maxWidth - imageOutlineWidth * 2, 0);
  const actualMaxHeight = maxHeight
    ? Math.max(maxHeight - imageOutlineWidth * 2, 0)
    : undefined;
  const { width: originWidth, height: originHeight } = size;

  if (
    originWidth <= actualMaxWidth &&
    (!actualMaxHeight || originHeight <= actualMaxHeight)
  ) {
    return size;
  }

  const widthRatio = originWidth / actualMaxWidth;
  const heightRatio = actualMaxHeight ? originHeight / actualMaxHeight : 0;
  const aspectRatio = originWidth / originHeight;

  if (!actualMaxHeight || widthRatio >= heightRatio) {
    return {
      width: actualMaxWidth,
      height: actualMaxWidth / aspectRatio,
    };
  }

  return {
    width: actualMaxHeight * aspectRatio,
    height: actualMaxHeight,
  };
};

export const compressImageWithAspectRatio = (
  file: File,
  maxFileSize = FILE_BYTE_SIZE_10MB,
  maxWidth = 4096,
  maxHeight = 4096
): File | Promise<File> => {
  const { name, type, size } = file;

  // 不用压缩
  if (!isImage(name) || size <= maxFileSize) {
    return file;
  }

  return new Promise((res, rej) => {
    const img = new Image();

    img.onload = () => {
      const { width, height } = img;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const { width: targetWidth, height: targetHeight } =
        calcImageDisplayedSize({ width, height }, maxWidth, maxHeight);

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      if (ctx) {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              res(new File([blob], name, { type }));
            }
            window.URL.revokeObjectURL(img.src);
          },
          type,
          1
        );
      } else {
        window.URL.revokeObjectURL(img.src);
      }
    };
    img.onerror = (err) => rej(err);
    img.src = window.URL.createObjectURL(file);
  });
};
