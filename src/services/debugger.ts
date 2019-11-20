import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { instanceOf } from "prop-types";

enum TokenType {
    Nothing, // Occupy the zero val
    // Keywords
    Let,
    Const,
    Var,
    Function,
    Return,
    If,
    Else,
    While,
    For,
    Continue,
    Break,

    // Operators
    Assign,
    MultAssign,
    AddAssign,
    SubtAssign,
    DivAssign,
    Add,
    Subtract,
    Mult,
    Divide,
    Increment,
    Decrement,
    Equal,
    Nequal,
    StEqual,
    StNequal,
    Gt,
    Lt,
    Gte,
    Lte,

    // Delimiters
    Comma,
    Dot,
    Semicolon,
    Identifier,
    ParenEmpty,
    ParenOpen,
    ParenClose,
    CurlyOpen,
    CurlyClose,
    SquareOpen,
    SquareClose,

    // Values
    String,
    Number,

}

const valueToType: {[key: string]: TokenType} = {
    'var': TokenType.Var,
    'let': TokenType.Let,
    'const': TokenType.Const,
    'function': TokenType.Function,
    'return': TokenType.Return,
    'if': TokenType.If,
    'else': TokenType.Else,
    'while': TokenType.While,
    'for': TokenType.For,
    'continue': TokenType.Continue,
    'break': TokenType.Break,
    '=': TokenType.Assign,
    '+=': TokenType.AddAssign,
    '-=': TokenType.SubtAssign,
    '*=': TokenType.MultAssign,
    '/=': TokenType.DivAssign,
    '+': TokenType.Add,
    '-': TokenType.Subtract,
    '*': TokenType.Mult,
    '/': TokenType.Divide,
    '++': TokenType.Increment,
    '--': TokenType.Decrement,
    '==': TokenType.Equal,
    '!=': TokenType.Nequal,
    '===': TokenType.StEqual,
    '!==': TokenType.StNequal,
    '>': TokenType.Gt,
    '<': TokenType.Lt,
    '>=': TokenType.Gte,
    '<=': TokenType.Lte,
    ';': TokenType.Semicolon,
    ',': TokenType.Comma,
    '.': TokenType.Dot,
    '()': TokenType.ParenEmpty,
    '(': TokenType.ParenOpen,
    ')': TokenType.ParenClose,
    '{': TokenType.CurlyOpen,
    '}': TokenType.CurlyClose,
    '[': TokenType.SquareOpen,
    ']': TokenType.SquareClose
}
const isAssignment = (type: TokenType): boolean => [
        TokenType.Assign,
        TokenType.AddAssign,
        TokenType.SubtAssign,
        TokenType.MultAssign,
        TokenType.DivAssign
    ].includes(type)
