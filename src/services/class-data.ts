import { addReducers, setGlobal } from 'reactn';
const CLASSES_BASE_PATH = 'https://demo-mtova-course.s3.eu-central-1.amazonaws.com/';

export interface IFile {
    name: string;
    file: string;
}
let initialized = false;
export const initializeGlobalState = () => {
    if (initialized) {
        console.error('Already initialized');
        return;
    }
    initialized = true;
    setGlobal({
        'files': {}
    });    
    addReducers({
        setCode: (_global, _dispatch, code: string) => ({code}),
        setClassData: (_global, _dispatch, classData: any) => ({classData}),    
        selectCode: async (_global, dispatch, code: string) => {
            await dispatch.setCode(code);
            const response = await fetch(`${CLASSES_BASE_PATH}${code}.json`);
            await dispatch.setClassData(await response.json())    
        },

        setSelectedFile: (_global, _dispatch, selectedFile: string) => ({selectedFile}),
        addFiles: (global, _dispatch, file: {[key: string]: string}) => ({files: {...global.files, ...file}}),
        selectFile: async (global, dispatch, file: IFile) => {
            const key = file.file;
            await dispatch.setSelectedFile(key);
            if (!global.files[key]) {
                const response = await fetch(`${CLASSES_BASE_PATH}${key}`);
                await dispatch.addFiles({[key]: await response.text()});
            }
        }
    });
}