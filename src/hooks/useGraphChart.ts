import { MutableRefObject, useEffect, useRef } from "react";
import echarts from "echarts/lib/echarts";
type ChartOption = echarts.EChartOption;

function getOption(data: ChartOption): echarts.EChartOption {
  return data;
}

export default function useGraphCharts(
  ref: MutableRefObject<echarts.ECharts | null>,
  data: ChartOption,
  chartContainer: HTMLDivElement,
  showLoading?: boolean
) {

  const timeRef = useRef(0);

  useEffect(() => {
    ref.current = echarts.init(chartContainer);
    if (showLoading) {
      ref.current.showLoading("default", {
        text: "暂无数据",
        color: "transparent",
        textColor: "#1c68d9",
        maskColor: "rgba(255, 255, 255, 1)",
        zlevel: 0,
      });
    } else {
      ref.current.hideLoading();
    }
    ref.current.setOption(getOption(data), true);
  }, [chartContainer, data, ref, showLoading]);

  useEffect(() => {
    const resizeFunc = () => {
      if (timeRef.current) {
        window.clearTimeout(timeRef.current);
      }
      timeRef.current = window.setTimeout(() => {
        ref.current && ref.current.resize();
      }, 400);
    };
    window.addEventListener("resize", resizeFunc);

    return () => {
      if (ref.current) {
        ref.current.dispose();
      }
      window.removeEventListener("resize", resizeFunc);
    };
  }, [chartContainer, ref]);

 

  return ref.current;
}
