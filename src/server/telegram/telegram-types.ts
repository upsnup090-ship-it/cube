export type TelegramUser = {
  id: number;
  username?: string;
};

export type TelegramChat = {
  id: number;
  type?: string;
};

export type TelegramDice = {
  emoji: string;
  value: number;
};

export type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  dice?: TelegramDice;
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};
