import { Optional } from "@/typings/base";

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
