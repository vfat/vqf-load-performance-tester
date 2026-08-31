export type SseSendFunction = (formattedMessage: string) => void;

export class TelemetryStreamer {
  private clients: Map<string, SseSendFunction> = new Map();

  get activeClientCount(): number {
    return this.clients.size;
  }

  addClient(id: string, sendFn: SseSendFunction): () => void {
    this.clients.set(id, sendFn);

    return () => {
      this.removeClient(id);
    };
  }

  removeClient(id: string): void {
    this.clients.delete(id);
  }

  broadcast(event: string, data: unknown): void {
    const formatted = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const toRemove: string[] = [];

    for (const [id, sendFn] of this.clients.entries()) {
      try {
        sendFn(formatted);
      } catch {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.clients.delete(id);
    }
  }

  clear(): void {
    this.clients.clear();
  }
}
