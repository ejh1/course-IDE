import React, { useRef, useEffect } from 'react';
const sandboxUrl = require('@assets/sandbox.html');

import './styles.scss';

export const Sandbox = ({data, getData}: any) => {
    const iframeRef = useRef<HTMLIFrameElement>();
    useEffect(() => {
        const listener = (e: MessageEvent) => {
            if (e.data == 'sandbox-ready') {
                iframeRef.current.contentWindow.postMessage(data, '*');
            }
        }
        window.addEventListener('message', listener)
        // Cleanup function
        return () => window.removeEventListener('message', listener);
    });
    useEffect(() => {
        if (iframeRef.current) {
            iframeRef.current.src = sandboxUrl;
        }
        console.log(data);
    }, [data])
    return (
        <div className="sandbox">
            <iframe ref={iframeRef} className="sandbox" sandbox="allow-scripts allow-popups allow-modals" />
            <button onClick={getData}>Run</button>
        </div>
    );
}