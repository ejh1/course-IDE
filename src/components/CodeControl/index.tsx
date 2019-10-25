import React, { useGlobal } from 'reactn';
import { Splitter } from '@components/Splitter';
import CodeEditor from '@components/CodeEditor';
import Sandbox from '@components/Sandbox';

export const CodeControl = (props: any) => {
    const [loadedData] = useGlobal('loadedData');

    return <Splitter>
        <CodeEditor loadedData={loadedData}/>
        <Sandbox/>
    </Splitter>;
}