import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { TextCodes } from "@components/Trans";

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
export interface IToken {
    type: TokenType;
    line: number;
    offset: number;
    value?: string | number;
    isUnary?: boolean;
}
interface IStatement {
    token: IToken;
    execute: (scope: IScope, context?: any) => any;
    toString: () => string;
    isBlockStatement?: () => boolean;
}
class VariableState {
    declaredType?: TokenType;
    identifier: IToken;
    value?: any;
    constructor(declaredType: TokenType, identifier: IToken, value?: any) {
        Object.assign(this, {declaredType, identifier, value});
    }
}
export type ITextData = {
    text: TextCodes;
    params?: Record<string, string | number>;
}
const createText = (text: TextCodes, params?: ITextData['params']) => ({text, params});
export interface IDebugCallbacks {
    debugStepCallback: (line: number, offset: number) => void;
    debugAnnotationCallback: (line: number, start: number, end: number, msg: ITextData, isException: boolean) => void;
}
export class DebugExecution implements IDebugCallbacks {
    clearNext?: () => void;
    debugStepCallback: IDebugCallbacks['debugStepCallback'];
    debugAnnotationCallback: IDebugCallbacks['debugAnnotationCallback'];
    executionAborted: boolean = false;
    breakpointLines: {[key: number]: boolean};
    stepByStep: boolean;
    lastNotificationToken: IToken;
    globalScope: GlobalScope;
    constructor(tokens: IToken[], callback: IDebugCallbacks['debugStepCallback'],
        anotCB: IDebugCallbacks['debugAnnotationCallback'],
        breakpointLines: DebugExecution['breakpointLines'])
    {
        this.debugStepCallback = callback;
        this.debugAnnotationCallback = anotCB;
        this.breakpointLines = breakpointLines;
        this.stepByStep = !Object.keys(breakpointLines).length;
        try {
            const interpreter = new JSInterpreter(tokens);
            const topBlock = interpreter.top;
            this.globalScope = new GlobalScope(this);
            topBlock.execute(new Scope(this.globalScope), () => this.stepByStep = false).catch(this.handleError);
        } catch (err) {
            this.handleError(err);
        }
    }
    setBreakpoinLines = (breakpointLines: DebugExecution['breakpointLines']) => this.breakpointLines = breakpointLines
    handleError = (err: Error) => {
        if (err instanceof DebugError) {
            const {msg, token: {line, offset, value = ' '}} = err as DebugError;
            this.debugAnnotationCallback(line, offset, offset + (value as string).length, msg, true);
        } else {
            this.debugAnnotationCallback(0, 0, 0, {text: TextCodes.oops}, true);
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
            this.debugStepCallback(line, offset);
            return new Promise((res) => {
                this.clearNext = res;
            })
        }
        return true;
    }
    getException = (token: IToken, msg: ITextData) => new DebugError(msg, token);
    notify = (token: IToken, msg: ITextData) => {
        if (this.stepByStep) {
            this.lastNotificationToken = token;
            const {line, offset, value: tValue} = token;
            this.debugAnnotationCallback(line, offset, offset + (tValue as string).length, msg, false);
        }
    }
    setValue = (token: IToken, oldValue: any, value: any): void => {
        // console.log(`${token.value}: ${oldValue} => ${value}`);
    }
    dispose = (): void => {
        const {globalScope} = this;
        globalScope.dispose();
        this.globalScope = null;
        this.clearNext = null;
    }
}
interface IScope {
    get: (identifier: IToken) => any;
    _get: (key: string) => any;
    set: (key: string, value: any, identifier: IToken, declaredType?: TokenType) => void;
    notify: (token: IToken, message: ITextData) => void;
    getException: (token: IToken, message: ITextData) => Error;
    global: IScope;
    execution: DebugExecution;
    parent?: IScope;
}
class GlobalScope implements IScope {
    global: IScope;
    execution: IScope['execution'];
    constructor(execution: IScope['execution']) {
        this.execution = execution;
        this.global = this;
    }
    get = (identifier: IToken) => {
        // It should only be accessed by descendant scopes
        throw new Error('global get should not be called ' + identifier);
    }
    _get = (key: string): any => (window as any)[key]
    set = (key: string, value: any, identifier: IToken, declaredType?: TokenType): void => {
        const oldValue = (window as any)[key];
        (window as any)[key] = value;
        this.execution.setValue(identifier, oldValue, value);
    }
    notify = (...args: Parameters<IScope['notify']>) => this.execution.notify(...args);
    getException = (...args: Parameters<IScope['getException']>) => this.execution.getException(...args);
    dispose = () => {
        this.global = this.execution = null;
    }
}
class Scope implements IScope {
    parent?: IScope['parent'];
    execution: IScope['execution'];
    isFunctionScope: boolean;
    variables: Record<string, VariableState> = {};
    global: IScope;

