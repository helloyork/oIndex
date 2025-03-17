import {BaseWindowConstructorOptions, BrowserWindow, Rectangle, WebPreferences, screen} from "electron";
import _ from "lodash";
import {Events, EventToken} from "../../utils/events";
import Store from "electron-store";
import {concatNamespace} from "../../utils/string";
import {AppStoreNamespace, WindowStateStoreKey} from "../constants";

type AppWindowEvents = {};

export interface AppWindowConfig {
    preload: string;
    isolated: boolean;
    name: string;
    extend: BaseWindowConstructorOptions;
}

export type ModifierKey = {
    alt?: boolean;
    ctrl?: boolean;
    shift?: boolean;
    meta?: boolean;
};

export class AppWindow {
    public static DefaultAppWindowConfig: AppWindowConfig = {
        preload: "",
        isolated: true,
        name: "",
        extend: {},
    }
    public static DefaultAppWindowState = {
        width: 800,
        height: 600,
    };
    public readonly appConfig: AppWindowConfig;
    public readonly events: Events<AppWindowEvents> = new Events<AppWindowEvents>();
    public readonly win: BrowserWindow;
    private readonly store: Store<Rectangle>;

    constructor(appConfig: AppWindowConfig) {
        this.appConfig = _.defaultsDeep({}, appConfig, AppWindow.DefaultAppWindowConfig);
        this.win = this.constructWindow();
        this.store = this.initStore();

        this.prepare();
    }

    public onReady(fn: () => void): EventToken {
        const listener = () => {
            fn();
        };
        this.win.on("ready-to-show", listener);
        return {
            cancel: () => {
                this.win.removeListener("ready-to-show", listener);
            }
        };
    }

    public onKeyPressed(key: string, fn: VoidFunction): EventToken;
    public onKeyPressed(key: string, modifiers: ModifierKey, fn: VoidFunction): EventToken;
    public onKeyPressed(key: string, modifiersOrFn: ModifierKey | VoidFunction, fn?: VoidFunction): EventToken {
        const listener = (event: Electron.Event, input: Electron.Input) => {
            if (input.type === "keyUp" && (input.key === key || input.key.toUpperCase() === key.toUpperCase())) {
                if (typeof modifiersOrFn === "object") {
                    if ((modifiersOrFn.alt && !input.alt) ||
                        (modifiersOrFn.ctrl && !input.control) ||
                        (modifiersOrFn.shift && !input.shift) ||
                        (modifiersOrFn.meta && !input.meta)) {
                        return;
                    }
                    fn?.();
                } else {
                    modifiersOrFn();
                }
                event.preventDefault();
            }
        };
        this.win.webContents.on("before-input-event", listener);
        return {
            cancel: () => {
                this.win.webContents.removeListener("before-input-event", listener);
            }
        };
    }

    public toggleDevTools() {
        this.win.webContents.toggleDevTools();
    }

    private prepare(): this {
        this.prepareState();
        return this;
    }

    private constructWindow(): BrowserWindow {
        return new BrowserWindow({
            webPreferences: this.getWebPreferences(),
            ...this.appConfig.extend,
        });
    }

    private getWebPreferences(): WebPreferences {
        return {
            contextIsolation: this.appConfig.isolated,
            nodeIntegration: !this.appConfig.isolated,
            preload: this.appConfig.preload,
        };
    }

    private prepareState() {
        const bounds = screen.getPrimaryDisplay().bounds;

        const defaultSize: Rectangle & { x: number; y: number } = {
            width: this.appConfig.extend.width || AppWindow.DefaultAppWindowState.width,
            height: this.appConfig.extend.height || AppWindow.DefaultAppWindowState.height,
            x: Math.floor((bounds.width - (this.appConfig.extend.width || AppWindow.DefaultAppWindowState.width)) / 2),
            y: Math.floor((bounds.height - (this.appConfig.extend.height || AppWindow.DefaultAppWindowState.height)) / 2),
        };

        let state = {};

        const restore = (): Rectangle => this.store.get(WindowStateStoreKey.State, defaultSize);

        const getCurrentPosition = (): Rectangle & { x: number; y: number } => {
            const position = this.win.getPosition();
            const size = this.win.getSize();
            return {
                x: position[0],
                y: position[1],
                width: size[0],
                height: size[1],
            };
        };

        const windowWithinBounds = (
            windowState: Rectangle & { x: number; y: number },
            bounds: Rectangle & { x: number; y: number }
        ): boolean => {
            return (
                windowState.x >= bounds.x &&
                windowState.y >= bounds.y &&
                windowState.x + windowState.width <= bounds.x + bounds.width &&
                windowState.y + windowState.height <= bounds.y + bounds.height
            );
        };

        const resetToDefaults = (): Rectangle & { x: number; y: number } => ({
            ...defaultSize,
        });

        const ensureVisibleOnSomeDisplay = (
            windowState: Rectangle & { x?: number; y?: number }
        ): Rectangle & { x: number; y: number } => {
            const visible = screen.getAllDisplays().some((display) =>
                windowWithinBounds(windowState as Rectangle & { x: number; y: number }, display.bounds)
            );
            if (!visible) {
                return resetToDefaults();
            }
            return windowState as Rectangle & { x: number; y: number };
        };

        const saveState = (): void => {
            if (!this.win.isMinimized() && !this.win.isMaximized()) {
                Object.assign(state, getCurrentPosition());
            }
            this.store.set(WindowStateStoreKey.State, state);
        };

        state = ensureVisibleOnSomeDisplay(restore());

        this.win.on("close", saveState);
    }

    private initStore(): Store<Rectangle> {
        return new Store<Rectangle>({
            name: concatNamespace(AppStoreNamespace.WindowState, this.appConfig.name),
        });
    }
}
