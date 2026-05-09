import { Injectable } from '@nestjs/common';
import EventEmitter2 from 'eventemitter2';
import { DomainEvent } from './domain-events';

@Injectable()
export class EventBusService {
  private emitter = new EventEmitter2({ wildcard: true, maxListeners: 50 });

  emit<T>(event: DomainEvent<T>): void {
    this.emitter.emit(event.type, event);
  }

  on<T>(eventType: string, handler: (event: DomainEvent<T>) => void | Promise<void>): void {
    this.emitter.on(eventType, handler);
  }
}
