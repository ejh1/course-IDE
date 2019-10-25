import React, { useGlobal, useDispatch } from 'reactn';
import { IFile, isFolder } from 'src/services/class-data';
import { Tree } from 'antd';
import { AntTreeNode } from 'antd/lib/tree';

const { TreeNode, DirectoryTree } = Tree;

export const FolderView = () => {
    const [folders] = useGlobal('folders');
    const [rootFolder] = useGlobal('rootFolder');
    const selectFile = useDispatch('selectFile');
    const getFolder = useDispatch('getFolder');

    const loadFolder = (treeNode: AntTreeNode) => {
        const key = treeNode.props.eventKey;
        if (!folders[key]) {
            return new Promise(res => {
                getFolder(key, res);
            }) as PromiseLike<void>
        }
    }
    const onSelect = (names: string[]) => {
        const key = names[0];
        if (key && !isFolder(key)) {
            let entity = null;
            Object.values(folders).find(folder => entity = folder.files.find(({file}) => file === key));
            entity && selectFile(entity);
        }
    }
    const displayFolder = (key: string) => {
        const folder = folders[key];
        return folder &&
            ((folder.folders || [])).map(({file, name}) =>
                <TreeNode title={name} key={file} loadData={loadFolder}>{displayFolder(file)}</TreeNode>)
            .concat
                (((folder.files || [])).map(({file, name}) => <TreeNode title={name} key={file} isLeaf/>));
    }
    return <DirectoryTree
            loadData={loadFolder}
            onSelect={onSelect}
        >
            {displayFolder(rootFolder)}
        </DirectoryTree>
}