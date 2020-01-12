import 'reactn';
import { IFile, IFolder, IConsoleItem, ILanguage, IUserData, ISession, ISessionStudentData, ISnippet, IDisplaySnippet, SnippetType } from '@services/class-data';
import { firestore } from 'firebase';

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
        setSnippets: Reducer< State['snippets'], Pick<State, 'snippets'> >;
        setSnippetToDisplay: (global: State, dispatch: Dispatch, type: SnippetType, id?: string) => Pick<State, 'snippetToDisplay'>;
        addSnippet: (global: State, dispatch: Dispatch, code: ISnippet['code'], name: string) => void;
        saveSnippet: Reducer< ISnippet, void>;
        removeSnippet: Reducer< ISnippet, void>;
        setSesion: Reducer< State['session'], Pick<State, 'session'> >;
        toggleSessionFile: Reducer< IFile, void >;
        toggleSessionSnippet: Reducer< ISnippet, void>;
        listenToSessions: Reducer<string, void>;
        listenToSession: Reducer< string, void >;
        _processSessionStudentUpdate: Reducer< firestore.DocumentChange[], void>;
        setSessionStudents: Reducer< State['sessionStudents'], Pick<State, 'sessionStudents'| 'sessionStudentsCount' > >;
        startSession: Reducer<void, void>;
        endSession: Reducer<string, void>;
        toggleCodeSharing: Reducer<void, Pick<State, 'shareCode'>>;
        setSharedCode: Reducer<ISnippet['code'], void>;
        joinSession: (global: State, dispatch: Dispatch, code: string, name: string) => void;
        leaveSession: Reducer<void, void>;
        setPendingStudentSession: Reducer< State['pendingStudentSession'], Pick<State, 'pendingStudentSession'> >;
        setStudentSession: Reducer< State['studentSession'], Pick<State, 'studentSession'> >;
        joinSessionAfterLogin: Reducer<State['user'], void>;
        setStudentSessionDatum: (global: State, dispatch: Dispatch, type: keyof ISessionStudentData, data: any) => void;
        setStudentSessionData: Reducer< State['sessionStudentData'], Pick<State, 'sessionStudentData'> >;
    }
    export interface State {
        'user': firebase.User; 
        'userData': IUserData;
        'session': ISession;
        'shareCode': boolean;
        'sessions': Record<string, number>;
        'snippetToDisplay': IDisplaySnippet;
        'snippets': ISnippet[];
        'sessionStudents': Record<string, ISessionStudentData>;
        'sessionStudentsCount': number;
        'pendingStudentSession': {code: string, name: string};
        'studentSession': ISession;
        'sessionStudentData': ISessionStudentData;
        'sandboxCounter': number;
        'selectedFile': IFile;
        'folders': {[key: string]: IFolder};
        'files': Record<string, string>;
        'loadedData': Record<string, string>;
        'console': IConsoleItem[];
        'language': ILanguage;
    }
}