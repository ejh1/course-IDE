import React, { useRef, useState } from 'react';

import './styles.scss';

export const Splitter = ({initialWidths, children}: any) => {
    initialWidths = initialWidths || {};
    const childrenRefs = useRef([]);
    const setRef = (idx: number, elem: HTMLDivElement) => childrenRefs.current[idx] = elem;
    const [widths, setWidths] = useState<number[]>([]);
    const defaultWidth = 100/children.length;

    const dragContextRef = useRef({});
    const onDragStart = (idx: number, {pageX}: React.MouseEvent<HTMLDivElement>) => {
        const refs = childrenRefs.current;
        const template = document.createElement('template');
        template.innerHTML = '<div id="drag-cover" style="position:fixed;top:0px;left:0px;width:100vw;height:100vh;z-index:1000;cursor:ew-resize;"></div>';
        document.body.appendChild(template.content.firstChild);

        dragContextRef.current = {
            idx,
            startX: pageX,
            leftWidth: refs[idx-1].getBoundingClientRect().width,
            rightWidth: refs[idx].getBoundingClientRect().width
        };
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
    }
    const getWidths = (x: number) => {
        const {startX, leftWidth, rightWidth} = dragContextRef.current as any;
        const MIN_ITEM_WIDTH = 5;
        const deltaX = Math.min(rightWidth - MIN_ITEM_WIDTH, Math.max(x - startX, MIN_ITEM_WIDTH - leftWidth));
        return [leftWidth + deltaX, rightWidth - deltaX];
    }
    const onDragMove = ({pageX}: MouseEvent) => {
        const {idx} = dragContextRef.current as any;
        const [leftWidth, rightWidth] = getWidths(pageX)
        const refs = childrenRefs.current;
        refs[idx-1].style.width = leftWidth + 'px';
        refs[idx].style.width = rightWidth + 'px';
    }
    const onDragEnd = ({pageX}: MouseEvent) => {
        const dragCover = document.getElementById('drag-cover');
        dragCover && document.body.removeChild(dragCover);
        document.removeEventListener('mousemove', onDragMove);
        document.removeEventListener('mouseup', onDragEnd);
        const [leftWidth, rightWidth] = getWidths(pageX);
        const {idx} = dragContextRef.current as any;
        const refs = childrenRefs.current;
        const fullWidth = refs[idx].parentNode.getBoundingClientRect().width;
        const newWidths = [...widths];
        newWidths[idx-1] = leftWidth / fullWidth * 100;
        newWidths[idx] = rightWidth / fullWidth * 100;
        setWidths(newWidths);
    }
    return <div className="splitter">
        {children.map((child: any, idx: number) => (
            <div className="splitter-item" key={idx} ref={setRef.bind(null, idx)} style={{width:(widths[idx] || initialWidths[idx] || defaultWidth) + '%'}}>
                <div className="splitter-item-inner">{child}</div>
                <div className="splitter-divider" onMouseDown={onDragStart.bind(null, idx)} />
            </div>
        ))}
    </div>
}