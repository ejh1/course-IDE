import { SandboxComm, SandboxMsgType, IDebugNextData, IDebugMsgData } from '@services/SandboxComm';
import { IConsoleItem } from './class-data';
import { DebugExecution, IDebugCallbacks, ITextData, IToken } from './debugger';

export class SandboxFrame implements IDebugCallbacks {
    comm: SandboxComm;
    debugExecution: DebugExecution;
    constructor() {
        this.comm = new SandboxComm(this.gotMessage, window.parent);
        const log = (type: keyof Console, msg: any, otherArgs?: any[]) => {
            try {
                this.sendConsole({msg, otherArgs, type});
            } catch (er) {
                try {
                    this.sendConsole({msg: msg.toString(), otherArgs, type});
                } catch (er) { // Don't let it be handled by us
                    _console.error(er);
                }
            }
            if (otherArgs) {
                _console[type].call(_console, [msg, ...otherArgs]);
            } else {
                _console[type](msg);
            }
        };
        const _console = window.console;
        (window as any).console = (['log','warn','error'] as Array<keyof Console>).reduce((acc: Record<string, Function>, type) => {
            acc[type] = (msg: any, ...rest: any[]) => log(type, msg, !!rest.length && rest);
            return acc;
        }, {});
        window.addEventListener('error', (error) => {
            error = error.error || error
            let msg = (error as any).stack || error.toString();
            if (msg) {
                msg = msg.replace(/(at )?eval\s*/g, '').replace(/(at )?window.runScript\s*/g, '').replace(RegExp(location.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')+'[\/a-zA-Z0-9\:\.]+', 'g'),'').replace(/\(\),?/g, '').replace(/\s*<anonymous>:/g,'')
            } else {
                msg = error.toString();
            }
            log('error', msg);
        });
    }
    sendConsole = (item: IConsoleItem) => this.comm.send(SandboxMsgType.CONSOLE, item)
    gotMessage = (type: string, data: any) => {
        switch (type as SandboxMsgType) {
            case SandboxMsgType.RUN:
            case SandboxMsgType.DEBUG:
                const {javascript, html, css, tokens, breakpointLines} = data as IDebugMsgData;
                if (html) {
                    document.documentElement.innerHTML = html;
                }
                if (css) {
                    const style = document.createElement('style');
                    style.type = 'text/css';
                    style.innerHTML = css;
                    document.head.appendChild(style);
                }
                if (type === SandboxMsgType.RUN) {
                    if (javascript) {
                        window.requestAnimationFrame(() => (window as any).runScript(javascript));
                    }
                } else {
                    this.debugExecution = new DebugExecution(tokens as IToken[], this.debugStepCallback,
                        this.debugAnnotationCallback, breakpointLines)
                }
                break;
            case SandboxMsgType.DEBUG_NEXT:
                this.debugExecution.nextStep(data as IDebugNextData);
                break;
            case SandboxMsgType.DEBUG_STOP:
                if (this.debugExecution) {
                    this.debugExecution.dispose();
                    this.debugExecution = null;
                }
                break;
            case SandboxMsgType.SET_BREAKPOINTS:
                if (this.debugExecution) {
                    this.debugExecution.setBreakpoinLines(data as DebugExecution['breakpointLines']);
                }
                break;
            case SandboxMsgType.GET_VAR_VALUE:
                if (this.debugExecution) {
                    const value = this.debugExecution.getVariableValue(data as IToken);
                    if (value) {
                        this.comm.send(SandboxMsgType.RETURN_VAR_VALUE, {token: data, value});
                    }
                }
                break;
        }
    }
    debugStepCallback = (line: number, offset: number) => this.comm.send(SandboxMsgType.DEBUG_STEP, {line, offset})
    debugAnnotationCallback = (line: number, start: number, end: number, msg: ITextData, isException: boolean = false) =>
        this.comm.send(SandboxMsgType.DEBUG_ANNOTATION, {line, start, end, msg, isException})
}