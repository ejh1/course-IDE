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
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    setGlobal({
        folders : {},
        files: {},
        console: [],
        language: defaultLanguage
    });
    addReducers({
        checkLogin: (global, dispatch) => {
            firebase.auth().onAuthStateChanged(dispatch.setUser);
        },
        setUser: async (global, dispatch, user: firebase.User) => {
            if (user) {
                const instructor = await firebase.firestore().collection('instructors').doc(user.uid).get();
                dispatch.setUserData({isInstructor: !!instructor.data()});
            } else {
                dispatch.setUserData(null);
            }
            return {user};
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
    });
}