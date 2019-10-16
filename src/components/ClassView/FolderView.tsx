import React from 'react';
import { IFile } from 'src/services/class-data';

interface IProps {
    files: IFile[];
    onFileSelect(file: IFile): void;
}
export const FolderView = ({files, onFileSelect}: IProps) => {
    return <ul>
        {files.map(file => <li key={file.file} onClick={onFileSelect.bind(null, file)}>{file.name}</li>)}
    </ul>
}