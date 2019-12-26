import React, { useEffect, useGlobal } from 'reactn';
import Console from '@components/Console';

import './styles.scss';

export default () => {
    const [sandboxCounter] = useGlobal('sandboxCounter');
    const [, setConsole] = useGlobal('console');
    useEffect(() => {
        setConsole([]);
        (document.querySelector('#sandbox-frame') as any).src = location.href.replace('index.html','') + 'sandbox.html';
    }, [sandboxCounter]);
    return (
        <div className="sandbox">
            <iframe id="sandbox-frame" className="sandbox-frame" sandbox="allow-scripts allow-popups allow-modals" />
            <Console />
        </div>
    );
}