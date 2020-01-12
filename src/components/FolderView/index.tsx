import React, { useGlobal, useDispatch } from 'reactn';
import { isFolder, ROOT_FOLDER, IFile } from '@services/class-data';
import { Tree, Icon } from 'antd';
import { AntTreeNode } from 'antd/lib/tree';
import { Snippets } from '@components/Snippets';
import './styles.scss';
const { TreeNode, DirectoryTree } = Tree;

export const FolderView = () => {
    const [userData] = useGlobal('userData');
    const [user] = useGlobal('user');
    const [studentSession] = useGlobal('studentSession');
    const [folders] = useGlobal('folders');
    const selectFile = useDispatch('selectFile');
    const getFolder = useDispatch('getFolder');
    const toggleSessionFile = useDispatch('toggleSessionFile');
    const {isInstructor} = userData || {};
    const [session] = useGlobal('session');
    const sessionFiles = session ? session.folder.children.reduce((acc: Record<string, boolean>, {key}) => {
        acc[key] = true;
        return acc;
    }, {}) : {};

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
    const toggleFile = (file: IFile, e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSessionFile(file);
    }
    const displayFolder = (key: string, parentVisible: boolean = false) => {
        const folder = folders[key];
        return folder && folder.children.filter(({forInstructors}) => !forInstructors || isInstructor)
            .map((file) => {
                const {key, name, forInstructors} = file;
                const props = {key, title: forInstructors ? <>{name} <Icon type="solution" /></> : name};
                const visible = !!sessionFiles[key];
                // Show selection icon if not selected by parent, or if explicitly selected
                if (session && (!parentVisible || visible)) {
                    props.title = <>
                        {props.title}
                        <Icon
                            style={{margin: '0 5px'}}
                            type={visible ? 'eye' : 'eye-invisible'}
                            onClick={toggleFile.bind(null, file)}
                        />
                    </>
                }
                return isFolder(key) ?
                    <TreeNode {...props} loadData={loadFolder}>{displayFolder(key, visible)}</TreeNode> :
                    <TreeNode {...props} isLeaf/>;
            });
    }
    const showSnippets = !!(user && !user.isAnonymous || studentSession);
    return (
        <div className={showSnippets ? 'with-snippets' : ''}>
        <DirectoryTree
            className="folder-tree"
            loadData={loadFolder}
            onSelect={onSelect}
        >
            {displayFolder(ROOT_FOLDER)}
        </DirectoryTree>
        {showSnippets && <Snippets />}
        </div>
    );
}