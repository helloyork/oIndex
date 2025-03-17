import {StringKeyOf, Thenable } from "./type";

export type EventTypes = {
    [key: string]: any[];
}
export type EventListener<T extends any[]> = (...args: T) => void | Thenable<any>;
export type EventToken<T extends EventTypes = EventTypes> = {
    type?: keyof T;
    listener?: EventListener<any>;
    cancel: () => void;
};

const RegisterEvent = "event:EventDispatcher.register" as const;

export class Events<T extends EventTypes, Type extends T & {
    [RegisterEvent]: [keyof EventTypes, EventListener<any>];
} = T & {
    [RegisterEvent]: [keyof EventTypes, EventListener<any>];
}> {
    public static RegisterEvent = RegisterEvent;
    private events: { [K in keyof Type]: Array<EventListener<Type[K]>> } = {} as any;
    private maxListeners = 10;

    public on<K extends StringKeyOf<Type>>(event: K, listener: EventListener<Type[K]>): EventToken {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        if (this.events[event].length > this.maxListeners) {
            console.warn(`Event ${event} has more than ${this.maxListeners} listeners (total: ${this.events[event].length}), this may cause performance issues.`);
        }

        this.emit(Events.RegisterEvent, event as any, listener as any);
        return {
            type: event,
            listener,
            cancel: () => {
                this.off(event, listener);
            }
        };
    }

    public depends(events: EventToken<T>[]): EventToken {
        return {
            cancel: () => {
                events.forEach(token => token.cancel());
            }
        };
    }

    public off<K extends keyof Type>(event: K, listener: EventListener<Type[K]>): void {
        if (!this.events[event]) return;

        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    public emit<K extends keyof Type>(event: K, ...args: Type[K]): void {
        if (!this.events[event]) return;

        this.events[event].forEach(listener => {
            listener(...args);
        });
    }

    public once<K extends StringKeyOf<Type>>(event: K, listener: EventListener<Type[K]>): EventToken {
        const onceListener: EventListener<Type[K]> = (...args) => {
            listener(...args);
            this.off(event, onceListener);
        };
        return this.on(event, onceListener);
    }

    public setMaxListeners(maxListeners: number): this {
        this.maxListeners = maxListeners;
        return this;
    }

    clear() {
        this.events = {} as any;
    }
}

