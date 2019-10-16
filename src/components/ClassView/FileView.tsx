import React, {useGlobal} from 'reactn';

export const FileView = () => {
    const [fileName] = useGlobal('selectedFile');
    const [files] = useGlobal('files');

    const fileData = fileName && files && files[fileName] || '';
    return <div>{fileData}</div>;
}