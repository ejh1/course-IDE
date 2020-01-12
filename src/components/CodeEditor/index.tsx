import React from 'reactn';
import debounce from 'lodash/debounce';
import { Tabs, Button, Switch, Icon, Typography } from 'antd';
const { Title } = Typography;
const { TabPane } = Tabs;
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { ITextData, JSInterpreter } from '@services/debugger';

import './styles.scss';
import { IConsoleItem, ISnippet, IDisplaySnippet, SnippetType } from '@services/class-data';
import { translate, TextCodes } from '@components/Trans';
import { SandboxComm, SandboxMsgType, IDebugNextData, IDebugMsgData } from '@services/SandboxComm';

interface IProps {
    loadedData : {[key: string]: string};
    snippetToDisplay: IDisplaySnippet;
    shareCode: boolean;
}
interface IState {
    chosenTabIndex: number;
    debugging: boolean;
}
export default class CodeEditor extends React.Component<IProps, IState> {
    state: IState = {
        chosenTabIndex: 0,
        debugging: false
    };
    anyBreakpoints: boolean = false;
    breakpointLines: Record<number, boolean> = {};
    breakpointDecorations: string[] = [];
    debugLineHighlight: string[] = [];
    debugVariableDecorations: string[] = [];
    editorContainer: HTMLDivElement;
    gotDebugError: boolean  = false;
    debugContentWidget: monaco.editor.IContentWidget;
    sandboxComm: SandboxComm;
    setRef = (element: HTMLDivElement) => {
        this.editorContainer = element;
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
        });
        this._editor.onDidChangeModelContent(debounce(this.onCodeChange));
        this._editor.onMouseDown(this.onEditorMouseDown);
        this._editor.setModel(this.tabs[this.state.chosenTabIndex].model);
    }
    componentWillUnmount = () => this._editor && this._editor.dispose();

    componentDidUpdate = ({loadedData: oldData, snippetToDisplay: oldSnippet, shareCode: oldShareCode}: IProps) => {
        const {loadedData: newData, snippetToDisplay: newSnippet, shareCode} = this.props;
        let dataToUse: Record<string, string>;
        if (newData && newData !== oldData) {
            dataToUse = newData;
        } else if (newSnippet && (!oldSnippet || newSnippet.id !== oldSnippet.id || newSnippet.timestamp !== oldSnippet.timestamp)) {
            dataToUse = newSnippet.code || {};
        }
        if (oldShareCode !== shareCode && shareCode) {
            this.dispatch.setSharedCode(this.getExecutionData());
        }
        if (dataToUse) {
            this.stopDebugging();
            this.tabs.forEach((tab, idx) => {
                (tab.model as monaco.editor.ITextModel).setValue(dataToUse[tab.lang] || '');
            });
            const firstTab = this.tabs.find(({lang}) => dataToUse[lang]);
            if (firstTab) {
                this.tabChanged(firstTab.name);
            }
        }
    }

    _editor: monaco.editor.IStandaloneCodeEditor = null;

    tabs: {name: string, lang: 'javascript' | 'html' | 'css', model?: monaco.editor.ITextModel, viewState?: any}[] = [
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
    onCodeChange = () => {
        if (this.global.shareCode) {
            this.dispatch.setSharedCode(this.getExecutionData());
        }
    }
    startSandbox = () => {
        this.setGlobal({sandboxCounter: Math.random()});
        if (this.sandboxComm) {
            this.sandboxComm.dispose();
        }
        this.sandboxComm = new SandboxComm(this.sandboxCallback, (document.querySelector('#sandbox-frame') as any).contentWindow);
    }
    sandboxCallback = (type: SandboxMsgType, data: any) => {
        switch (type) {
            case SandboxMsgType.CONSOLE:
                this.dispatch.consolePush(data as IConsoleItem);
                break;
            case SandboxMsgType.DEBUG_STEP: {
                const {line, offset} = data;
                this.debugStepCallback(line, offset);
                break;
            }
            case SandboxMsgType.DEBUG_ANNOTATION: {
                const {line, start, end, msg, isException} = data;
                this.debugAnnotationCallback(line, start, end, msg, isException);
                break;
            }
        }
        console.log(type, data);
    }
    getExecutionData = () => this.tabs.reduce((acc: {[key: string]: string}, {lang, model}) => {
        acc[lang] = model ? (model as monaco.editor.ITextModel).getValue() : '';
        return acc;
    }, {});
    execute = () => {
        this.startSandbox();
        const executionData: {} = this.getExecutionData();
        this.sandboxComm.send(SandboxMsgType.RUN, executionData);
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
            if (this.sandboxComm) {
                this.sandboxComm.send(SandboxMsgType.SET_BREAKPOINTS, breakpointLines);
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
        this.startSandbox();
        this.setState({debugging: true});
        const data: IDebugMsgData = this.getExecutionData() as unknown as IDebugMsgData;
        const {model} = this.tabs[0];
        data.tokens = JSInterpreter.tokenize(model.getLinesContent());
        data.breakpointLines = this.breakpointLines;
        
        this.sandboxComm.send(SandboxMsgType.DEBUG, data);
        this._editor.updateOptions({readOnly:true});
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
    debugAnnotationCallback = (line: number, start: number, end: number, msg: ITextData, isException: boolean) => {
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
        this.sandboxComm.send(SandboxMsgType.DEBUG_NEXT, allTheWay as IDebugNextData);
    }
    stopDebugging = () => {
        this.setState({debugging: false});
        this.gotDebugError = false;
        this._editor.updateOptions({readOnly:false});
        this.clearDebugDecorations();
        if (this.sandboxComm) {
            this.sandboxComm.send(SandboxMsgType.DEBUG_STOP);
            this.sandboxComm.dispose();
            this.sandboxComm = null;
        }
    }
    saveSnippet = () => {
        const {snippetToDisplay} = this.props;
        const code = this.getExecutionData();
        if (snippetToDisplay && snippetToDisplay.type === SnippetType.USER) {
            this.dispatch.saveSnippet({
                ...snippetToDisplay,
                code
            })
        } else {
            const name = snippetToDisplay ? `${snippetToDisplay.name} copy` :
                (window.prompt(translate(TextCodes.enterName, this.global.language.code), 'New Snippet') || '').trim();
            if (name) {
                this.dispatch.addSnippet(code, name);
            }
        }
    }
    newSnippet = () => {
        this.dispatch.setSnippetToDisplay(SnippetType.NONE);
    }
    changeSnippetName = () => {
        const {snippetToDisplay} = this.props;
        if (snippetToDisplay.type !== SnippetType.USER) { // Cant rename a session snippet
            return;
        }
        const newName = (window.prompt(translate(TextCodes.enterName, this.global.language.code), snippetToDisplay.name) || '').trim();
        if (newName && newName !== snippetToDisplay.name) {
            this.dispatch.saveSnippet({...snippetToDisplay, name: newName});
        }
    }
    renderSnippetBar() {
        const {snippetToDisplay} = this.props;
        return (
            <div className="snippet-bar">
                <span onClick={this.changeSnippetName} className="snippet-title">
                    <Title level={4} >{snippetToDisplay && snippetToDisplay.name}</Title>
                </span>
                {this.global.session &&
                    <Switch
                        onChange={() => this.dispatch.toggleCodeSharing()}
                        checkedChildren={<Icon type="eye" />}
                        unCheckedChildren={<Icon type="eye-invisible" />}
                        checked={this.props.shareCode}
                    />}
                <Button icon="save" shape="circle" onClick={this.saveSnippet} />
                {snippetToDisplay && <Button icon="file-add" shape="circle" onClick={this.newSnippet} />}
            </div>
        );
    }
    render() {
        return (<div className="code-editor">
            { this.global.user && this.renderSnippetBar() }
            <Tabs
                activeKey={this.tabs[this.state.chosenTabIndex].name}
                className="ce-tabs"
                onChange={this.tabChanged} type="card"
                tabBarExtraContent={this.state.debugging ?(
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
            div.textContent = this.message;
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