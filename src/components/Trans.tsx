import { useGlobal } from 'reactn';
import { ReactElement } from 'react';

export enum TextCodes {
    appTitle,
    load,
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
    TODO
}
// code_key -> 'blah bla {key}'
const translations: {[key in keyof typeof TextCodes]: {[code: string]: string}} = {
    appTitle : {he: 'קורס פיתוח אפליקציות ב- Javascript', ar: 'دورة تطوير تطبيق Javascript'},
    load : {he: 'טען', ar: 'حمل'},
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
    TODO : {he: 'TODO', ar: 'TODO'}
};
export const translate = (key: TextCodes, code: string, params?: Record<string, string>) => {
    let result = (translations[(TextCodes as any)[key]] || {})[code] || 'missing';
    if (params) {
        result = result.replace(/\{(\w+)\}/g,(fullMatch: string, key: string) => (params[key] != undefined)? params[key] : fullMatch);
    }
    return result;
}
export const Trans = ({text}: {text: TextCodes}) => {
    const [{code}] = useGlobal('language');
    return (translate(text, code)) as unknown as ReactElement;
};