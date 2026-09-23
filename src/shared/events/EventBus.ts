export type DomainEvent = {
  type: string;
  payload: Record<string, unknown>;
};

type Handler = (event: DomainEvent) => void;

export class EventBus {
  private readonly handlers = new Map<string, Handler[]>();

  subscribe(type: string, handler: Handler): void {
    const current = this.handlers.get(type) ?? [];
    current.push(handler);
    this.handlers.set(type, current);
  }

  emit(type: string, payload: Record<string, unknown>): void {
    const event = { type, payload };
    for (const handler of this.handlers.get(type) ?? []) handler(event);
  }
}
