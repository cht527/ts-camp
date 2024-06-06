import { PickRequired, PlainObject } from "@/typings/base";
import type { WsClient } from "./index";



export declare enum WebSocketTopicEnum {
  Chat = "Chat",
  Message = "Message",
  PendingCount = "PendingCount",
  Meeting = "Meeting",
  Checklist = "Checklist",
  MaintenanceMode = "MaintenanceMode",
}

export type WebSocketOption = {
  key: WebSocketTopicEnum;
  isWebSocketEnable: boolean;
  client: WebSocketClientEnum;
  isMobileUseV2: boolean;
};
export type WebSocketConfiguration = {
  webSocketConfiguration: WebSocketOption[];
};
export declare enum WebSocketResponseTypeEnum {
  Response = "response",
  Notification = "notification",
  Pong = "pong",
  Ok = "ok",
  Default = "default",
}
export declare enum WebSocketRequestActionEnum {
  Connect = "$connect",
  Disconnect = "$disconnect",
  Subscribe = "subscribe",
  Unsubscribe = "unsubscribe",
  Ping = "ping",
  Default = "$default",
}
export declare enum WebSocketClientEnum {
  Web = "web",
  IOS = "iOS",
}

export type WebSocketEventDataUnionType = {
  type: string;
  value: PlainObject;
};
export declare enum WebSocketEventResultStatusEnum {
  Oversized = "Oversized",
  NoData = "NoData",
  Normal = "Normal",
}
export type WebSocketEventResult = {
  key: string;
  status: WebSocketEventResultStatusEnum;
  dataType?: string;
  dataUnionType?: WebSocketEventDataUnionType;
};

export type WebSocketResponseMessage = {
  /**
   * 这些属性如果是 Daedalus 返回是 Required START
   */
  message?: string;
  type?: WebSocketResponseTypeEnum;
  version?: number;
  schemasVersion?: string;
  /**
   * 这些属性如果是 Daedalus 返回是 Required END
   */
  requestId?: string;
  eventResult?: WebSocketEventResult;
  connectionId?: string;
  action?: string;
};
export type WebSocketRequestMessage = {
  action: string;
  requestId?: string;
  requester: PlainObject;
  connectionId: string;
  version?: number;
  key: WebSocketTopicEnum;
};

/** Websocket string 的开关配置 Map。key 为 string */
export type WsConfiguration = Dictionary<WebSocketOption>;

export type WsClientConfig = {
  url?: string;
  protocol?: string | string[];
  /**
   * 重试次数
   * @default RETRIES
   */
  retryTimes?: number;
  /**
   * @default HEARTBEAT_INTERVAL
   */
  heartbeatInterval?: number;
  /**
   * @default RETRIES_INTERVAL
   */
  retryInterval?: number;
  /**
   * @default RESPONSE_TIMEOUT
   */
  responseTimeout?: number;
};

export type WsClientInnerConfig = PickRequired<
  WsClientConfig,
  | "url"
  | "retryTimes"
  | "heartbeatInterval"
  | "retryInterval"
  | "responseTimeout"
>;

/** 不对外暴露 EventEmitter 的 `on`、`addListener`、`once` */
export type WsClientInstance = Omit<
  WsClient,
  "on" | "off" | "addListener" | "removeListener" | "once"
>;

export type BaseRequest = Required<Pick<WebSocketRequestMessage, "requestId">>;

export type BaseResponse = Pick<
  WebSocketResponseMessage,
  "requestId" | "connectionId" | "version" | "schemasVersion"
>;

export type PingRequest = { action: "ping" } & BaseRequest;

export type PingResponse = {
  type: WebSocketResponseTypeEnum.Pong;
  message: "pong";
} & BaseResponse;

export type SubscribeRequest = {
  action: "subscribe";
  key: string;
} & BaseRequest;

export type SubscribeResponse = {
  action: "subscribe";
  type: WebSocketResponseTypeEnum.Response;
  message: "ok";
  eventResult: { key: string };
} & BaseResponse;

export type UnsubscribeRequest = {
  action: "unsubscribe";
  key: string;
} & BaseRequest;

export type UnsubscribeResponse = {
  action: "unsubscribe";
  type: WebSocketResponseTypeEnum.Response;
  message: "ok";
  eventResult: { key: string };
} & BaseResponse;

export type NotificationEventResult<
  T = unknown,
  Target extends string = string
> = {
  key: string;
  valueTargetType?: Target;
} & (
  | {
      value: string;
      isCompressed: true;
    }
  | {
      value: T;
      isCompressed: false;
    }
);

export type NotificationResponse = {
  type: WebSocketResponseTypeEnum.Notification;
  message: "ok";
  eventResult: WebSocketEventResult;
} & BaseResponse;

export type WsRequestData = PingRequest | SubscribeRequest | UnsubscribeRequest;

export type WsResponseData =
  | PingResponse
  | SubscribeResponse
  | UnsubscribeResponse
  | NotificationResponse;

export type BaseEvents = {
  connect: () => void;
  reconnect: () => void;
  disconnect: () => void;
  error: (param: Event) => void;
};

export type SubscribeParams<T = unknown> = [
  data: T,
  res: WebSocketEventResult,
  raw: NotificationResponse
];

export type SubscribeFn<T = unknown> = (
  data: T,
  res: WebSocketEventResult,
  raw: NotificationResponse
) => void;

type AnyEvents = Record<string, (...param: SubscribeParams<any>) => void>;

export type WsEvents = BaseEvents & AnyEvents;

export type Subscription = {
  key: string;
  fn: SubscribeFn;
  requestId: string;
  timeoutId: number;
  resolve: () => void;
  reject: (error: Error) => void;
  /** 重试次数 */
  retries: number;
};

export type Resolver<T = void> = {
  resolve: (value?: T) => void;
  reject: (reason?: unknown) => void;
};
