import React from 'reactn';
import ReactDOM from 'react-dom';

import { App } from './App';
import { initializeGlobalState } from '@services/class-data';

initializeGlobalState();
ReactDOM.render(<App/>, document.getElementById('root'));