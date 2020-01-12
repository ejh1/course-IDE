import { addReducers, setGlobal } from 'reactn';
import firebase, { firestore } from 'firebase/app';
import _get from 'lodash/get';
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
    folder: IFolder;
    snippets: ISnippet[];
    sharingStudent?: string;
}
export interface ISessionStudentData {
    uid: string;
    name: string;
    snippet: ISnippet;
}
export interface IFile {
    name: string;
    key: string;
    forInstructors: boolean;
}
export interface IFolder {
    children: IFile[];
}
const TEACHER_SNIPPET_ID = 'teacher_snippet';
export interface ISnippet {
    id: string;
    name: string;
    timestamp: number;
    code: Record<string, string>;
}
export enum SnippetType {
    NONE,
    USER,
    SESSION,
    STUDENT
}
export interface IDisplaySnippet extends ISnippet {
    type: SnippetType;
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
    
    const updateSnippets = (uid: string, snippets: ISnippet[]) => UsersCollection.doc(uid).set({snippets}, {merge: true});
    const updateSessionSnippets = (code: string, snippets: ISnippet[]) => {
        SessionsCollection.doc(code).update({snippets});
    }
    setGlobal({
        folders : {},
        files: {},
        console: [],
        sessions: {},
        language: defaultLanguage,
        shareCode: false
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
                const {pendingStudentSession} = global;
                if (pendingStudentSession) {
                    dispatch.joinSessionAfterLogin(user);
                }
            } else {
                dispatch.setUserData(null);
            }
            return {user};
        },
        listenToSessions: (global, dispatch, uid: string) => {
            UsersCollection.doc(uid).onSnapshot((doc) => {
                const data = doc.data() || {};
                const {sessions = {}, snippets = []} = data;
                dispatch.setSnippets(snippets);
                dispatch.setSessions(sessions);
                const {session} = global;
                const sessionCode = Object.keys(sessions)[0];
                const existingCode = (session || {}).code;
                if (sessionCode !== existingCode) {
                    unsubscribe(existingCode); // Redundant but not harmful
                    if (sessionCode) {
                        dispatch.listenToSession(sessionCode);
                    } else if (global.session) {
                        dispatch.setSession(undefined);
                        dispatch.setSessionStudents(undefined);
                    }
                }
            }, (err) => console.log('lts failed', err));
        },
        listenToSession: (global, dispatch, code: string) => {
            const unsub1 = SessionsCollection.doc(code)
                .onSnapshot((doc) => dispatch.setSession(doc.data() as ISession));
            const unsub2 = SessionStudentCollection.where('sessionCode', '==', code)
                .onSnapshot((snapshot) => {
                    dispatch._processSessionStudentUpdate(snapshot.docChanges());
                }, (err) => console.log('ss failed', err));
            unsubscriptions[code] = [unsub1, unsub2];
        },
        _processSessionStudentUpdate: (global, dispatch, changes: firestore.DocumentChange[]) => {
            const sessionStudents = {...global.sessionStudents};
            const {session} = global;
            changes.forEach((change) => {
                const data = change.doc.data();
                const {uid} = data;
                switch (change.type) {
                    case 'added':
                    case 'modified':
                        sessionStudents[uid] = data as ISessionStudentData;
                        if (session && session.sharingStudent === uid) {
                            setTimeout(() => dispatch.setSnippetToDisplay(SnippetType.STUDENT, uid), 0);
                        }
                        break;
                    case 'removed':
                        if (session && session.sharingStudent === uid) {
                            dispatch.setSnippetToDisplay(SnippetType.NONE);
                        }
                        delete sessionStudents[uid];
                }
            });
            dispatch.setSessionStudents(sessionStudents);
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
                folder: {children:[]},
                snippets: []
            });
        },
        toggleSessionFile: (global, _dispatch, file: IFile) => {
            let {session: {code, folder: {children}}} = global;
            if (children.some(({key}) => key === file.key)) {
                children = children.filter(({key}) => key !== file.key);
            } else {
                children = [...children, file];
            }
            SessionsCollection.doc(code).update({folder: {children}});
        },
        toggleSessionSnippet: (global, dispatch, snippet: ISnippet) => {
            let {session: {code, snippets = []}} = global;
            if (snippets.some(({id}) => id === snippet.id)) {
                snippets = snippets.filter(({id}) => id !== snippet.id);
            } else {
                snippets = [...snippets, snippet];
            }
            updateSessionSnippets(code, snippets);
        },
        endSession: async (global, dispatch, code: string) => {
            unsubscribe(code);
            UsersCollection.doc(global.user.uid).update({['sessions.' + code]: firebase.firestore.FieldValue.delete()});
            const docs = await SessionStudentCollection.where('sessionCode', '==', code).get();
            const promises: Promise<any>[] = [];
            docs.forEach(doc => promises.push(doc.ref.delete()));
            await Promise.all(promises);
            // Delete session only after deleting student entries, because teacher permissions
            // depend on user owning the session
            SessionsCollection.doc(code).delete();
            dispatch.setSessionStudents({});
        },
        toggleCodeSharing: (global) => {
            const {session} = global;
            const shareCode = !global.shareCode;
            if (session) {
                // Add teacher's (=my) code as snippet
                const {code, snippets = []} = session;
                const shared = snippets[0] && snippets[0].id === TEACHER_SNIPPET_ID;
                if (shareCode !== shared) {
                    let newSnippets;
                    if (shareCode) {
                        const newSnippet: ISnippet = {
                            id: TEACHER_SNIPPET_ID,
                            name: 'Teacher',
                            timestamp: Date.now(),
                            code: {}
                        };
                        newSnippets = [newSnippet,...snippets];
                    } else {
                        newSnippets = snippets.slice(1);
                    }
                    updateSessionSnippets(code, newSnippets);
                }
            }
            return {shareCode};
        },
        setSharedCode: ({shareCode, session, studentSession, user, snippetToDisplay}, dispatch, sharedCode: ISnippet['code']) => {
            if (!shareCode) {
                return;
            }
            if (session) { // I'm a teacher
                const {code, snippets: [shared, ...rest]} = session;
                if (shared.id !== TEACHER_SNIPPET_ID) {
                    console.error('wrong first session snippet');
                    return;
                }
                updateSessionSnippets(code, [
                    {...shared, code: sharedCode, timestamp: Date.now()},
                    ...rest
                ]);
            } else if (studentSession) { // I'm a student
                if (snippetToDisplay && snippetToDisplay.id === TEACHER_SNIPPET_ID) {
                    // Avoid feedback loop
                    return;
                }
                dispatch.setStudentSessionDatum('snippet', {
                    id: user.uid,
                    name: 'student',
                    code: sharedCode,
                    timestamp: Date.now()
                });
            }
        },
        setSession: (global, dispatch, session: ISession) => {
            const {session: oldSession} = global;
            if (session && (!oldSession || oldSession.code !== session.code)) {
                const {snippets = []} = session;
                const sharingCode = snippets[0] && snippets[0].id === TEACHER_SNIPPET_ID;
                if (!!sharingCode !== !!global.shareCode) {
                    dispatch.toggleCodeSharing();
                }
            }
            return {session};
        },
        setSessions: (global, dispatch, sessions: Record<string, number>) => ({sessions}),
        setSnippets: (global, dispatch, snippets: ISnippet[]) => ({snippets}),
        setSnippetToDisplay: (global, _dispatch, type: SnippetType, id: string = '') => {
            let snippet: ISnippet, snippetToDisplay: IDisplaySnippet;
            let sharingStudent;
            switch (type) {
                case SnippetType.USER:
                case SnippetType.SESSION:
                    const snippets = (type === SnippetType.USER) ? global.snippets : global.studentSession.snippets;
                    snippet = (snippets || []).find((snippet) => snippet.id === id);
                    break;
                case SnippetType.STUDENT:
                    sharingStudent = id;
                    const studentData = (global.sessionStudents[id] || {}) as ISessionStudentData;
                    snippet = {
                        ...studentData.snippet,
                        id,
                        name: studentData.name || 'student',
                    };
            }
            if (snippet) {
                snippetToDisplay = {...snippet, type};
            }
            const {session} = global;
            if (session && session.sharingStudent !== sharingStudent) {
                SessionsCollection.doc(session.code).update({sharingStudent: sharingStudent || firebase.firestore.FieldValue.delete()});
            }
            return {snippetToDisplay};
        },
        saveSnippet: (global, dispatch, snippet: ISnippet) => {
            snippet.timestamp = Date.now();
            const {user: {uid}, snippets, session} = global;
            updateSnippets(uid, snippets.map(snp => snp.id === snippet.id ? snippet : snp));
            // Update snippet in session if displayed there
            if (session) {
                const {code, snippets = []} = session;
                if (snippets.some(({id}) => id === snippet.id)) {
                    updateSessionSnippets(code, snippets.map((s) => s.id === snippet.id ? snippet : s));
                }
            }
        },
        removeSnippet: (global, dispatch, snippet: ISnippet) => {
            const {user: {uid}, snippets, session} = global;
            if (snippet.id === _get(global.snippetToDisplay, 'id')) {
                dispatch.setSnippetToDisplay(SnippetType.NONE);
            }
            // Remove snippet from session if displayed there
            if (session) {
                const {code, snippets = []} = session;
                if (snippets.some(({id}) => id === snippet.id)) {
                    updateSessionSnippets(code, snippets.filter(({id}) => id !== snippet.id));
                }
            }
            updateSnippets(uid, snippets.filter(({id}) => id !== snippet.id));
        },
        addSnippet: (global, dispatch, code: ISnippet['code'], name: string) => {
            const {user: {uid}, snippets} = global;
            const snippet: ISnippet = {
                timestamp: Date.now(),
                id: Math.round(Math.random() * 10000000).toString(),
                code,
                name
            };
            updateSnippets(uid, (snippets || []).concat(snippet));
            setTimeout(() => dispatch.setSnippetToDisplay(SnippetType.USER, snippet.id), 1);
        },
        setSessionStudents: (global, dispatch, sessionStudents: Record<string, ISessionStudentData>) =>
            ({sessionStudents, sessionStudentsCount: Object.keys(sessionStudents || {}).length}),
        joinSession: (global, dispatch, code: string, name: string) => {
            dispatch.setPendingStudentSession({code, name});
            if (global.user) {
                dispatch.joinSessionAfterLogin(global.user);
            } else {
                firebase.auth().signInAnonymously();
            }
        },
        setPendingStudentSession: (global, dispatch, pendingStudentSession: {code: string, name: string}) => ({pendingStudentSession}),
        setStudentSession: (global, dispatch, studentSession: ISession) => {
            if (studentSession) {
                dispatch.setFolders({[ROOT_FOLDER]: studentSession.folder});
                const {snippetToDisplay} = global;
                // Update displayed session snippet if necessary
                if (snippetToDisplay && snippetToDisplay.type === SnippetType.SESSION) {
                    const snippet = studentSession.snippets.find(({id}) => id === snippetToDisplay.id);
                    if (snippet && snippet.timestamp !== snippetToDisplay.timestamp) {
                        window.setTimeout(() => dispatch.setSnippetToDisplay(SnippetType.SESSION, snippet.id),1);
                    } else {
                        dispatch.setSnippetToDisplay(SnippetType.NONE);
                    }
                }
                const shareCode = studentSession.sharingStudent === global.user.uid;
                if (shareCode !== global.shareCode) {
                    dispatch.toggleCodeSharing();
                }
            } else {
                dispatch.getFolder(ROOT_FOLDER);
            }
            return {studentSession};
        },
        setStudentSessionDatum: (global, _dispatch, type: keyof ISessionStudentData, data: any) => {
            const {user: {uid}, studentSession: {code}} = global;
            SessionStudentCollection.doc(`${uid}_${code}`).update({[type]: data});
        },
        setStudentSessionData: (global, dispatch, sessionStudentData: ISessionStudentData) => ({sessionStudentData}),
        joinSessionAfterLogin: async (global, dispatch, user: firebase.User) => {
            const {uid} = user;
            const {pendingStudentSession: {code, name}} = global;
            const sessionDocRef = SessionsCollection.doc(code);
            const session = await sessionDocRef.get();
            if (!session.data()) {
                alert('Session not found');
                return;
            }
            const unsub1 = sessionDocRef.onSnapshot((doc) => {
                const session = doc.data() as ISession;
                if (!session) { // Session termination by teacher
                    console.log('Session was ended');
                    dispatch.leaveSession();
                } else {
                    dispatch.setStudentSession(session);
                }
            });
            const docRef = SessionStudentCollection.doc(`${uid}_${code}`);
            const unsub2 = docRef.onSnapshot((doc) => dispatch.setStudentSessionData(doc.data() as ISessionStudentData),
                err => console.log('student ss failed', err));
            const unsub3 = UsersCollection.doc(uid).onSnapshot((doc) => {
                const data = doc.data();
                if (data) {
                    const {snippets = []} = data;
                    dispatch.setSnippets(snippets);
                }
            })
            unsubscriptions[code] = [unsub1, unsub2, unsub3];
            docRef.set({sessionCode: code, name, uid}, {merge: true});
            dispatch.setPendingStudentSession(undefined);
        },
        leaveSession: (global, dispatch) => {
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