import React from 'reactn';
import { Tabs, Button } from 'antd';
const { TabPane } = Tabs;
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

import './styles.scss';

interface IProps {
    value?: string;
    options?: monaco.editor.IEditorOptions;
    loadedData?: {[key: string]: string}
}
export default class CodeEditor extends React.Component<IProps> {
    state = {
        chosenTabIndex : 0
    }
    setRef = (element: HTMLDivElement) => {
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
        this._editor = monaco.editor.create(element, {
            minimap:{enabled:false},
            automaticLayout: true,
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 5,
            ...options
        });
        this._editor.setModel(this.tabs[this.state.chosenTabIndex].model);
    }
    componentWillUnmount = () => this._editor && this._editor.dispose();

    componentDidUpdate = ({loadedData: oldData}: IProps) => {
        const {loadedData: newData} = this.props;
        if (newData && newData !== oldData) {
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

    tabs: any[] = [
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
    render() {
        return (<div className="code-editor">
            <Tabs
                activeKey={this.tabs[this.state.chosenTabIndex].name}
                className="ce-tabs"
                onChange={this.tabChanged} type="card"
                tabBarExtraContent={<Button onClick={this.execute} icon="play-square" shape="circle"/>}
            >
                {this.tabs.map(({name}) => <TabPane tab={name} key={name} />)}
            </Tabs>
            <div className="ce-editor" ref={this.setRef} />
        </div>)
    }
}