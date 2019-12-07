import React, { useGlobal, useDispatch } from 'reactn';
import { Select } from 'antd';
const { Option } = Select;
import { CodeControl } from '@components/CodeControl';
import { Splitter } from '@components/Splitter';
import { ClassView } from '@components/ClassView';
import { useEffect } from 'react';
import { Typography } from 'antd';
const { Title } = Typography;
import { languages } from '@services/class-data';
import 'antd/dist/antd.css';
import './App.scss';
import { Trans, TextCodes } from '@components/Trans';

export const App = () => {
    const [language, setLanguage] = useGlobal('language');
    const getFolder = useDispatch('getFolder');
    useEffect(() => {getFolder('root.json')}, [language]);
    const languageChanged = (code: string) => setLanguage(languages.find(({code:c}) => c === code) || languages[0]);
    return (
        <div className="app">
            <header>
                <img src="https://www.mtova.org.il/images/logo.png" />
                <Title type="secondary" level={4} className="app-title"><Trans text={TextCodes.appTitle} /></Title>
                <Select value={language.code} onChange={languageChanged} className="lang-select">
                    {languages.map(({code, title}) => <Option value={code} key={code}>{title}</Option>)}
                </Select>
            </header>
            <div className="app-body">
                <Splitter><ClassView/><CodeControl/></Splitter>
            </div>
        </div>
    );
}
