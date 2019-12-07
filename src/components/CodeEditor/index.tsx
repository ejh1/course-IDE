import React from 'reactn';
import { Tabs, Button } from 'antd';
const { TabPane } = Tabs;
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { DebugExecution, ITextData } from '@services/debugger';

import './styles.scss';
import { IConsoleItem } from '@services/class-data';
import { translate } from '@components/Trans';

interface IProps {
    value?: string;
    options?: monaco.editor.IEditorOptions;
    loadedData?: {[key: string]: string}
}
interface IState {
    chosenTabIndex: number;
    debugger?: DebugExecution;
}
export default class CodeEditor extends React.Component<IProps, IState> {
    state: IState = {
        chosenTabIndex: 0
    };
    anyBreakpoints: boolean = false;
    breakpointLines: {[key: number]: boolean} = {};
    breakpointDecorations: string[] = [];
    debugLineHighlight: string[] = [];
    debugVariableDecorations: string[] = [];
    editorContainer: HTMLDivElement;
    gotDebugError: boolean  = false;
    debugContentWidget: monaco.editor.IContentWidget;
    setRef = (element: HTMLDivElement) => {
        this.editorContainer = element;
        const { value, options} = this.props;
        this.componentWillUnmount();
        if (!element) {
            return;
        }
        this.tabs.forEach(tab => {
            const {lang, model} = tab;
            if (!model) {
                tab.model = monaco.editor.createModel('', lang);
            }
        });
        (window as any)['editor'] = this._editor = monaco.editor.create(element, {
            minimap:{enabled:false},
            automaticLayout: true,
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 5,
            ...options
        });
        this._editor.onMouseDown(this.onEditorMouseDown);
        this._editor.setModel(this.tabs[this.state.chosenTabIndex].model);
    }
    componentWillUnmount = () => this._editor && this._editor.dispose();

    componentDidUpdate = ({loadedData: oldData}: IProps) => {
        const {loadedData: newData} = this.props;
        if (newData && newData !== oldData) {
            this.stopDebugging();
            this.tabs.forEach((tab, idx) => {
                (tab.model as monaco.editor.ITextModel).setValue(newData[tab.lang] || '');
            });
            const firstTab = this.tabs.find(({lang}) => newData[lang]);
            if (firstTab) {
                this.tabChanged(firstTab.name);
            }
        }
    }

    _editor: monaco.editor.IStandaloneCodeEditor = null;

    tabs: {name: string, lang: string, model?: monaco.editor.ITextModel, viewState?: any}[] = [
        {name: 'JavaScript', lang: 'javascript'},
        {name: 'HTML', lang: 'html'},
        {name: 'CSS', lang: 'css'}
    ];

