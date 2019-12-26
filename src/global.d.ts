import 'reactn';
import { IFile, IFolder, IConsoleItem, ILanguage, IUserData } from '@services/class-data';

declare module 'reactn/default' {
    interface Reducer<T, O> {
        (global: State, dispatch: Dispatch, value: T): O;
    }
    export interface Reducers {
        checkLogin: Reducer<void, void>;
        login: Reducer<undefined, void>;
        logout: Reducer<undefined, void>;
        setSelectedFile: Reducer< State['selectedFile'], void >;
        selectFile: Reducer< IFile, void>;
        setFolders: Reducer< State['folders'], Pick<State, 'folders'> >;
        getFolder: (global: State, dispatch: Dispatch, folder: string, callback?: () => void) => void;
        setFiles: Reducer< State['files'], Pick<State, 'files'> >;
        getFile: Reducer< IFile, void>;
        consolePush: Reducer< IConsoleItem, Pick<State, 'console'> >;
        setUser: Reducer< State['user'], Promise<Pick<State, 'user'> > >;
        setUserData: Reducer< State['userData'], Pick<State, 'userData'> >;
    }
    export interface State {
        'user': firebase.User;
        'userData': IUserData;
        'sessionData': object;
        'sandboxCounter': number;
        'selectedFile': IFile;
        'folders': {[key: string]: IFolder};
        'files': {[key: string]: string};
        'loadedData': {[key: string]: string};
        'console': IConsoleItem[];
        'language': ILanguage;
    }
}