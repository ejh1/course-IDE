import React, { useRef, useGlobal, useDispatch } from 'reactn';
import { Button } from 'antd';
import { CodeControl } from '@components/CodeControl';

import 'antd/dist/antd.css';
import './App.scss';
import { Splitter } from '@components/Splitter';
import { ClassView } from '@components/ClassView';

export const App = () => {
    const [classCode] = useGlobal('code');
    const loadClass = useDispatch('selectCode');
    const codeClick = () => loadClass((classInputRef.current as HTMLInputElement).value);
    const classInputRef = useRef();
    return (
        <div className="app">
            <header>
                <img src="https://www.mtova.org.il/images/logo.png" />
                <span className="class-code">
                    קוד שיעור:
                    {classCode ? <span className="got-class" >{classCode}</span> :
                        <span>
                            <input defaultValue="root" ref={classInputRef} />
                            <Button onClick={codeClick}>טען</Button>
                        </span>
                    }
                </span>
            </header>
            <div className="app-body">
                { classCode ? <Splitter><ClassView/><CodeControl/></Splitter> : <CodeControl/> }
            </div>
        </div>
    );
}
