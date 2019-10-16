import React, { useGlobal, useDispatch } from 'reactn';
import { Splitter } from '@components/Splitter';
import { FolderView } from './FolderView';
import { FileView } from './FileView';

export const ClassView = () => {
    const [classData] = useGlobal('classData');
    const {files} = classData || {files: []};
    const selectFile = useDispatch('selectFile');
    return <Splitter initialWidths={[25,75]}>
        <FolderView files={files} onFileSelect={selectFile}/>
        <FileView />
    </Splitter>
}