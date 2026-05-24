export interface QueueMessage {
  type: "user";
  message: { role: "user"; content: string };
}

export class MessageQueue {
  private messages: QueueMessage[] = [];
  private resolvers: Array<(value: IteratorResult<QueueMessage>) => void> = [];
  private closed = false;

  push(content: string) {
    if (this.closed) return;
    const msg: QueueMessage = { type: "user", message: { role: "user", content } };
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value: msg, done: false });
    } else {
      this.messages.push(msg);
    }
  }

  close() {
    this.closed = true;
    for (const resolve of this.resolvers) {
      resolve({ value: undefined, done: true } as IteratorResult<QueueMessage>);
    }
    this.resolvers = [];
  }

  [Symbol.asyncIterator]() {
    return {
      next: (): Promise<IteratorResult<QueueMessage>> => {
        if (this.messages.length > 0) {
          return Promise.resolve({ value: this.messages.shift()!, done: false });
        }
        if (this.closed) {
          return Promise.resolve({ value: undefined, done: true } as IteratorResult<QueueMessage>);
        }
        return new Promise<IteratorResult<QueueMessage>>((resolve) => {
          this.resolvers.push(resolve);
        });
      },
    };
  }
}
