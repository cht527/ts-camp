"use client";

import { useState } from "react";
import { wrap } from "comlink";
import { runBigtask } from "@/utils/bigTask";
import customizeLoop from "@/utils/customizeLoop";
const TIMES = 100000000;
function About() {
  const [data, setData] = useState("");
  const [loopCount, setLoopCount] = useState(0);

  const testLoop = () => {
    // 监听网络恢复情况（还可通过 closeNetworkAbnormalNotice 设置在线）
    customizeLoop(
      async () => {
        const count = await Promise.resolve().then(() => Math.random() * 10);
        setLoopCount(count);
      },
      {
        fireOnPageShow: true,
        stopOnPageHide: true,
        interval: 2 * 1000,
        fireOnInit: true,
      }
    );
  };
  return (
    <div>
      <h2>About</h2>
      <div>
        <div>loop test</div>
        <div>{loopCount}</div>
      </div>
      <div
        style={{
          backgroundColor: data === "loading" ? "#7fe7e7" : "#fff",
        }}
      >
        <button
          onClick={async () => {
            setData("loading");
            const worker = new Worker("../../workers", {
              name: "runBigTask",
              type: "module",
            });
            const { runBigtask } =
              wrap<import("../../workers").RunbigTaskworker>(worker);
            setData(await runBigtask(TIMES));
          }}
        >
          webWorker
        </button>
        <button
          onClick={() => {
            setData("loading");

            setData(runBigtask(TIMES));
          }}
        >
          normal
        </button>
        <button onClick={() => testLoop()}>test loop</button>
      </div>
      <div>{data}</div>
    </div>
  );
}

export default About;
