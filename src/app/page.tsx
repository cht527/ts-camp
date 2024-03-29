"use client";

import { useEffect } from "react";

import rolandberger from "rolandbergerprofiler";

import styles from "./page.module.css";


const data = [
  { id: 0, name: "安逸", x: 0.22, y: 0.25, value: 0.75 },
  { id: 1, name: "刺激乐趣", x: 0.81, y: 0.07, value: 0.07 },
  { id: 2, name: "定制化", x: 0.78, y: 0.91, value: 0.31 },
  { id: 3, name: "服务", x: 0.61, y: 0.53, value: 0.2 },
  { id: 4, name: "高尚", x: 0.2, y: 0.05, value: 0.86 },
  { id: 5, name: "个人效率", x: 0.8, y: 0.75, value: 0.05 },
  { id: 6, name: "古典", x: 0.49, y: 0.22, value: 0.17 },
  { id: 7, name: "活力", x: 0.6, y: 0.48, value: 0.96 },
  { id: 8, name: "激情", x: 0.48, y: 0.09, value: 0.4 },
  { id: 9, name: "简约", x: 0.23, y: 0.47, value: 0.85 },
  { id: 10, name: "科技", x: 0.9, y: 0.55, value: 0.11 },
  { id: 11, name: "美誉", x: 0.57, y: 0.77, value: 0.25 },
  { id: 12, name: "明智购物", x: 0.28, y: 0.7, value: 0.09 },
  { id: 13, name: "亲和力", x: 0.4, y: 0.43, value: 0.27 },
  { id: 14, name: "全面成本", x: 0.24, y: 0.83, value: 0.95 },
  { id: 15, name: "新潮", x: 0.85, y: 0.42, value: 0.31 },
  { id: 16, name: "质量", x: 0.55, y: 0.63, value: 0.17 },
  { id: 17, name: "追求", x: 0.77, y: 0.22, value: 0.14 },
  { id: 18, name: "自然", x: 0.26, y: 0.21, value: 0.55 },
  { id: 19, name: "自由自在", x: 0.61, y: 0.3, value: 0.69 },
];

export default function Home() {
  useEffect(() => {
    const dom = document.getElementById("container");

    if (dom) {
      const rGraph = rolandberger.init(dom);

      rGraph.setOption({
        data,
      });
    }
  }, []);
  return (
    <main className={styles.main}>
      <div>
        <div id="container"></div>
      </div>
    </main>
  );
}
