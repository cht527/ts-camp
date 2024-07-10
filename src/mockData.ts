import * as T from "./interface/test";

export const NAV_CONFIG: T.INavConfig[] = [
  {
    id: 0,
    title: "首页",
    slug: "",
  },
  {
    id: 1,
    title: "关于",
    slug: "about",
  },
  {
    id: 12,
    title: "看板",
    slug: "dashboard",
  },
  {
    id: 13,
    title: "iframe",
    slug: "iframe",
  },
];

const MOCK_DATA: T.ITest = {
  rgb: {
    r: 1,
    g: 1,
    b: 1,
  },
  blackWhite: {
    black: "S",
    white: "D",
  },
  data: {
    a: T.Data.P1,
    b: T.Data.P2,
  },
};

export default MOCK_DATA;
