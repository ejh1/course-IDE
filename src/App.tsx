import React, { useGlobal, useDispatch, useState } from 'reactn';
import { Select, Button, Input } from 'antd';
const { Option } = Select;
import { Splitter } from '@components/Splitter';
import { useEffect, FC } from 'react';
import { Typography } from 'antd';
const { Title } = Typography;
import { languages, logout, login } from '@services/class-data';
import 'antd/dist/antd.css';
import './App.scss';
import { Trans, TextCodes, translate } from '@components/Trans';
import { FolderView } from '@components/FolderView';
import { FileView } from '@components/FileView';
import CodeEditor from '@components/CodeEditor';
import Sandbox from '@components/Sandbox';
import { Session } from '@components/Session';

enum SideContent {
    Directory = 'directory',
    Session = 'classes',
}
const SideComponents: Record<SideContent, FC> = {
    [SideContent.Directory]: FolderView,
    [SideContent.Session]: Session
};
const sideIcons: Record<SideContent, string> = {
    [SideContent.Directory] : 'folder-open',
    [SideContent.Session] : 'solution'
};
export const App = () => {
    const [language, setLanguage] = useGlobal('language');
    const [user] = useGlobal('user');
    const [session] = useGlobal('session');
    const [studentSession] = useGlobal('studentSession');
    const [loadedData] = useGlobal('loadedData');
    const dispatch = useDispatch();
    const [typedCode, setTypedCode] = useState('');
    const [sideContent, setSideContent] = useState<SideContent>(SideContent.Directory)
    const sideContentList = [SideContent.Directory];
    if (user) {
        sideContentList.push(SideContent.Session);
    }
    useEffect(() => {dispatch.checkLogin()}, []);
    useEffect(() => {dispatch.getFolder('root.json')}, [language]);
    const languageChanged = (code: string) => setLanguage(languages.find(({code:c}) => c === code) || languages[0]);
    const sideContentClick = (type: SideContent) => setSideContent(type === sideContent ? undefined : type);
    const codeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setTypedCode(e.target.value);
    return (
        <div className="app">
            <header>
                <img src="https://www.mtova.org.il/images/logo.png" />
                <Title type="secondary" level={4} className="app-title"><Trans text={TextCodes.appTitle} /></Title>
                { !session && 
                    <span style={{marginLeft: '20px'}}>{ studentSession ?
                    <Button icon="close" onClick={() => dispatch.leaveSession()}>{studentSession.code}</Button> :
                    <>
                        <Button
                            disabled={!/^[a-zA-Z0-9]{5}$/.test(typedCode)}
                            onClick={()=>dispatch.joinSession(typedCode.toUpperCase())}
                        >
                            <Trans text={TextCodes.join} />
                        </Button>
                        <Input
                            style={{width:'90px'}}
                            placeholder={translate(TextCodes.code, language.code)}
                            onChange={codeInputChange}
                            value={typedCode}
                        />
                    </>
                    }</span>
                }
                { user && <span className="email">{user.email}</span>}
                {
                    user ? <Button onClick={logout}><Trans text={TextCodes.logout} /></Button> :
                    <Button onClick={login}><Trans text={TextCodes.login} /></Button>
                }
                <Select value={language.code} onChange={languageChanged} className="lang-select">
                    {languages.map(({code, title}) => <Option value={code} key={code}>{title}</Option>)}
                </Select>
            </header>
            <div className="app-body">
                <div className="side-bar">
                    {sideContentList.map((type) => <Button
                        shape="circle"
                        icon={sideIcons[type]}
                        onClick={() => sideContentClick(type)} 
                        type={type === sideContent ? 'primary' : 'link'}
                    />)}
                </div>
                <Splitter initialWidths={[20,80]} childrenFilter={[!!sideContent,true]}>
                    <div>
                        {sideContentList.map((type) => {
                            const Component = SideComponents[type];
                            return <div key={type} style={{display: type === sideContent ? '' : 'none'}}><Component/></div>
                        })}
                    </div>
                    <Splitter>
                        <FileView/>
                        <CodeEditor loadedData={loadedData}/>
                        <Sandbox/>
                    </Splitter>
                </Splitter>
            </div>
        </div>
    );
}
