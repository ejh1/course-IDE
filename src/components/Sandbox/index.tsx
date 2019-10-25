import React, { useRef, useEffect, useGlobal, useDispatch } from 'reactn';
const sandboxUrl = require('@assets/sandbox.html');
import Console from '@components/Console';

import './styles.scss';

export default () => {
    const [executionData] = useGlobal('executionData');
    const [consoleItems, setConsole] = useGlobal('console');
    const consolePush = useDispatch('consolePush');
    const iframeRef = useRef<HTMLIFrameElement>();
    useEffect(() => {
        const listener = (e: MessageEvent) => {
            if (e.data == 'sandbox-ready') {
                iframeRef.current.contentWindow.postMessage(executionData, '*');
            }
            else if (consoleItems.length < 100 && e.data && e.data.hasOwnProperty('otherArgs')) {
                consolePush(e.data);
            }
        }
        window.addEventListener('message', listener)

        if (iframeRef.current) {
            iframeRef.current.src = sandboxUrl;
            setConsole([]);
        }
        // Cleanup function
        return () => window.removeEventListener('message', listener);
    }, [executionData]); // The effect function's closure is bound to data
    return (
        <div className="sandbox">
            <iframe ref={iframeRef} className="sandbox-frame" sandbox="allow-scripts allow-popups allow-modals" />
            <Console />
        </div>
    );
}