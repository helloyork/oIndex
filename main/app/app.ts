import {Events} from "../utils/events";
import {AppWindow} from "./appWindow/appWindow";
import serve from "electron-serve";
import {app} from "electron";
import path from "path";
import {AppWindowName, RendererAppEntry} from "./constants";
import * as url from "node:url";

type AppEvents = {
    "ready": [];
};
type AppState = {
    devMode: boolean;
    production: boolean;
};

export type AppConfig = {
    dirname: string;
};

export class App {
    public static MainWindowSize = {
        width: 800,
        height: 600,
    };
    public readonly events: Events<AppEvents> = new Events<AppEvents>();
    public readonly state: AppState;

    constructor(public config: AppConfig) {
        this.state = this.getInitialState();
        this.prepare();
    }

    public async launch(): Promise<AppWindow> {
        if (!app.isReady()) {
            await app.whenReady();
        }

        const mainWindow = new AppWindow({
            preload: path.join(this.config.dirname, "preload.js"),
            isolated: true,
            name: AppWindowName.Main,
            extend: {
                ...App.MainWindowSize,
            },
        });

        if (this.state.production) {
            const index = url.format({
                protocol: "app",
                slashes: true,
                pathname: RendererAppEntry.Index,
                hostname: ".",
            });
            await mainWindow.win.loadURL(index);
        } else {
            const port = process.argv[2];
            const index = url.format({
                protocol: "http",
                hostname: "localhost",
                port: port,
                pathname: RendererAppEntry.Index,
            });
            await mainWindow.win.loadURL(index);
            mainWindow.onKeyPressed("F12", () => {
                mainWindow.toggleDevTools();
            });
        }

        return mainWindow;
    }

    private prepare(): this {
        app.enableSandbox();
        if (this.state.production) {
            serve({ directory: "app" })
        } else {
            app.setPath("userData", path.resolve(this.config.dirname, "userData-dev"));
        }

        return this;
    }

    private getInitialState(): AppState {
        return {
            devMode: process.env.NODE_ENV !== "production",
            production: process.env.NODE_ENV === "production",
        };
    }

}
