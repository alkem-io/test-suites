export type BasePayload = Record<string, unknown>;

export type SocketEventData<TPayload extends BasePayload = BasePayload> = {
  type: string;
  payload: TPayload;
};
