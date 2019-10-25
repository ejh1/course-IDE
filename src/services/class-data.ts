import { addReducers, setGlobal } from 'reactn';
const CLASSES_BASE_PATH = 'https://firebasestorage.googleapis.com/v0/b/course-ide.appspot.com/o/';

export interface IFile {
    name: string;
    file: string;
}
export interface IFolder {
    folders: IFile[];
    files: IFile[];
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
    return response.text();
}
export const initializeGlobalState = () => {
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    setGlobal({
        'folders' : {},
        'files': {}
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
            if (!global.files[file.file]) {
                await dispatch.getFile(file);
            }
        },
        setFolders: (global, _dispatch, folders: {[key: string]: IFolder}) => ({folders: {...global.folders, ...folders}}),
        getFolder: async (_global, dispatch, folder: string, callback?: () => void) => {
            const json = await fetchFile(folder);
            dispatch.setFolders({[folder]: json ? JSON.parse(json) : {}});
            callback && callback();
        },
        setFiles: (global, _dispatch, files: {[key: string]: string}) => ({files: {...global.files, ...files}}),
        getFile: async (global, dispatch, {file}: IFile) => {
            const text = await fetchFile(file);
            dispatch.setFiles({[file]:text});
        },
    });
}