import {app} from 'electron'
import {App} from "./app/app";

!async function(){
    const app = new App({
        dirname: __dirname,
    });

    const win = await app.launch();
}();

app.on('window-all-closed', () => {
    app.quit()
});
