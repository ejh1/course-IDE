import React from 'reactn';
import ReactDOM from 'react-dom';
import { SandboxFrame } from '@services/SandboxFrame';
import { App } from './App';
import { initializeGlobalState } from '@services/class-data';

if ((window as any).isSandbox) {
    new SandboxFrame();
} else {
    initializeGlobalState();
    ReactDOM.render(<App/>, document.getElementById('root'));
}