import React, { useRef, useGlobal, useDispatch } from 'reactn';
import { Button } from 'antd';
import { CodeControl } from '@components/CodeControl';

import 'antd/dist/antd.css';
import './App.scss';
import { Splitter } from '@components/Splitter';
import { ClassView } from '@components/ClassView';
import { useEffect } from 'react';
import { Typography } from 'antd';
const { Title } = Typography;

export const App = () => {
    const [classCode] = useGlobal('code');
    const loadClass = useDispatch('selectCode');
    useEffect(() => {loadClass('root')}, []);
    return (
        <div className="app">
            <header>
                <img src="https://www.mtova.org.il/images/logo.png" />
                <Title type="secondary" level={4} className="app-title">קורס פיתוח אפליקציות ב- Javascript</Title>
            </header>
            <div className="app-body">
                { classCode ? <Splitter><ClassView/><CodeControl/></Splitter> : <CodeControl/> }
            </div>
        </div>
    );
}
