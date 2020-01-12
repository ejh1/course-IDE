import { useGlobal } from 'reactn';
import { ReactElement } from 'react';

export enum TextCodes {
    appTitle,
    login,
    logout,
    code,
    startSession,
    join,
    load,
    enterName,
    snippets,
    oops,
    parseError,
    expectingParam,
    invalidStatementEnd,
    undefined_var,
    alreadyDefined_var,
    constChange,
    assign_val,
    loopDone,
    loopContinue,
    valChanged_val,
    functionCall_vals,
    functionReturn_val,
    condPass_val,
    condFail_val,
    notAFunction_val,
    undefinedHasNoProp_name_prop,
    nullHasNoProp_name_prop,
    TODO
}
// code_key -> 'blah bla {key}'
const translations: {[key in keyof typeof TextCodes]: {[code: string]: string}} = {
    appTitle : {he: 'קורס פיתוח אפליקציות ב- Javascript', ar: 'دورة تطوير تطبيق Javascript'},
    login: {he: 'התחברות', ar: 'دخول'},
    logout: {he: 'התנתקות', ar: 'خروج'},
    code: {he: 'קוד שיעור', ar: 'كود الدرس'},
    startSession: {he: 'התחל שיעור', ar: 'أبدا الدرس'},
    join: {he: 'הצטרפות', ar: 'انضمام'},
    load : {he: 'טען', ar: 'حمل'},
    enterName : {he: 'הכנסת שם', ar: 'أدخل الاسم'},
    snippets : {he: 'קטעי קוד', ar: 'مقتطفات الشفرة'},
    oops : {he: 'אופס, קרתה שגיאה', ar: 'عفوًا ، لقد حدث خطأ'},
    parseError : {he: 'שגיאה בעיבוד הקוד', ar: 'خطأ في معالجة الكود'},
    expectingParam : {he: 'אמור לבוא פרמטר אחרי האופרטור', ar: 'يجب أن تأتي المعلمة بعد المشغل'},
    invalidStatementEnd : {he: 'יש לסיים את הפעולה עם ; או שורה חדשה'},
    undefined_var : {he: `המשתנה {var} לא הוגדר`, ar: 'لم يتم تعيين المتغير {var}'},
    alreadyDefined_var : {he: `המשתנה {var} כבר הוגדר בבלוק הזה.`, ar: 'تم تعريف المتغير {var} بالفعل في هذه الكتلة.'},
    constChange : {he: 'אסור לשנות משתנה שהוגדר כקבוע - const', ar: 'يجب عدم تغيير المتغير الذي تم تعيينه على أنه ثابت - const'},
    assign_val : {he: `הצבה: {val}`, },
    loopDone : {he: 'זהו, סיימנו עם הלולאה', ar: 'هذا كل شيء ، لقد انتهينا من الحلقة'},
    loopContinue : {he: 'ממשיכים לעוד סיבוב בלולאה', ar: 'استمر في حلقة أخرى'},
    valChanged_val : {he: `הערך השתנה ל:{val}`, ar: 'تم تغيير القيمة إلى: {val}'},
    functionCall_vals : {he: 'הפונקציה נקראה עם הפרמטרים {vals}', ar: 'تم استدعاء الوظيفة باستخدام معلمات {vals}'},
    functionReturn_val: {he: `הפונקציה מחזירה: {val}`, ar: 'دالة الإرجاع: {val}'},
    condPass_val: {he: 'התנאי החזיר {val} - ניכנס פנימה', ar: 'حالة الإرجاع {val} - ستذهب إلى الداخل'},
    condFail_val: {he: 'התנאי החזיר {val} - ממשיכים הלאה', ar: 'حالة الإرجاع {val} - الانتقال'},
    notAFunction_val: {he: '{val} הוא לא פונקציה', ar: '{val} ليست وظيفة'},
    undefinedHasNoProp_name_prop: {he: '{name} לא מוגדר ולכן אי אפשר למצוא את {prop}', ar: '{name} غير معروف حتى لا يمكن العثور على {prop}'},
    nullHasNoProp_name_prop: {he: '{name} שווה ל null ולכן אי אפשר למצוא את {prop}', ar: '{name} تساوي null لذلك لا يمكن العثور على {prop}'},
    TODO : {he: 'TODO', ar: 'TODO'}
};
export const translate = (key: TextCodes, code: string, params?: Record<string, string | number>) => {
    let result = (translations[(TextCodes as any)[key]] || {})[code] || 'missing';
    if (params) {
        result = result.replace(/\{(\w+)\}/g,(fullMatch: string, key: string) => (params as any).hasOwnProperty(key)? params[key].toString() : fullMatch);
    }
    return result;
}
export const Trans = ({text}: {text: TextCodes}) => {
    const [{code}] = useGlobal('language');
    return (translate(text, code)) as unknown as ReactElement;
};