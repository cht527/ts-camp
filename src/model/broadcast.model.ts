import { PlainObject } from "@/typings/base";
import Model from "./index";

export enum BroadcastEventName {
  BecomeUserChanged = "BecomeUserChanged",
  SystemUpdate = "SystemUpdate",
}

type BroadcastEventMessage = {
  event: BroadcastEventName;
  parameters?: PlainObject;
};

type BroadcastModelData = {};

type BroadcastModelEvents = Record<
  BroadcastEventName,
  (parameters?: PlainObject) => void
>;

const CHANNEL_NAMES = ["BROADCAST_CHANNEL"];

class BroadcastModel extends Model<BroadcastModelData, BroadcastModelEvents> {
  private static instance?: BroadcastModel;
  private channels: BroadcastChannel[];

  private constructor() {
    super({
      data: {},
    });
    this.channels = CHANNEL_NAMES.map((channelName) => {
      const channel = new BroadcastChannel(channelName);

      channel.addEventListener("message", this.messageHandler);
      return channel;
    });
  }

  static getInstance() {
    if (!BroadcastModel.instance) {
      BroadcastModel.instance = new BroadcastModel();
    }
    return BroadcastModel.instance;
  }

  postMessage(event: BroadcastEventName, parameters?: PlainObject) {
    this.channels.forEach((channel) => {
      /*
       * 避免 dev 开发环境中，热更新导致实例被销毁，阻塞 become 页面刷新
       * 'Failed to execute 'postMessage' on 'BroadcastChannel': Channel is closed'
       */
      try {
        channel.postMessage(
          JSON.stringify({
            event,
            parameters,
          })
        );
      } catch (error) {
        console.error("Failed to post message:", error);
      }
    });
  }

  messageHandler = (messageEvent: MessageEvent<string>) => {
    const eventDataMessage = messageEvent.data;

    if (!eventDataMessage) {
      return;
    }
    const { event, parameters }: BroadcastEventMessage =
      JSON.parse(eventDataMessage);

    this.emit(event, parameters);
  };

  destroyInstance() {
    this.channels.forEach((channel) => {
      channel.close();
    });
    this.destroy();
    BroadcastModel.instance = undefined;
  }
}

export default BroadcastModel;
