import React, { useState, useRef } from 'react';
import { Splitter } from '@components/Splitter';
import CodeEditor from '@components/CodeEditor';
import { Sandbox } from '@components/Sandbox';

export const CodeControl = (props: any) => {
    const editorRef = useRef<CodeEditor>();
    const [executionData, setExecData] = useState();

    const getExecutionData = () => {
        const {current} = editorRef;
        if (current) {
            const data = current.getData();
            setExecData(data);
        }
        editorRef.current && setExecData(editorRef.current.getData())
    };

    return <Splitter>
        <CodeEditor ref={editorRef} />
        <Sandbox data={executionData} getData={getExecutionData}/>
    </Splitter>;
}