import { IsTypeEqual } from "./typeassert";

type Absolute<T extends number | string | bigint> = `${T}` extends `-${infer S}` ? S : `${T}`

/* _____________ 测试用例 _____________ */

type Check_Absolute = IsTypeEqual<Absolute<-242>, '242'>