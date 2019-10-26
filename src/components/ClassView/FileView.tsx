import React, {useGlobal} from 'reactn';
import { useRef, useEffect, useCallback } from 'react';
import { Typography } from 'antd';
const { Title } = Typography;
const frameStyleUrl = require('@assets/content.css');

export const FileView = () => {
    const [selectedFile] = useGlobal('selectedFile');
    const [files] = useGlobal('files');
    const [_loadedData, setLoadedData] = useGlobal('loadedData');
    const frameRef = useRef<HTMLIFrameElement>();
    useEffect(() => {
        const fileData = selectedFile && files && files[selectedFile.key] || '';
        const {body} = frameRef.current.contentDocument;
        body.innerHTML = fileData;
        body.querySelectorAll('.code-block').forEach(block => {
            const div = document.createElement('div');
            div.className = 'code-block-load';
            block.firstChild && block.insertBefore(div, block.firstChild);
            const data = JSON.parse(decodeURIComponent(block.getAttribute('data-value')));
            div.innerHTML = '<button>טען</button>';
            (div.firstChild as HTMLButtonElement).onclick = () => setLoadedData(data);
        })
    }, [selectedFile, files])
    const prepIframe = useCallback((node: HTMLIFrameElement) => {
        frameRef.current = node;
        const document = node.contentDocument;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = frameStyleUrl;
        document.head.appendChild(link);
    }, [])
    return <div className="file-view">
        <Title level={4} className="file-title">{selectedFile && selectedFile.name}</Title>
        <iframe className="file-frame" ref={prepIframe} />
    </div>;
}