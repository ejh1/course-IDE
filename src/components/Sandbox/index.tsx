import React, { useRef, useEffect, useGlobal } from 'reactn';
const sandboxUrl = require('@assets/sandbox.html');

import './styles.scss';

export default () => {
    const [executionData] = useGlobal('executionData');
    const iframeRef = useRef<HTMLIFrameElement>();
    useEffect(() => {
        const listener = (e: MessageEvent) => {
            if (e.data == 'sandbox-ready') {
                iframeRef.current.contentWindow.postMessage(executionData, '*');
            }
        }
        window.addEventListener('message', listener)

        if (iframeRef.current) {
            iframeRef.current.src = sandboxUrl;
        }
        // Cleanup function
        return () => window.removeEventListener('message', listener);
    }, [executionData]); // The effect function's closure is bound to data
    return (
        <div className="sandbox">
            <iframe ref={iframeRef} className="sandbox" sandbox="allow-scripts allow-popups allow-modals" />
        </div>
    );
}