const getPriority = (type: TokenType): number => {
    switch(type) {
        case TokenType.Assign:
        case TokenType.AddAssign:
        case TokenType.SubtAssign:
        case TokenType.MultAssign:
        case TokenType.DivAssign:
        case TokenType.Return:
            return 0;        
        case TokenType.Add:
        case TokenType.Subtract:
            return 1;
        case TokenType.Mult:
        case TokenType.Divide:
            return 2;
        default:
            throw new Error('unknownType '+type);
    }
    return 0;
}
interface IToken {
    type: TokenType;
    line: number;
    offset: number;
    value?: string | number;
    isUnary?: boolean;
}
interface IStatement {
    token: IToken;
    execute: (scope: IScope) => any;
}
interface IVariableState {
    declaredType?: TokenType;
    identifier: IToken;
    value?: any;
}
export class DebugExecution {
    clearNext?: () => void;
    stepCallback: (line: number, offset: number) => void;
    annotationCallback: (line: number, start: number, end: number, msg: string, isError?: boolean) => void;
    executionAborted: boolean = false;
    breakpointLines: {[key: number]: boolean};
    stepByStep: boolean;
    lastNotificationToken: IToken;
    constructor(model: monaco.editor.ITextModel, callback: DebugExecution['stepCallback'],
        anotCB: DebugExecution['annotationCallback'], nativeCallback: (key: string, args: any[]) => any,
        breakpointLines: DebugExecution['breakpointLines'])
    {
        this.stepCallback = callback;
        this.annotationCallback = anotCB;
        this.breakpointLines = breakpointLines;
        this.stepByStep = !Object.keys(breakpointLines).length;
        try {
            const interpreter = new JSInerpreter(model);
            const topBlock = interpreter.top;
            topBlock.execute(new Scope(new GlobalScope(this, nativeCallback))).catch(this.handleError);
        } catch (err) {
            this.handleError(err);
        }
    }
    handleError = (err: Error) => {
        if (err instanceof DebugError) {
            const {message, token: {line, offset, value = ' '}} = err as DebugError;
            this.annotationCallback(line, offset, offset + (value as string).length, message, true);
        } else {
            this.annotationCallback(0, 0, 0, 'אופס, קרתה שגיאה', true);
            console.error(err);
        }
        this.executionAborted = true;
    }
    nextStep = (allTheWay: boolean) => {
        this.stepByStep = !allTheWay;
        const {clearNext} = this;
        this.clearNext = null;
        clearNext && clearNext();
    }
    // If token wasn't supplied - stop on last notification - used for between jumps
    mayIExecute = async (token?: IToken) => {
        if (!token) {
            token = this.lastNotificationToken;
            this.lastNotificationToken = null;
            if (!token) {
                return;
            }
        }
        const {line, offset} = token;
        if (this.executionAborted || this.stepByStep || this.breakpointLines[line]) {
            this.stepCallback(line, offset);
            return new Promise((res) => {
                this.clearNext = res;
            })
        }
        return true;
    }
    getException = (token: IToken, msg: string) => new DebugError(msg, token);
    notify = (token: IToken, msg: string) => {
        if (this.stepByStep) {
            this.lastNotificationToken = token;
            const {line, offset, value: tValue} = token;
            this.annotationCallback(line, offset, offset + (tValue as string).length, msg);
        }
    }
    setValue = (token: IToken, oldValue: any, value: any): void => {
        console.log(`${token.value}: ${oldValue} => ${value}`);
    }
    dispose = (): void => this.clearNext = null;
}
interface IScope {
    get: (identifier: IToken) => any;
    _get: (key: string) => any;
    set: (key: string, value: any, identifier: IToken, declaredType?: TokenType) => void;
    notify: (token: IToken, message: string) => void;
    getException: (token: IToken, message: string) => Error;
    variables: {[key: string]: IVariableState};
    global: IScope;
    execution: DebugExecution;
    parent?: IScope;
}
class GlobalScope implements IScope {
    global: IScope;
    execution: IScope['execution'];
    variables: IScope['variables'];
    constructor(execution: IScope['execution'], nativeCallback: (key: string, args: any[]) => any) {
        this.execution = execution;
        this.global = this;
        this.variables = {
            console : {
                identifier: null,
                value : {
                    log: new FunctionProxy((...args: any[]) => nativeCallback('console.log', args))
                }
            }
        }
    }
    get = (identifier: IToken) => {
        throw new Error('global get should not be called ' + identifier);
    }
    _get = (key: string): IVariableState => {
        let result = this.variables[key];
        if (!result) {
            const native = window[key as any];
            if (typeof native === 'function') {
                return {
                    identifier: null,
                    value: new FunctionProxy((native as Function).bind(window))
                };
            }
        }
        return result;
    }
    set = (key: string, value: any, identifier: IToken, declaredType?: TokenType): void => {
        let oldValue;
        let variable = this.variables[key];
        if (variable) {
            oldValue = variable.value;
            variable.value = value;
        } else {
            variable = this.variables[key] = {
                identifier,
                value
            }
        }
        this.execution.setValue(variable.identifier, oldValue, value);
    }
    notify = (...args: Parameters<IScope['notify']>) => this.execution.notify(...args);
    getException = (...args: Parameters<IScope['getException']>) => this.execution.getException(...args);
    dispose = () => {
        this.global = this.variables = this.execution = null;
    }
}
class Scope implements IScope {
    parent?: IScope['parent'];
    execution: IScope['execution'];
    isFunctionScope: boolean;
    variables: IScope['variables'] = {};
    global: IScope;

