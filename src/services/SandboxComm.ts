import { IToken } from "./debugger";

export enum SandboxMsgType {
    // top => frame
    RUN = 'RUN',
    DEBUG = 'DEBUG',
    DEBUG_NEXT = 'DEBUG_NEXT',
    DEBUG_STOP = 'DEBUG_STOP',
    SET_BREAKPOINTS = 'SET_BREAKPOINTS',

    // frame => top
    READY = 'SANDBOX_READY',
    CONSOLE = 'CONSOLE',
    DEBUG_STEP = 'DEBUG_STEP',
    DEBUG_ANNOTATION = 'DEBUG_ANNOTATION'
};
interface ISandboxMsg {
    isSandboxMsg: boolean;
    type: SandboxMsgType;
    data: any;
}
export interface IDebugMsgData {
    html: string;
    css: string;
    javascript: string;
    tokens?: IToken[];
    breakpointLines?: Record<number, boolean>;
}
export type IDebugNextData = boolean;
export class SandboxComm {
    target: Window;
    isReady: Promise<boolean> = null;
    setReady: () => void = null;
    callback: (type: string, data: any) => void;
    constructor(callback: SandboxComm['callback'], target: Window) {
        Object.assign(this, {callback, target});
        window.addEventListener('message', this.listener);
        if (target === window.top) {
            this.send(SandboxMsgType.READY);
        } else {
            // Set promise to be resolved when receiving 'ready' message from sandbox frame
            this.isReady = new Promise((res) => this.setReady = res);
        }
    }
    listener = (e: MessageEvent) => {
        const {data: eData} = e;
        if (eData && eData.isSandboxMsg) {
            const {type, data} = eData as ISandboxMsg;
            if (type === SandboxMsgType.READY) { // Handle 'ready' message from sandbox frame - resolve the isReady promise
                if (this.setReady) {
                    this.setReady();
                    this.setReady = null;
                }
            } else {
                this.callback(type, data);
            }
        }
    }
    send = async (type: SandboxMsgType, data: any = null) => {
        if (this.isReady) {
            await this.isReady;
        }
        const msg: ISandboxMsg = {
            isSandboxMsg: true,
            type,
            data
        };
        try {
            this.target.postMessage(msg, '*');
        } catch (err) {
            if (err.name === 'DataCloneError') {
                msg.data = msg.data.toString();
                this.target.postMessage(msg, '*');
            } else {
                console.log(err);
            }
        }
    }
    dispose = () => {
        this.callback = null;
        window.removeEventListener('message', this.listener);
    }
}