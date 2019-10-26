import React, { useState, useGlobal } from 'reactn';
import {Collapse, Tag, Icon} from 'antd';
import countBy from 'lodash/countBy';
const { Panel } = Collapse;

import './styles.scss';

const typeToStyle: {[key: string]: string} = {
    'log': 'info-circle',
    'warn': 'warning',
    'error': 'close-circle',
}
export default () => {
    const [items, setConsole] = useGlobal('console');
    const typesCount = countBy(items, ({type}) => type);
    const [open, setOpen] = useState(false);
    const clear = (e: any) => {e.stopPropagation(); setConsole([])};
    const getHeader = () => <span>
        console&nbsp;
        {Object.keys(typesCount).map(key => !!typesCount[key] && <Tag key={key} className={`console-tag ${key}`}><Icon type={typeToStyle[key]}/>{typesCount[key]}</Tag>)}
    </span>;
    const onChange = () => setOpen(!open);
    return !!items.length && <Collapse
        className="console-collapse"
        activeKey={open ? ['console'] : []}
        onChange={onChange}
    >
        <Panel
            key="console"
            header={getHeader()}
            extra={<Icon type="stop" onClick={clear}/>}
        >
            <div className="console-body">
                {/* msg + '' handles better cases that toString doesn't like null|undefined|0|false */}
                {items.map(({type, msg, otherArgs}, idx) => <div key={idx} className={`console-item ${type}`}>{otherArgs ? [msg, ...otherArgs].map(m => m+'').join(' ') : msg+''}</div>)}
            </div>
        </Panel>
    </Collapse>
}