import 'reactn';
import { IFile } from './services/class-data';

declare module 'reactn/default' {
    interface Reducer<T, O> {
        (global: State, dispatch: Dispatch, value: T): O;
    }
    export interface Reducers {
        setCode: Reducer< State['code'], Pick<State, 'code'> >;
        setClassData: Reducer< State['classData'], Pick<State, 'classData'> >;
        selectCode: Reducer<State['code'], void>;
        setSelectedFile: Reducer< State['code'], void >;
        addFiles: Reducer< State['files'], Pick<State, 'files'> >;
        selectFile: Reducer< IFile, void>;
    }
    export interface State {
        'code': string;
        'classData': any;
        'selectedFile': string;
        'files': {[key: string]: string};
    }
}