import { addReducers, setGlobal } from 'reactn';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDvSrdLS9tjp7_SINpB4YWDnYaJXT7Gr20",
    authDomain: "course-ide.firebaseapp.com",
    databaseURL: "https://course-ide.firebaseio.com",
    projectId: "course-ide",
    storageBucket: "course-ide.appspot.com",
    messagingSenderId: "2469232450",
    appId: "1:2469232450:web:66c0b72981410df02bd2db"
  };
const app = firebase.initializeApp(firebaseConfig);
const CLASSES_BASE_PATH = 'https://firebasestorage.googleapis.com/v0/b/course-ide.appspot.com/o/';

export interface ISession {
    code: string;
}
export interface IStudentSession {
    code: string;
    loaded?: boolean;
}
export interface ISessionStudentData {
    uid: string;
    name: string;
    code: Record<string, string>;
}
export interface IFile {
    name: string;
    key: string;
    forInstructors: boolean;
}
export interface IFolder {
    children: IFile[];
}
export interface ILanguage {
    code: string;
    title: string;
    pathPrefix: string;
}
export const ROOT_FOLDER = 'root.json';
export const languages: ILanguage[] = [
    {
        code : 'he',
        title : 'עב',
        pathPrefix : ''
    },
    {
        code : 'ar',
        title : 'عر',
        pathPrefix : 'ar/'
    }
];
const defaultLanguage = languages[0];
export interface IConsoleItem {
    type: keyof Console;
    msg: any;
    otherArgs?: any[];
}
export interface IUserData {
    isInstructor: boolean;
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
    const response = await fetch(`${CLASSES_BASE_PATH}${encodeURIComponent(file)}?alt=media`);
    return response.ok ? response.text() : '';
}
export const login = () => app.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
export const logout = () => firebase.auth().signOut();
export const initializeGlobalState = () => {
    const unsubscriptions: Record<string, Array<() => void>> = {};
    const unsubscribe = (code: string) => {
        const unsubs = unsubscriptions[code];
        if (unsubs) {
            delete unsubscriptions[code];
            unsubs.forEach(unsub => unsub());
        }
    }
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    const UsersCollection = firebase.firestore().collection('users');
    const SessionsCollection = firebase.firestore().collection('sessions');
    const SessionStudentCollection = firebase.firestore().collection('session-student');
    
    setGlobal({
        folders : {},
        files: {},
        console: [],
        sessions: {},
        language: defaultLanguage
    });
    addReducers({
        checkLogin: (global, dispatch) => {
            firebase.auth().onAuthStateChanged(dispatch.setUser);
        },
        setUser: async (global, dispatch, user: firebase.User) => {
            if (user) {
                if (!user.isAnonymous) {
                    dispatch.listenToSessions(user.uid);
                    const instructor = await firebase.firestore().collection('instructors').doc(user.uid).get();
                    dispatch.setUserData({isInstructor: !!instructor.data()});
                }
                const {studentSession} = global;
                if (studentSession && !studentSession.loaded) {

                }
            } else {
                dispatch.setUserData(null);
            }
            return {user};
        },
        listenToSessions: (global, dispatch, uid: string) => {
            UsersCollection.doc(uid).onSnapshot((doc) => {
                const data = doc.data() || {};
                const {sessions = {}} = data;
                dispatch.setSessions(sessions);
                const {session} = global;
                const sessionCode = Object.keys(sessions)[0];
                const existingCode = (session || {}).code;
                if (sessionCode !== existingCode) {
                    unsubscribe(existingCode);
                    if (sessionCode) {
                        dispatch.listenToSession(sessionCode);
                    } else if (global.session) {
                        dispatch.setSession(undefined);
                    }
                }
            })
        },
        listenToSession: (global, dispatch, code: string) => {
            const unsub1 = SessionsCollection.doc(code)
                .onSnapshot((doc) => dispatch.setSession(doc.data() as ISession));
            const unsub2 = SessionStudentCollection.where('code', '==', code)
                .onSnapshot((snapshot) => {
                    const sessionStudents = {...global.sessionStudents};
                    snapshot.docChanges().forEach((change) => {
                        const data = change.doc.data();
                        switch (change.type) {
                            case 'added':
                            case 'modified':
                                sessionStudents[data.uid] = data as ISessionStudentData;
                                break;
                            case 'removed':
                                delete sessionStudents[data.uid];
                        }
                    });
                    dispatch.setSessionStudents(sessionStudents);
                });
            unsubscriptions[code] = [unsub1, unsub2];
        },
        setUserData: (global, dispatch, userData: IUserData) => {
            return {userData};
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
            const json = await fetchFile(global.language.pathPrefix + folder);
            json && dispatch.setFolders({[folder]: JSON.parse(json)});
            if (json && folder === ROOT_FOLDER) {
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
            const text = await fetchFile(global.language.pathPrefix + key);
            dispatch.setFiles({[key]:text});
        },
        consolePush: (global, _dispatch, record: IConsoleItem) => ({console: [...global.console, record]}),
        startSession: (global, dispatch) => {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.split('');
            let code = '';
            for (let i = 0; i < 5; i++) {
                const index = Math.floor(Math.min(Math.random() * letters.length, letters.length - 1));
                code += letters[index];
            }
            UsersCollection.doc(global.user.uid).set({sessions: {[code]: firebase.firestore.FieldValue.serverTimestamp()}}, {merge: true});
            SessionsCollection.doc(code).set({
                code,
                uid: global.user.uid,
            });
        },
        endSession: (global, dispatch, code: string) => {
            SessionsCollection.doc(code).delete();
            SessionStudentCollection.where('code', '==', code).get().then((docs) => {
                docs.forEach((doc) => doc.ref.delete());
            });
            UsersCollection.doc(global.user.uid).update({['sessions.' + code]: firebase.firestore.FieldValue.delete()});
        },
        setSession: (global, dispatch, session: ISession) => ({session}),
        setSessions: (global, dispatch, sessions: Record<string, number>) => ({sessions}),
        joinSession: (global, dispatch, code: string) => {
            dispatch.setStudentSession({code});
            if (global.user) {
                dispatch.joinSessionAfterLogin();
            } else {
                firebase.auth().signInAnonymously();
            }
        },
        setStudentSession: (_global, _dispatch, studentSession: IStudentSession) => ({studentSession}),
        setStudentSessionDatum: (global, _dispatch, type: keyof ISessionStudentData, data: any) => {
            const {user: {uid}, studentSession: {code}} = global;
            SessionStudentCollection.doc(`${uid}_${code}`).update({[type]: data});
        },
        joinSessionAfterLogin: (global, dispatch) => {
            const {studentSession: {code}, user: {uid}} = global;
            const unsub1 = SessionsCollection.doc(code).onSnapshot((doc) => {
                dispatch.setStudentSession({...global.studentSession, ...doc.data()});
            });
            const docRef = SessionStudentCollection.doc(`${uid}_${code}`);
            const unsub2 = docRef.onSnapshot((doc) => dispatch.setStudentSessionData(doc.data() as ISessionStudentData));
            unsubscriptions[code] = [unsub1, unsub2];
            docRef.set({code, uid}, {merge: true});
        },
        leaveStudentSession: (global, dispatch) => {
            const {user: {uid}, studentSession} = global;
            const {code} = studentSession || {};
            if (code) {
                dispatch.setStudentSession(undefined);
                dispatch.setStudentSessionData(undefined);
                unsubscribe(code);
                SessionStudentCollection.doc(`${uid}_${code}`).delete();
            }
        }
    });
}