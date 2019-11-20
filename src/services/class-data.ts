import { addReducers, setGlobal } from 'reactn';
import { object } from 'prop-types';
const CLASSES_BASE_PATH = 'https://firebasestorage.googleapis.com/v0/b/course-ide.appspot.com/o/';

export interface IFile {
    name: string;
    key: string;
}
export interface IFolder {
    children: IFile[];
}
export interface IConsoleItem {
    type: 'log'|'error'|'warn';
    msg: any;
    otherArgs?: any[];
}
export const isFolder = (key: string) => key.endsWith('.json');
let initialized = false;
const useLocal = false;
const fetchFile = async (file: string) => {
    if (useLocal) {
        if (useLocal) {
            // TODO - why does it have to be async
            return await new Promise(res => {
                setTimeout(() => res(localStorage[file]), 100);
            }) as string;
        }    
    }
    const response = await fetch(`${CLASSES_BASE_PATH}${file}?alt=media`);
    return response.ok ? response.text() : '';
}
export const initializeGlobalState = () => {
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    setGlobal({
        'folders' : {},
        'files': {},
        'console': []
    });    
    addReducers({
        setCode: (_global, _dispatch, code: string) => ({code, rootFolder: code + '.json'}),
        selectCode: async (_global, dispatch, code: string) => {
            dispatch.setCode(code);
            dispatch.getFolder(code+'.json');
        },

        setSelectedFile: (_global, _dispatch, selectedFile: IFile) => ({selectedFile}),
        selectFile: async (global, dispatch, file: IFile) => {
            dispatch.setSelectedFile(file);
            if (!global.files[file.key]) {
                await dispatch.getFile(file);
            }
        },
        setFolders: (global, _dispatch, folders: {[key: string]: IFolder}) => ({folders: {...global.folders, ...folders}}),
        getFolder: async (global, dispatch, folder: string, callback?: () => void) => {
            const json = await fetchFile(folder);
            json && dispatch.setFolders({[folder]: JSON.parse(json)});
            if (json && folder === global.rootFolder) {
                const data = JSON.parse(json);
                const first = data.children[0];
                if (first && !isFolder(first.key)) {
                    dispatch.selectFile(first);
                }
            }
            callback && callback();
        },
        setFiles: (global, _dispatch, files: {[key: string]: string}) => ({files: {...global.files, ...files}}),
        getFile: async (global, dispatch, {key}: IFile) => {
            const text = await fetchFile(key);
            dispatch.setFiles({[key]:text});
        },
        consolePush: (global, _dispatch, record: IConsoleItem) => ({console: [...global.console, record]}),
    });
}