    constructor(parent: IScope, isFunctionScope = false) {
        this.parent = parent;
        this.execution = parent.execution;
        this.global = parent.global;
        this.isFunctionScope = isFunctionScope;
    }
    _get = (key: string): IVariableState | null => this.variables[key] || this.parent._get(key);
    get = (identifier: IToken) => {
        const key = identifier.value as string;
        const variable = this._get(key);
        if (variable) {
            return variable.value;
        } else {
            throw this.getException(identifier, `המשתנה ${key} לא הוגדר`);
        }
    }
    set = (key: string, value: any, identifier: IToken, declaredType?: TokenType): void => {
        let variable: IVariableState = this._get(key);
        if (variable) {
            if (declaredType && this.variables[key]) { // TODO - differentiate between var and let/const
                throw this.getException(identifier, `המשתנה ${identifier.value} כבר הוגדר בבלוק הזה.`);
            } else if (variable.declaredType === TokenType.Const) {
                throw this.getException(identifier, 'אסור לשנות משתנה שהוגדר כקבוע - const');
            } else {
                this.execution.setValue(variable.identifier, variable.value, value);
                variable.value = value;
            }
        } else if (declaredType) {
            this.execution.setValue(identifier, undefined, value);
            // TODO - if var/function => set in closest function/global scope
            this.variables[key] = {identifier, declaredType, value};
        } else { // Global variable
            this.global.set(key, value, identifier);
        }
    }
    notify = (...args: Parameters<IScope['notify']>) => this.execution.notify(...args);
    getException = (...args: Parameters<IScope['getException']>) => this.execution.getException(...args);
}
class FunctionProxy implements IStatement {
    token: IToken; // Dummy
    execute: IStatement['execute']; // Dummy
    callback: Function;
    constructor(callback: FunctionProxy['callback']) {
        this.callback = callback;
    }
    executeFunction: FunctionDef['executeFunction'] = (scope, ...args) => this.callback(...args);
}
class Variable implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
    execute = async (scope: IScope) => {
        return scope.get(this.token);
    }
}
class NativeValue implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
    execute = async (_scope: IScope) => this.token.value;
}
class VariableDeclaration implements IStatement {
    varType: TokenType;
    token: IToken;
    // token is the variable name token
    constructor(varType: TokenType, token: IToken) {
        Object.assign(this, {varType, token});
    }
    execute = async (scope: IScope) => {
        scope.set(this.token.value as string, undefined, this.token, this.varType);
    }
}
class Assignment implements IStatement {
    token: IToken;
    left: IStatement;
    right?: IStatement;
    constructor(token: IToken, left: IStatement, right?: IStatement) {
        Object.assign(this, {token, left});
        right && (this.right = right);
    }
    execute = async (scope: IScope) => {
        const {token, left, right} = this;
        const {type} = token;
        let val = right && await right.execute(scope);
        let declaredType;
        if (left instanceof VariableDeclaration) {
            declaredType = left.varType;
        }
        const key = left.token.value as string;
        let returnVal = val;
        if (type === TokenType.Assign) {
            if (declaredType || left instanceof Variable) {
                scope.set(key, val, left.token, declaredType);
            } else if (left instanceof DotStatement) {
                await (left as DotStatement).assign(scope, val);
            } else {
                throw scope.getException(token, 'אופס, קרתה תקלה');
            }
            if (![TokenType.Number, TokenType.String].includes(right.token.type)) {
                const displayVal = typeof val === 'string' ? `"${val}"` : val;
                scope.notify(left.token, `הצבה: ${displayVal}`);
            }
        } else { // Relative assignment
            let oldVal = left instanceof Variable ? scope.get(left.token) : await left.execute(scope);
            let newVal;
            let returnOldVal = false;
            switch (type) {
                case TokenType.AddAssign:
                    newVal = oldVal + val;
                    break;
                case TokenType.SubtAssign:
                    newVal = oldVal - val;
                    break;
                case TokenType.MultAssign:
                    newVal = oldVal * val;
                    break;
                case TokenType.DivAssign:
                    newVal = oldVal / val;
                    break;
                case TokenType.Increment:
                    returnOldVal = true;
                    newVal = oldVal+1;
                    break;
                case TokenType.Decrement:
                    returnOldVal = true;
                    newVal = oldVal-1;
                    break;
            }
            returnVal = returnOldVal ? oldVal : newVal;
            if (left instanceof Variable) {
                scope.set(key, newVal, token);
            } else if (left instanceof DotStatement) {
                await left.assign(scope, newVal);
            } else {
                throw scope.getException(token, 'אופס, קרתה תקלה');
            }
            scope.notify(token, `הערך השתנה ל:${newVal}`);
        }
        return returnVal;
    }
}
class FunctionCall implements IStatement {
    token: IToken; // token of (
    func: IStatement;
    args: IStatement[];
    constructor(token: IToken, func: IStatement, args: IStatement[]) {
        Object.assign(this, {token, func, args});
    }
    execute = async (scope: IScope) => {
        const funcS: FunctionDef = await this.func.execute(scope);
        let args = await Promise.all(this.args.map(arg => arg.execute(scope)));
        return await funcS.executeFunction(scope, args);
    }
}
class FunctionDef implements IStatement {
    token: IToken;
    identifier: IToken;
    args: IStatement[];
    body: Block;
    closure: IScope;
    constructor(token: IToken, args: IStatement[], body: Block, identifier?: IToken) {
        Object.assign(this, {token, args, body, identifier});
    }
    execute = async (scope: IScope): Promise<IStatement> => {
        const {identifier} = this;
        scope.set(identifier.value as string, this, identifier);
        this.closure = scope;
        return this;
    }
    executeFunction = async (scope: IScope, args: any[]) => {
        let funcScope = new Scope(this.closure, true);
        this.args.forEach(({token}, idx) => {
            funcScope.set(token.value as string, args[idx], token, TokenType.Let);
        });
        if (args.length) {
            scope.notify(this.identifier, `הפונקציה נקראה עם הפרמטרים ${args.map((value, idx) => 
                `${this.args[idx].token.value}:${value}`
            ).join(';')}`)
        }
        const result = await this.body.execute(funcScope);
        if (result instanceof ReturnValue) {
            return result.value;
        }
    }
}
class Return implements IStatement {
    token: IToken;
    arg: IStatement;
    constructor(token: IToken, arg: IStatement) {
        Object.assign(this, {token, arg});
    }
    execute = async (scope: IScope) => {
        const result = await this.arg.execute(scope);
        scope.notify(this.arg.token, `הפונקציה מחזירה: ${result}`);
        return new ReturnValue(result);
    }
}
class ReturnValue {
    value: any;
    constructor(value: any) {
        this.value = value;
    }
}
class If implements IStatement {
    token: IToken;
    condition: IStatement;
    body: Block;
    elseStatement?: IStatement;
    constructor(token: IToken, condition: IStatement, body: Block, elseStatement?: IStatement) {
        Object.assign(this, {token, condition, body, elseStatement});
    }
    execute = async (scope: IScope) => {
        const {condition, body, elseStatement} = this;
        let condValue = await condition.execute(scope);
        if (condValue) {
            scope.notify(condition.token, `התנאי החזיר ${condValue} - ניכנס פנימה`);
            return await body.execute(scope);
        } else {
            scope.notify((elseStatement || condition).token, `התנאי החזיר ${condValue} - ממשיכים הלאה`);
            scope.execution.mayIExecute(condition.token);
            return elseStatement && await elseStatement.execute(scope);
        }
    }
}
class Loop implements IStatement {
    token: IToken;
    initialization?: IStatement;
    condition: IStatement;
    postBlock?: IStatement;
    body: Block;
    constructor(token: IToken, condition: IStatement, body: Block, initialization?: IStatement, postBlock?: IStatement) {
        Object.assign(this, {token, initialization, condition, postBlock, body});
    }
    execute = async (scope: IScope) => {
        let myScope = new Scope(scope);
        const {initialization, condition, postBlock, body} = this;
        initialization && await initialization.execute(myScope);
        while (true) {
            const condValue = await condition.execute(myScope);
            if (condValue) {
                myScope.notify(condition.token, `התנאי החזיר ${condValue} - ניכנס פנימה`);
                let result = await body.execute(myScope);
                if (result instanceof EndLoopRun && (result as EndLoopRun).token.type === TokenType.Break) {
                    break;
                }
                if (postBlock) {
                    await postBlock.execute(myScope);
                    await scope.execution.mayIExecute();// Pause on post block notification
                }
            } else {
                myScope.notify(condition.token, `התנאי החזיר ${condValue} - ממשיכים הלאה`);
                break;
            }
        }
    }
}
class EndLoopRun implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
    execute = (scope: IScope) => {
        scope.notify(this.token, this.token.type === TokenType.Break ? 
            'זהו, סיימנו עם הלולאה' :
            'ממשיכים לעוד סיבוב בלולאה'
        );
        return this;
    }
}
class Block implements IStatement {
    token: IToken;
    statements: IStatement[];
    constructor(token: IToken, statements: IStatement[]) {
        this.token = token;
        this.statements = statements;
    }
    execute = async (scope: IScope): Promise<ReturnValue | EndLoopRun | void> => {
        const blockScope = new Scope(scope);
        let result, statement;
        for (let i = 0; i < this.statements.length; i++) {
            statement = this.statements[i];
            await scope.execution.mayIExecute(statement.token);
            result = await statement.execute(blockScope);
            if (result instanceof ReturnValue || result instanceof EndLoopRun) {
                break;
            }
        }
        // If last statement issued a notification, hang on there
        await scope.execution.mayIExecute();
        return result;
    }
}
class DotStatement implements IStatement {
    token: IToken;
    left: IStatement;
    right: IToken;
    constructor(token: IToken, left: IStatement, right: IToken) {
        this.token = token;
        this.left = left;
        this.right = right;
    }
    execute = async (scope: IScope) => {
        const {left, right} = this;
        const leftVal = await left.execute(scope);
        // TODO - handle errors
        return leftVal[right.value as string];
    }
    assign = async (scope: IScope, value: any) => {
        const {left, right} = this;
        const leftVal = await left.execute(scope);
        // TODO - handle errors
        return leftVal[right.value] = value;
    }
}
class OperationStatement implements IStatement {
    token: IToken;
    left: IStatement;
    right: IStatement;
    constructor(token: IToken, left: IStatement, right?: IStatement) {
        this.token = token;
        this.left = left;
        right && (this.right = right);
    }
    execute = async (scope: IScope) => {
        const {token, left, right} = this;
        const lVal = left && await left.execute(scope);
        const rVal = await right.execute(scope);
        switch (token.type) {
            case TokenType.Add:
                return left === undefined ? +rVal : lVal + rVal;
            case TokenType.Subtract:
                return left === undefined ? -rVal : lVal - rVal;
            case TokenType.Mult:
                return lVal * rVal;
            case TokenType.Divide:
                return lVal / rVal;
            case TokenType.Equal:
                return lVal == rVal;
            case TokenType.Nequal:
                return lVal != rVal;
            case TokenType.StEqual:
                return lVal === rVal;
            case TokenType.StNequal:
                return lVal !== rVal;
            case TokenType.Gt:
                return lVal > rVal;
            case TokenType.Lt:
                return lVal < rVal;
            case TokenType.Gte:
                return lVal >= rVal;
            case TokenType.Lte:
                return lVal <= rVal;
            defult:
                throw new Error(`operation ${token.value} isnt implemented yet`);
        }
    }
}
class DebugError extends Error {
    token: IToken;
    constructor(message: string, token: DebugError['token']) {
        super(message);
        this.token = token;
    }
}
type ICompResult<T = IStatement> = [T, number];
class JSInerpreter {
    lines: string[];
    tokens: IToken[];
    top: Block;
    error: {msg: string, token:IToken};

