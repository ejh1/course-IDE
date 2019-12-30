import 'reactn';
import { IFile, IFolder, IConsoleItem, ILanguage, IUserData, ISession, IStudentSession, ISessionStudentData } from '@services/class-data';

declare module 'reactn/default' {
    interface Reducer<T, O> {
        (global: State, dispatch: Dispatch, value: T): O;
    }
    export interface Reducers {
        checkLogin: Reducer<void, void>;
        login: Reducer<void, void>;
        logout: Reducer<void, void>;
        setSelectedFile: Reducer< State['selectedFile'], void >;
        selectFile: Reducer< IFile, void>;
        setFolders: Reducer< State['folders'], Pick<State, 'folders'> >;
        getFolder: (global: State, dispatch: Dispatch, folder: string, callback?: () => void) => void;
        setFiles: Reducer< State['files'], Pick<State, 'files'> >;
        getFile: Reducer< IFile, void>;
        consolePush: Reducer< IConsoleItem, Pick<State, 'console'> >;
        setUser: Reducer< State['user'], Promise<Pick<State, 'user'> > >;
        setUserData: Reducer< State['userData'], Pick<State, 'userData'> >;
        setSessions: Reducer< State['sessions'], Pick<State, 'sessions'> >;
        setSesion: Reducer< State['session'], Pick<State, 'session'> >;
        listenToSessions: Reducer<string, void>;
        listenToSession: Reducer< string, void >;
        setSessionStudents: Reducer< State['sessionStudents'], Pick<State, 'sessionStudents'> >;
        startSession: Reducer<void, void>;
        endSession: Reducer<string, void>;
        joinSession: Reducer<string, void>;
        leaveSession: Reducer<void, void>;
        setStudentSession: Reducer< State['studentSession'], Pick<State, 'studentSession'> >;
        joinSessionAfterLogin: Reducer<void, void>;
        setStudentSessionDatum: (global: State, dispatch: Dispatch, type: keyof ISessionStudentData, data: any) => void;
        setStudentSessionData: Reducer< State['sessionStudentData'], Pick<State, 'sessionStudentData'> >;
    }
    export interface State {
        'user': firebase.User; 
        'userData': IUserData;
        'session': ISession;
        'sessions': Record<string, number>;
        'sessionStudents': Record<string, ISessionStudentData>;
        'studentSession': IStudentSession;
        'sessionStudentData': ISessionStudentData;
        'sandboxCounter': number;
        'selectedFile': IFile;
        'folders': {[key: string]: IFolder};
        'files': {[key: string]: string};
        'loadedData': {[key: string]: string};
        'console': IConsoleItem[];
        'language': ILanguage;
    }
}