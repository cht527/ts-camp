import { IsTypeEqual } from "@/typings/typeassert";


// 对于对象类型，我们使用 interface 替代 type 声明，方便可能的扩展和继承
export interface RGB {
  r: number
  g: number
  b: number
}

export interface BlackWhite {
  black: string
  white: string
  threshold?: number,
}

export enum Data{
  P1,
  P2
}


export interface ITest{
    rgb: RGB,
    blackWhite: BlackWhite,
    data: {
        a: Data,
        b: Data
    }
}


export interface INavConfig {
  id: number,
  title: string,
  slug: string,
}
