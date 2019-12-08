import 'reactn';
import { IFile, IFolder, IConsoleItem, ILanguage } from '@services/class-data';

declare module 'reactn/default' {
    interface Reducer<T, O> {
        (global: State, dispatch: Dispatch, value: T): O;
    }
    export interface Reducers {
        setSelectedFile: Reducer< State['selectedFile'], void >;
        selectFile: Reducer< IFile, void>;
        setFolders: Reducer< State['folders'], Pick<State, 'folders'> >;
        getFolder: (global: State, dispatch: Dispatch, folder: string, callback?: () => void) => void;
        setFiles: Reducer< State['files'], Pick<State, 'files'> >;
        getFile: Reducer< IFile, void>;
        consolePush: Reducer< IConsoleItem, Pick<State, 'console'> >;
    }
    export interface State {
        'classData': any;
        'selectedFile': IFile;
        'folders': {[key: string]: IFolder};
        'files': {[key: string]: string};
        'loadedData': {[key: string]: string};
        'executionData': object;
        'console': IConsoleItem[];
        'language': ILanguage;
    }
}