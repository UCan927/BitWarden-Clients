import { addRuntimeOnMessageListener } from "../../utils/browser-api/browser-api";

import {
  ExtensionRuntimeMessage,
  OnMessageHandlers,
  RuntimeOnMessageListenerService as RuntimeOnMessageListenerServiceInterface,
} from "./runtime-on-message-listener.abstractions";

class RuntimeOnMessageListenerService implements RuntimeOnMessageListenerServiceInterface {
  _onMessageListenerHandlers: OnMessageHandlers = {};

  constructor() {
    this._setupListeners();
  }

  registerHandlers(handlers: OnMessageHandlers): void {
    for (const [command, handler] of Object.entries(handlers)) {
      this.addHandler(command, handler);
    }
  }

  deregisterHandlers(handlers: OnMessageHandlers): void {
    for (const [command] of Object.entries(handlers)) {
      this.removeHandler(command);
    }
  }

  addHandler(command: string, handler: CallableFunction): void {
    if (this._onMessageListenerHandlers[command]) {
      throw new Error(`Handler for command ${command} already exists`);
    }

    this._onMessageListenerHandlers[command] = handler;
  }

  removeHandler(command: string): void {
    delete this._onMessageListenerHandlers[command];
  }

  private _setupListeners(): void {
    addRuntimeOnMessageListener(this._handleOnMessageEvent);
  }

  private _handleOnMessageEvent = (
    message: ExtensionRuntimeMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ): boolean => {
    const handler = this._onMessageListenerHandlers[message.command];

    if (!handler) {
      return;
    }

    const messageResponse = handler({ message, sender });
    if (!messageResponse) {
      return;
    }

    Promise.resolve(messageResponse).then((response) => sendResponse(response));
    return true;
  };
}

export default RuntimeOnMessageListenerService;