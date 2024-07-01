import { Optional } from "@/typings/tool";
import { Base64 } from "js-base64";
import pako from "pako";

export type ParamsTK = {
  getURL: string;
  putURL: string;
  someOtherParam: string;
};

// 后端封装 paramTK，formUrl 通常用于 <a>标签 跳转，如邮件等
const formUrl = `xxxxx/xxx.html?paramTK=${encodeURIComponent(
  Buffer.from(
    pako.deflate(
      JSON.stringify({
        getURL: "get file url",
        putURL: "put file url",
        someOtherParam: "xxxx",
      })
    )
  ).toString("base64url")
)}`;

// 前端解析 URL中的
export function parseTK(paramTK: string): Optional<ParamsTK> {
  return JSON.parse(
    // 开启防火墙对 Query 参数的检查时，由于使用 Base64 编码可能解码出错，因此改为 Base64URL 编码
    new TextDecoder().decode(
      pako.inflate(Base64.toUint8Array(decodeURIComponent(paramTK)))
    )
  );
}
