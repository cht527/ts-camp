import SparkMD5 from "spark-md5";

import { stringifyError } from "./tool";

export const KB_SIZE = 1024;

export default function getFileMd5(file: File): Promise<string> {
  const blobSlice = File.prototype.slice;
  const chunkSize = 2097152; // Read in chunks of 2MB
  const chunks = Math.ceil(file.size / chunkSize);
  let currentChunk = 0;
  const spark = new SparkMD5.ArrayBuffer();
  const fileReader = new FileReader();

  const loadNext = () => {
    const start = currentChunk * chunkSize,
      end = start + chunkSize >= file.size ? file.size : start + chunkSize;

    fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
  };

  return new Promise((resolve, reject) => {
    fileReader.onload = (event: ProgressEvent<FileReader>) => {
      spark.append(event.target?.result as ArrayBuffer); // Append array buffer
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        const fileMd5 = spark.end(); // Compute hash

        resolve(fileMd5);
      }
    };

    fileReader.onerror = (e) => {
      const targetError = e.target?.error;

      if (
        targetError &&
        targetError.name === "NotReadableError" &&
        targetError.message ===
          "The requested file could not be read, typically due to permission problems that have occurred after a reference to a file was acquired."
      ) {
        console.error("file_upload_failed");
        return reject(new Error("DLPError"));
      }

      console.error(
        JSON.stringify({
          eventInfo: {
            target: e.target,
            type: e.type,
            total: e.total,
          },
          fileInfo: {
            name: file.name,
            type: file.type,
            size: `${Math.round(file.size / KB_SIZE)}KB`,
          },
        })
      );

      console.error(targetError);
      console.error(stringifyError(fileReader.error));

      const errorCode = targetError?.code;

      /*
       * 文件路径不存在
       * errorCode === 8
       *
       * DOMException: A requested file or directory could not be found at the time an operation was processed.
       */
      if (errorCode === 8) {
        console.error("file_upload_read_failed");
      } else {
        console.error("file_upload_failed");
      }
      reject(new Error("fileReaderOnError"));
    };

    loadNext();
  });
}