    constructor(parent: IScope, isFunctionScope = false) {
        this.parent = parent;
        this.execution = parent.execution;
        this.global = parent.global;
        this.isFunctionScope = isFunctionScope;
    }
    _get = (key: string): any => this.variables[key] || this.parent._get(key);
    get = (identifier: IToken) => {
        const key = identifier.value as string;
        const variable = this._get(key);
        if (variable instanceof VariableState) {
            return variable.value;
        }
        if (variable === undefined) {
            throw this.getException(identifier, createText(TextCodes.undefined_var, {var: key}));
        }
        return variable;
    }
    set = (key: string, value: any, identifier: IToken, declaredType?: TokenType): void => {
        const myVariable = this.variables[key];
        const variable = myVariable || this._get(key);
        if (variable instanceof VariableState) { // Already defined
            if (declaredType && myVariable) { // TODO - differentiate between var and let/const
                throw this.getException(identifier, {text: TextCodes.alreadyDefined_var, params: {var: identifier.value.toString()}});
            }
            if (variable.declaredType === TokenType.Const) {
                throw this.getException(identifier, {text: TextCodes.constChange});
            }
            this.execution.setValue(variable.identifier, variable.value, value);
            variable.value = value;
        } else if (declaredType) {
            this.execution.setValue(identifier, undefined, value);
            // TODO - if var/function => set in closest function/global scope
            this.variables[key] = new VariableState(declaredType, identifier, value);
        } else { // Global variable
            this.global.set(key, value, identifier);
        }
    }
    notify = (...args: Parameters<IScope['notify']>) => this.execution.notify(...args);
    getException = (...args: Parameters<IScope['getException']>) => this.execution.getException(...args);
}
class Variable implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
    execute = async (scope: IScope) => {
        return scope.get(this.token);
    }
    toString = () => this.token.value.toString()
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
        const displayVal = (str: string) => typeof str === 'string' ? `"${str}"` : str;
        if (type === TokenType.Assign) {
            if (declaredType || left instanceof Variable) {
                scope.set(key, val, left.token, declaredType);
            } else if (left instanceof DotStatement) {
                await (left as DotStatement).assign(scope, val);
            } else {
                throw scope.getException(token, {text: TextCodes.oops});
            }
            if (![TokenType.Number, TokenType.String].includes(right.token.type)) {
                scope.notify(left.token, {text: TextCodes.assign_val, params:{val:displayVal(val)}});
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
                throw scope.getException(token, {text: TextCodes.oops});
            }
            scope.notify(token, {text:TextCodes.valChanged_val, params: {val: displayVal(newVal)}});
        }
        return returnVal;
    }
    isBlockStatement = () => !!this.right && !!this.right.isBlockStatement && this.right.isBlockStatement()
}
class FunctionCall implements IStatement {
    token: IToken; // token of (
    func: IStatement;
    args: IStatement[];
    constructor(token: IToken, func: IStatement, args: IStatement[]) {
        Object.assign(this, {token, func, args});
    }
    execute = async (scope: IScope) => {
        const {func} = this;
        const thisRef: any[] = [];
        const funcS: FunctionDef = await func.execute(scope, thisRef);
        let args = await Promise.all(this.args.map(arg => arg.execute(scope)));
        if (funcS instanceof FunctionDef) {
            return await funcS.executeFunction(scope, args);
        }
        if (typeof funcS === 'function') {
            return (funcS as Function).apply(thisRef[0], args);
        } else {
            throw scope.getException(func.token, createText(TextCodes.notAFunction_val, {val: func.toString()}))
        }
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
        this.closure = scope;
        // Return a function that can be called independently (when attached as an event handler)
        // But still has instanceof FunctionDef === true
        // TODO - if there is event.stopProp.. or preventDefault, execute it immediately
        const thisAsFunc = (...args: any[]) => this.executeFunction(this.closure, args);
        Object.setPrototypeOf(thisAsFunc, this);
        if (identifier) { // If not an anonymous function
            // TODO - only if not assigned
            scope.set(identifier.value as string, thisAsFunc, identifier);
        }
        return thisAsFunc as unknown as IStatement;
    }
    executeFunction = async (scope: IScope, args: any[]) => {
        let funcScope = new Scope(this.closure, true);
        this.args.forEach(({token}, idx) => {
            funcScope.set(token.value as string, args[idx], token, TokenType.Let);
        });
        if (this.args.length) {
            scope.notify(this.identifier || this.token, {text:TextCodes.functionCall_vals, params: {vals: this.args.map((arg, idx) => 
                `${arg.token.value}:${args[idx]}`
            ).join(';')}})
        }
        const result = await this.body.execute(funcScope);
        if (result instanceof ReturnValue) {
            return result.value;
        }
    }
    isBlockStatement = () => true;
}
class Return implements IStatement {
    token: IToken;
    arg: IStatement;
    constructor(token: IToken, arg: IStatement) {
        Object.assign(this, {token, arg});
    }
    execute = async (scope: IScope) => {
        const result = await this.arg.execute(scope);
        scope.notify(this.arg.token, {text: TextCodes.functionReturn_val, params: {val: result}});
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
            scope.notify(condition.token, {text: TextCodes.condPass_val, params:{val: condValue}});
            return await body.execute(scope);
        } else {
            scope.notify((elseStatement || condition).token, {text: TextCodes.condFail_val, params:{val: condValue}});
            scope.execution.mayIExecute(condition.token);
            return elseStatement && await elseStatement.execute(scope);
        }
    }
    isBlockStatement = () => true;
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
                myScope.notify(condition.token, {text: TextCodes.condPass_val, params: {val: condValue}});
                let result = await body.execute(myScope);
                if (result instanceof EndLoopRun && (result as EndLoopRun).token.type === TokenType.Break) {
                    break;
                }
                if (postBlock) {
                    await postBlock.execute(myScope);
                    await scope.execution.mayIExecute();// Pause on post block notification
                }
            } else {
                myScope.notify(condition.token, {text: TextCodes.condFail_val, params:{val: condValue}});
                break;
            }
        }
    }
    isBlockStatement = () => true;
}
class EndLoopRun implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
    execute = (scope: IScope) => {
        scope.notify(this.token, {text: this.token.type === TokenType.Break ? 
            TextCodes.loopDone : TextCodes.loopContinue }
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
    execute = async (scope: IScope, endCallback?: () => void): Promise<ReturnValue | EndLoopRun | void> => {
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
        endCallback && endCallback();
        return result;
    }
    isBlockStatement = () => true
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
    execute = async (scope: IScope, leftValRef?: any[]) => {
        const {left, right} = this;
        const leftVal = left.execute ? await left.execute(scope) : left;
        if (leftVal === undefined || leftVal === null) { // TODO - any other cases?
            throw scope.getException(right,
                createText(leftVal === null ? TextCodes.nullHasNoProp_name_prop : TextCodes.undefinedHasNoProp_name_prop, {name: left.toString(), prop: right.value}))
        }
        if (leftValRef) {
            leftValRef[0] = leftVal;
        }
        return leftVal[right.value as string];
    }
    assign = async (scope: IScope, value: any) => {
        const {left, right} = this;
        const leftVal = left.execute ? await left.execute(scope) : left;
        // TODO - handle errors
        return leftVal[right.value] = value;
    }
    toString = () => `${this.left.toString()}.${this.right.value}`;
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
    msg: ITextData;
    constructor(msg: DebugError['msg'], token: DebugError['token']) {
        super(msg.text.toString());
        Object.assign(this, {msg, token});
    }
}
type ICompResult<T = IStatement> = [T, number];
export class JSInterpreter {
    tokens: IToken[];
    top: Block;
    error: {msg: string, token:IToken};

    static tokenize = (lines: string[]) => {
        const tokens: JSInterpreter['tokens'] = [{
            type: TokenType.CurlyOpen,
            line: 0,
            offset: 0
        }];
        const lineTokens = monaco.editor.tokenize(lines.join('\n'), 'javascript');
        const tokensWLines: [monaco.Token, number][] = [];
        lineTokens.forEach((lTokens, line) => lTokens.forEach(token => tokensWLines.push([token, line])));
        
        // Filter whitespace tokens
        tokensWLines.forEach(([token, line], idx) => {
            const {type, offset} = token;
            let [nextToken, nextTokenLine] = tokensWLines[idx + 1] || [];
            if (type && type !== 'comment.js') {
                const value = lines[line].substring(offset, token && (nextTokenLine === line) ? nextToken.offset : undefined);
                // Address what seems like a tokenizer bug
                if (value === '++;' || value === '--;') {
                    tokens.push(JSInterpreter.processRawToken(token, line, value.substr(0, 2)));
                    tokens.push(JSInterpreter.processRawToken({...token, offset: token.offset + 2}, line, value.substr(2)));
                } else if ([')(','))'].includes(value)) {
                    tokens.push(JSInterpreter.processRawToken(token, line, value.substr(0, 1)));
                    tokens.push(JSInterpreter.processRawToken({...token, offset: token.offset + 1}, line, value.substr(1)));
                } else {
                    tokens.push(JSInterpreter.processRawToken(token, line, value));
                }
            }
        });
        tokens.push({
            type: TokenType.CurlyClose,
            line: -1,
            offset: -1
        });
        return tokens;
    }
    static processRawToken = ({type: rawType, offset}: monaco.Token, line: number, value: string | number) => {
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

    constructor(tokens: JSInterpreter['tokens']) {
        this.tokens = tokens;
        const [top, nextIdx] = this.compileBlock(0);
        this.top = top;
        if (this.tokens[nextIdx]) {
            throw this.getCompilationError({text:TextCodes.parseError}, this.tokens[this.tokens.length - 2]);
        }
    }
    getCompilationError = (msg: ITextData, token: IToken) => {
        return new DebugError(msg || {text: TextCodes.parseError}, token);
    }
    compileStatement = (idx: number, endDelimiters: TokenType[] = [TokenType.Semicolon]): ICompResult => {
        const statementStack: IStatement[] = [];
        const operationStack: IToken[] = [];
        const isExpectingArgument = () => statementStack.length === operationStack.length;
        const getStatement = (errToken: IToken) => {
            const result = statementStack.pop();
            if (!result) {
                throw this.getCompilationError({text: TextCodes.oops}, errToken);
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
                    throw this.getCompilationError({text: TextCodes.expectingParam}, op);
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
                throw this.getCompilationError({text: TextCodes.parseError}, errToken);
            }
            if (!result) {
                throw this.getCompilationError({text: TextCodes.parseError}, errToken);
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
            throw this.getCompilationError({text: TextCodes.invalidStatementEnd}, nextToken);
        }
        const {tokens} = this;
        if (this.getType(idx) === TokenType.CurlyOpen) {
            return this.compileBlock(idx);
        }
        let token: IToken;
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
                case TokenType.Function: {
                    const isAssignment = operationStack.length === 1 && operationStack[0].type === TokenType.Assign
                        && statementStack.length === 1;
                    isAssignment || assertStart();
                    const [funcDef, nextIdx] = this.compileFunction(i, endDelimiters);
                    statementStack.push(funcDef);
                    return [wrapUp(tokens[nextIdx] || tokens[nextIdx - 1]), nextIdx];
                }
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
                case TokenType.ParenOpen: {
                    const isEmpty = token.type === TokenType.ParenEmpty;
                    let nextIdx, statement;
                    // Function call of last parsed statement
                    if (statementStack.length > operationStack.length) {
                        const func = statementStack.pop();
                        let args: IStatement[];
                        [args, nextIdx] = this.compileArgsList(i);
                        statement = new FunctionCall(token, func, args);
                    } else if (!isEmpty) {
                        [statement, nextIdx] = this.compileStatement(i + 1, [TokenType.ParenClose]);
                        // Anonymous function call
                        if (statement instanceof FunctionDef) {
                            let args: IStatement[];
                            [args, nextIdx] = this.compileArgsList(nextIdx);
                            statement = new FunctionCall(token, statement, args);    
                        }
                    } else {
                        throw this.getCompilationError({text: TextCodes.TODO}, token);
                    }
                    statementStack.push(statement);
                    i = nextIdx - 1;
                    continue;
                }
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
        throw this.getCompilationError({text:TextCodes.parseError}, token);
    }
    getType = (idx: number): TokenType | undefined => {
        let token = this.tokens[idx];
        return token && token.type;
    }
    assertTokentype = (i: number, type: TokenType | TokenType[]) => {
        let token = this.tokens[i];
        const types = Array.isArray(type) ? type : [type];
        if (!token || !types.includes(token.type)) {
            throw this.getCompilationError({text:TextCodes.parseError}, token);
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
            const isBlockStatement = statement.isBlockStatement && statement.isBlockStatement();
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
    compileFunction = (idx: number, endDelimiters: TokenType[]): ICompResult<FunctionDef> => {
        this.assertTokentype(idx, TokenType.Function);
        const {tokens} = this;
        let identifier = tokens[idx+1];
        let argsOpenIdx = idx + 2;
        // Anonymous function
        if (identifier && identifier.type !== TokenType.Identifier) {
            identifier = undefined;
            argsOpenIdx = idx + 1;
        }
        let [args, nextIdx] = this.compileArgsList(argsOpenIdx);
        let block: Block;
        [block, nextIdx] = this.compileBlock(nextIdx);
        const nextToken = tokens[nextIdx];
        if (nextToken && endDelimiters.includes(nextToken.type)) {
            nextIdx++;
        }
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
