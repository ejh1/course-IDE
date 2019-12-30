import React, { useGlobal, useDispatch } from 'reactn';
import { isFolder, ROOT_FOLDER } from '@services/class-data';
import { Tree, Icon } from 'antd';
import { AntTreeNode } from 'antd/lib/tree';

const { TreeNode, DirectoryTree } = Tree;

export const FolderView = () => {
    const [userData] = useGlobal('userData');
    const [folders] = useGlobal('folders');
    const selectFile = useDispatch('selectFile');
    const getFolder = useDispatch('getFolder');
    const {isInstructor} = userData || {};

    const loadFolder = (treeNode: AntTreeNode) => {
        const key = treeNode.props.eventKey;
        if (!folders[key]) {
            return new Promise(res => {
                getFolder(key, res);
            }) as PromiseLike<void>
        }
    }
    const onSelect = (names: string[]) => {
        const _key = names[0];
        if (_key && !isFolder(_key)) {
            let entity = null;
            Object.values(folders).find(folder => entity = folder.children.find(({key}) => key === _key));
            entity && selectFile(entity);
        }
    }
    const displayFolder = (key: string) => {
        const folder = folders[key];
        return folder && folder.children.filter(({forInstructors}) => !forInstructors || isInstructor)
            .map(({key, name, forInstructors}) => {
            const props = {key, title: forInstructors ? <>{name} <Icon type="solution" /></> : name};
            return isFolder(key) ?
                <TreeNode {...props} loadData={loadFolder}>{displayFolder(key)}</TreeNode> :
                <TreeNode {...props} isLeaf/>;
        });
    }
    return <DirectoryTree
            loadData={loadFolder}
            onSelect={onSelect}
        >
            {displayFolder(ROOT_FOLDER)}
        </DirectoryTree>
}