    tabChanged = (key: string) => {
        const prevTab = this.tabs[this.state.chosenTabIndex]
        prevTab.viewState = this._editor.saveViewState();
        const chosenTabIndex = this.tabs.findIndex(({name}) => name === key);
        this.setState({ chosenTabIndex });
        const tab = this.tabs[chosenTabIndex];
        this._editor.setModel(tab.model);
        tab.viewState && this._editor.restoreViewState(tab.viewState);
    }
    execute = () => {
        const executionData: {} = this.tabs.reduce((acc: {[key: string]: string}, {lang, model}) => {
            acc[lang] = (model as monaco.editor.ITextModel).getValue();
            return acc;
        }, {});
        this.setGlobal({executionData});
    }
    onEditorMouseDown = (event: monaco.editor.IEditorMouseEvent) => {
        if (this.state.chosenTabIndex !== 0) {
            return;
        }
        const {target: {type, position: {lineNumber}}} = event;
        const line = lineNumber - 1;
        if (type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS) {
            const {breakpointLines} = this;
            if (breakpointLines[line]) {
                delete breakpointLines[line];
            } else {
                breakpointLines[line] = true;
            }
            const lines = Object.keys(breakpointLines);
            this.anyBreakpoints = !!lines.length;
            this.breakpointDecorations = this._editor.deltaDecorations(this.breakpointDecorations,
                lines.map(line => ({
                    range: new monaco.Range(+line+1, 1, +line+1, 1),
                    options: {
                        linesDecorationsClassName: 'breakpoint'
                    }
                })))
        }
    }
    debug = () => {
        this.setGlobal({console:[]});// Clear console
        if (this.state.debugger) {
            this.stopDebugging(undefined,this.debug);
        }
        const {model} = this.tabs[0];
        this.setState({
            debugger: new DebugExecution(model!, this.debugStepCallback,
                this.debugAnnotationCallback, this.debugNativeCallback, this.breakpointLines)
        });
        this._editor.updateOptions({readOnly:true});
    }
    debugNativeCallback = (key: string, args: any[] = []) => {
        switch (key) {
            case 'console.log':
                const [msg, ...otherArgs] = args;
                const record: IConsoleItem = {
                    type: 'log',
                    msg
                };
                otherArgs.length && (record.otherArgs = otherArgs);
                this.dispatch.consolePush(record);
                break;
            default:
                throw new Error('Unknown native func: ' + key);
        }
    }
    debugStepCallback = (line: number, offset: number) => {
        this.debugLineHighlight = this._editor.deltaDecorations(this.debugLineHighlight, [
            {
                range: new monaco.Range(line+1, 1, line+1, 1),
                options: {
                    isWholeLine: true,
                    className: 'debug-line'
                }
            }
        ]);
    }
    debugAnnotationCallback = (line: number, start: number, end: number, msg: ITextData, isException: boolean = false) => {
        this.debugVariableDecorations = this._editor.deltaDecorations(this.debugVariableDecorations, [
            {
                range: new monaco.Range(line+1, start+1, line+1, end+1),
                options: {
                    inlineClassName: 'debug-annotation'
                }
            }
        ]);
        if (isException) {
            this.gotDebugError = true;
        }
        if (this.debugContentWidget) {
            this._editor.removeContentWidget(this.debugContentWidget);
            this.debugContentWidget = null;
        }
        const msgText = translate(msg.text, this.global.language.code, msg.params);
        this._editor.addContentWidget(this.debugContentWidget = new DebugWidget(msgText, line+1, start+1, isException));
    }
    clearDebugDecorations = () => {
        this.debugLineHighlight = this._editor.deltaDecorations(this.debugLineHighlight, []);
        this.debugVariableDecorations = this._editor.deltaDecorations(this.debugVariableDecorations, []);
        if (this.debugContentWidget) {
            this._editor.removeContentWidget(this.debugContentWidget);
            this.debugContentWidget = null;
        }
    }
    debugStep = (allTheWay: boolean) => {
        if (this.gotDebugError) {
            return this.stopDebugging();
        }
        this.clearDebugDecorations();
        this.state.debugger && this.state.debugger.nextStep(allTheWay);
    }
    stopDebugging = (event?: any, callback?: () => any) => {
        this.gotDebugError = false;
        this._editor.updateOptions({readOnly:false});
        this.clearDebugDecorations();
        const {debugger: deb} = this.state;
        if (deb) {
            deb.dispose();
            this.setState({debugger:null}, callback);
        }
    }
    render() {
        return (<div className="code-editor">
            <Tabs
                activeKey={this.tabs[this.state.chosenTabIndex].name}
                className="ce-tabs"
                onChange={this.tabChanged} type="card"
                tabBarExtraContent={this.state.debugger ?(
                    <React.Fragment>
                        <Button onClick={this.stopDebugging} icon="stop" shape="circle"/>
                        <Button onClick={this.debugStep.bind(this, false)} icon="step-forward" shape="circle"/>
                        <Button onClick={this.debugStep.bind(this, true)} icon="fast-forward" shape="circle"/>
                    </React.Fragment>) : (
                        <React.Fragment>
                        <Button onClick={this.execute} icon="play-circle" shape="circle"/>
                        <Button onClick={this.debug} icon="bug" shape="circle"/>
                    </React.Fragment>
                    )}
            >
                {this.tabs.map(({name}) => <TabPane tab={name} key={name} />)}
            </Tabs>
            <div className="ce-editor" ref={this.setRef} />
        </div>)
    }
}

let nextWidgetId = 0;
class DebugWidget {
    message: string;
    line: number;
    column: number;
    isError: boolean;
    domNode: HTMLDivElement;
    id: string = 'debug.widget' + nextWidgetId++;
    constructor(message: string, line: number, column: number, isError: boolean) {
        Object.assign(this, {message, line, column, isError});
    }
    getDomNode = () => {
        if (!this.domNode) {
            const div = this.domNode = document.createElement('div');
            div.innerHTML = this.message;
            div.className = 'debug-widget' + (this.isError ? ' error' : '');
        }
        return this.domNode;
    }
    getId = () => this.id;
    getPosition = () => ({
        position: {
            lineNumber: this.line,
            column: this.column
        },
        preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE, monaco.editor.ContentWidgetPositionPreference.BELOW]
    })
}