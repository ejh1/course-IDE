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
            div.className = 'code-block-header';
            block.firstChild && block.insertBefore(div, block.firstChild);
            const contents = block.querySelectorAll('div[data-language]');
            const data = JSON.parse(decodeURIComponent(block.getAttribute('data-value')));
            const langs = Object.keys(data);
            let html = '<button>טען</button>';
            const useTabs = langs.length > 1;
            if (useTabs) {
                html = `<div class="tabs">${
                    langs.map((lang, idx) => `<div class="tab" name="${idx}">${lang}</div>`).join('')
                }</div>${html}`;
            }
            div.innerHTML = html;
            if (useTabs) {
                const selectTab = (e: any) => {
                    const target = e.target;
                    const idx = +target.getAttribute('name');
                    tabs.forEach(tab => tab.classList.remove('selected'));
                    contents.forEach(content => (content as any).style.display = 'none');
                    tabs[idx].classList.add('selected');
                    (contents[idx] as any).style.display = '';
                }
                const tabs = div.querySelector('div.tabs').querySelectorAll('.tab');
                tabs.forEach((tab: HTMLDivElement) => tab.onclick = selectTab);
                (tabs[0] as any).click();
            }
            (div.querySelector('button') as HTMLButtonElement).onclick = () => setLoadedData(data);
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