    constructor(model: monaco.editor.ITextModel) {
        this.lines = model.getLinesContent();
        this.tokens = [{
            type: TokenType.CurlyOpen,
            line: 0,
            offset: 0
        }];
        const lineTokens = monaco.editor.tokenize(model.getValue(), 'javascript');
        // Filter whitespace tokens
        const tokensWLines: [monaco.Token, number][] = [];
        lineTokens.forEach((lTokens, line) => lTokens.forEach(token => tokensWLines.push([token, line])));

        tokensWLines.forEach(([token, line], idx) => {
            const {type, offset} = token;
            let [nextToken, nextTokenLine] = tokensWLines[idx + 1] || [];
            if (type && type !== 'comment.js') {
                const value = this.lines[line].substring(offset, token && (nextTokenLine === line) ? nextToken.offset : undefined);
                // Address what seems like a tokenizer bug
                if (value === '++;' || value === '--;') {
                    this.tokens.push(this.processRawToken(token, line, value.substr(0, 2)));
                    this.tokens.push(this.processRawToken({...token, offset: token.offset + 2}, line, value.substr(2)));
                } else {
                    this.tokens.push(this.processRawToken(token, line, value));
                }
            }
        });
        this.tokens.push({
            type: TokenType.CurlyClose,
            line: -1,
            offset: -1
        });
        console.log(this.tokens);
        const [top, nextIdx] = this.compileBlock(0);
        this.top = top;
        console.log(top);
        if (this.tokens[nextIdx]) {
            throw this.getCompilationError('שגיאה בעיבוד הקוד', this.tokens[this.tokens.length - 2]);
        }
    }
    processRawToken = ({type: rawType, offset}: monaco.Token, line: number, value: string | number) => {
        let type: TokenType;
        switch (rawType) {
            case 'keyword.js':
            case 'delimiter.js':
            case 'delimiter.bracket.js':
            case 'delimiter.parenthesis.js':
            case 'delimiter.angle.js':
                if (valueToType[value] !== undefined) {
                    type = valueToType[value]
                } else {
                    console.log('unknown value', value);
                }
                break;
            case 'identifier.js':
                type = TokenType.Identifier;
                break;
            case 'string.js':
                type = TokenType.String;
                value = (value as string).slice(1, (value as string).length - 1);
                break;
            case 'number.js':
                type = TokenType.Number;
                value = +value;
                break;
            default:
                console.log('unknown token type', rawType);
        }
        return {type, line, offset, value};
    }
    getCompilationError = (msg: string, token: IToken) => {
        return new DebugError(msg || 'שגיאה בעיבוד הקוד', token);
    }
    compileStatement = (idx: number, endDelimiters: TokenType[] = [TokenType.Semicolon]): ICompResult => {
        const statementStack: IStatement[] = [];
        const operationStack: IToken[] = [];
        const isExpectingArgument = () => !!statementStack.length == !!operationStack.length; // TODO - do we need the !! ?
        const getStatement = (errToken: IToken, errMsg: string = 'TODO') => {
            const result = statementStack.pop();
            if (!result) {
                throw this.getCompilationError(errMsg, errToken);
            }
            return result;
        }
        const wrapOperation = () => {
            let op = operationStack.pop();
            if (!op) {
                return;
            }
            let right = statementStack.pop();
            let left;
            if (!op.isUnary) {
                left = statementStack.pop();
                if (!left) {
                    throw this.getCompilationError('אמור לבוא פרמטר אחרי האופרטור', op);
                }
            }
            let result: IStatement;
            if (isAssignment(op.type)) {
                result = new Assignment(op, left, right);
            } else if (op.type === TokenType.Return) {
                result = new Return(op, right);
            } else {
                result = new OperationStatement(op, left, right);
            }
            statementStack.push(result);
            return result;
        }
        const wrapUp = (errToken: IToken) => {
            while (wrapOperation()) {}
            let result = statementStack.pop();
            if (statementStack.length > 1) {
                throw this.getCompilationError('', errToken);
            }
            if (!result) {
                throw this.getCompilationError('', errToken);
            }
            return result;
        }
        const assertStart = () => {} // TODO make sure new line since last statement
        const assertEndOfStatement = (idx: number): number => {
            const nextToken = tokens[idx + 1];
            if (nextToken.type === TokenType.Semicolon) {
                return idx + 2;
            }
            if (tokens[idx].line !== nextToken.line) {
                return idx + 1;
            }
            throw this.getCompilationError('יש לסיים את הפעולה עם ; או שורה חדשה', nextToken);
        }
        const {tokens} = this;
        if (this.getType(idx) === TokenType.CurlyOpen) {
            return this.compileBlock(idx);
        }
        let token;
        for (let i = idx; i < tokens.length; i++) {
            token = tokens[i];
            if (endDelimiters.includes(token.type)) {
                return [wrapUp(token), i+1];
            }
            switch (token.type) {
                case TokenType.Var:
                case TokenType.Let:
                case TokenType.Const:
                    assertStart();
                    this.assertTokentype(++i, TokenType.Identifier);
                    const nextToken = tokens[i];
                    statementStack.push(new VariableDeclaration(token.type, nextToken));
                    continue;
                case TokenType.Function:
                    assertStart();
                    return this.compileFunction(i);
                case TokenType.If:
                    return this.compileIf(i);
                case TokenType.While:
                    return this.compileWhile(i);
                case TokenType.For:
                    return this.compileFor(i);
                case TokenType.Break:
                case TokenType.Continue:
                    // TODO - make sure we're in a loop context
                    i = assertEndOfStatement(i);
                    return [new EndLoopRun(token), i];
                case TokenType.Identifier:
                    statementStack.push(new Variable(token));
                    continue;
                case TokenType.Dot:
                    this.assertTokentype(i+1, TokenType.Identifier);
                    statementStack.push(new DotStatement(token, getStatement(token), tokens[++i]));
                    continue;
                case TokenType.Increment:
                case TokenType.Decrement:
                    statementStack.push(new Assignment(token, getStatement(token)));
                    continue;
                case TokenType.ParenEmpty:
                case TokenType.ParenOpen:
                    let nextIdx, statement;
                    // If the (...) is an operation arg
                    if (token.type !== TokenType.ParenEmpty && operationStack[operationStack.length - 1] === tokens[i-1]) {
                        [statement, nextIdx] = this.compileStatement(i+1, [TokenType.ParenClose]);
                    } else {
                        // TODO - support (function(){})()
                        let func = statementStack.pop();
                        if (!func) { // TODO - check for callable types
                            throw this.getCompilationError('', token);
                        }
                        let args: IStatement[];
                        [args, nextIdx] = this.compileArgsList(i);
                        statement = new FunctionCall(token, func, args);
                    }
                    statementStack.push(statement);
                    i = nextIdx - 1;
                    continue;
                case TokenType.Number:
                case TokenType.String:
                    statementStack.push(new NativeValue(token));
                    continue;
                case TokenType.Return:
                    assertStart();
                    token.isUnary = true;
                    operationStack.push(token);
                    continue;
                    // TODO - make sure we're inside a function
                case TokenType.Add:
                case TokenType.Subtract:
                    if (isExpectingArgument()) { // Unary + / -
                        token.isUnary = true;
                        operationStack.push(token);
                        continue;
                    }
                case TokenType.Assign:
                case TokenType.AddAssign:
                case TokenType.SubtAssign:
                case TokenType.MultAssign:
                case TokenType.DivAssign:
                case TokenType.Mult:
                case TokenType.Divide:
                case TokenType.Equal:
                case TokenType.Nequal:
                case TokenType.StEqual:
                case TokenType.StNequal:
                case TokenType.Gt:
                case TokenType.Lt:
                case TokenType.Gte:
                case TokenType.Lte:
                    let lastOp = operationStack[operationStack.length - 1];
                    if (lastOp && getPriority(token.type) < getPriority(lastOp.type)) {
                        wrapOperation();
                    }
                    operationStack.push(token);
                    continue;
            }
        }
        throw this.getCompilationError('TODO - shouldnt get here', token);
    }
    getType = (idx: number): TokenType | undefined => {
        let token = this.tokens[idx];
        return token && token.type;
    }
    assertTokentype = (i: number, type: TokenType | TokenType[]) => {
        let token = this.tokens[i];
        const types = Array.isArray(type) ? type : [type];
        if (!token || !types.includes(token.type)) {
            throw this.getCompilationError('TODO Expecting type', token);
        }
    }
    compileBlock = (idx: number): ICompResult<Block> => {
        const END: TokenType = TokenType.CurlyClose;
        this.assertTokentype(idx, TokenType.CurlyOpen);
        let nextIdx = idx+1;
        const statements: IStatement[] = [];
        let statement: IStatement;
        while (true) {
            [statement, nextIdx] = this.compileStatement(nextIdx, [TokenType.Semicolon, END]);
            statements.push(statement);
            // If block compilation was ended by END
            // TODO - find better way to know if statement ended with '}'
            const isBlockStatement = statement instanceof Block || statement instanceof FunctionDef
                || statement instanceof If || statement instanceof Loop;
            if (this.getType(nextIdx-1) === END && !isBlockStatement) {
                break;
            }
            if (this.getType(nextIdx) === END) {
                nextIdx++;
                break;
            }
        }
        return [new Block(this.tokens[idx], statements), nextIdx];
    }
    compileArgsList = (idx: number): ICompResult<IStatement[]> => {
        const {tokens} = this;
        const args: IStatement[] = [];
        let nextIdx = idx + 1;
        if (tokens[idx].type !== TokenType.ParenEmpty) {
            this.assertTokentype(idx, TokenType.ParenOpen);
            let arg;
            while (this.getType(nextIdx - 1) !== TokenType.ParenClose) {
                [arg, nextIdx] = this.compileStatement(nextIdx, [TokenType.Comma, TokenType.ParenClose]);
                args.push(arg);
            }
        }
        return [args, nextIdx];
    }
    compileFunction = (idx: number): ICompResult<FunctionDef> => {
        this.assertTokentype(idx, TokenType.Function);
        const {tokens} = this;
        let identifier = tokens[idx+1];
        let argsOpenIdx = idx + 2;
        if (identifier && identifier.type !== TokenType.Identifier) {
            identifier = undefined;
            argsOpenIdx = idx + 1;
        }
        let [args, nextIdx] = this.compileArgsList(argsOpenIdx);
        let block: Block;
        [block, nextIdx] = this.compileBlock(nextIdx);
        return [new FunctionDef(tokens[idx], args, block, identifier), nextIdx];
    }
    compileIf = (idx: number): ICompResult<If> => {
        this.assertTokentype(idx + 1, TokenType.ParenOpen);// TODO - say something about us being over strict
        let [condition, nextIdx] = this.compileStatement(idx + 2, [TokenType.ParenClose]);
        let [body, finalId] = this.compileBlock(nextIdx);
        const {tokens} = this;
        let elseStatement;
        if (tokens[finalId].type === TokenType.Else) {
            this.assertTokentype(finalId + 1, [TokenType.CurlyOpen, TokenType.If]);
            [elseStatement, finalId] = this.compileStatement(finalId + 1);
        }
        return [new If(this.tokens[idx], condition, body, elseStatement), finalId];
    }
    compileWhile = (idx: number): ICompResult<Loop> => {
        this.assertTokentype(idx + 1, TokenType.ParenOpen);
        let [condition, nextIdx] = this.compileStatement(idx + 2, [TokenType.ParenClose]);
        let [body, finalId] = this.compileBlock(nextIdx);
        return [new Loop(this.tokens[idx], condition, body), finalId];
    }
    compileFor = (idx: number): ICompResult<Loop> => {
        this.assertTokentype(idx + 1, TokenType.ParenOpen);
        let nextIdx, initialization, condition, postBlock, body;
        [initialization, nextIdx] = this.compileStatement(idx + 2, [TokenType.Semicolon]);
        [condition, nextIdx] = this.compileStatement(nextIdx, [TokenType.Semicolon]);
        [postBlock, nextIdx] = this.compileStatement(nextIdx, [TokenType.ParenClose]);
        [body, nextIdx] = this.compileBlock(nextIdx);
        return [new Loop(this.tokens[idx], condition, body, initialization, postBlock), nextIdx];
    }
}
