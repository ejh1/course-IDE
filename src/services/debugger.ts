import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

/*
    support closures
    support later definition of variables    

*/
enum TokenType {
    // Keywords
    Let,
    Const,
    Var,
    Function,
    Return,
    For,
    While,
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
    Gt,
    Lt,
    Gte,
    Lte,

    // Delimiters
    Comma,
    Dot,
    Semicolon,
    Identifier,
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
    'for': TokenType.For,
    'while': TokenType.While,
    'continue': TokenType.Continue,
    'Break': TokenType.Break,
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
    ';': TokenType.Semicolon,
    ',': TokenType.Comma,
    '.': TokenType.Dot,
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
}
interface IStatement {
    token: IToken;
    // execute: (scope: Scope) => void;
}
interface IVariableState {
    type: TokenType;
    value: any;
}
class Scope {
    parent?: Scope;
    variables: {[key: string]: IVariableState} = {}
}
class Variable implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
}
class Number implements IStatement {
    token: IToken;
    constructor(token: IToken) {
        this.token = token;
    }
}
class VariableDeclaration implements IStatement {
    varType: TokenType;
    token: IToken;
    constructor(varType: TokenType, token: IToken) {
        this.varType = varType;
        this.token = token;
    }
    execute = (scope: Scope) => {

    }
}
class Assignment implements IStatement {
    token: IToken;
    left: IStatement;
    right?: IStatement;
    constructor(token: IToken, left: IStatement, right?: IStatement) {
        this.token = token;
        this.left = left;
        right && (this.right = right);
    }
}
class FunctionCall implements IStatement {
    identifier: string;
    token: IToken;
    execute = (scope: Scope): void => {

    }
}
class FunctionDef implements IStatement {
    token: IToken;
    identifier: IToken;
    args: IStatement[];
    body: Block;
    constructor(token: IToken, args: IStatement[], body: Block, identifier?: IToken) {
        this.token = token;
        this.args = args;
        this.body = body;
        this.identifier = identifier;
    }
    execute = (scope: Scope): void => {
        
    }
}
class Block implements IStatement {
    token: IToken;
    statements: IStatement[];
    constructor(token: IToken, statements: IStatement[]) {
        this.token = token;
        this.statements = statements;
    }
    execute = (scope: Scope): void => {
        
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
    execute = (scope: Scope): void => {

    }
}
type ICompResult<T = IStatement> = [T, number];
export class Debugger {
    lines: string[];
    tokens: IToken[];
    top: Block;
    error: {msg: string, token:IToken};

    constructor(model: monaco.editor.ITextModel, DOM: any) {
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

        let token: monaco.Token, line: number;
        tokensWLines.forEach(([nextToken, nextTokenLine], idx) => {
            if (idx) {
                const {type, offset} = token;
                if (type) {
                    const value = this.lines[line].substring(offset, nextTokenLine === line ? nextToken.offset : undefined);
                    this.tokens.push(this.processRawToken(token, line, value));
                }
            }
            token = nextToken;
            line = nextTokenLine;
        });
        this.tokens.push({
            type: TokenType.CurlyClose,
            line: -1,
            offset: -1
        });
        console.log(this.tokens);
        try {
            const [top, nextIdx] = this.compileBlock(0);
            if (this.tokens[nextIdx]) {
                throw this.setCompilationError('TODO - compilation ended prematurely', this.tokens[this.tokens.length - 2]);
            }
            this.top = top;
            console.log(top);
        } catch (err) {
            // TODO - handle all compilation errors
            this.error;
            console.error(err, this.error);
        }
    }
    processRawToken = ({type: rawType, offset}: monaco.Token, line: number, value: string | number) => {
        let type: TokenType;
        switch (rawType) {
            case 'keyword.js':
            case 'delimiter.js':
            case 'delimiter.bracket.js':
            case 'delimiter.parenthesis.js':
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
    setCompilationError = (msg: string, token: IToken) => {
        this.error = {msg, token};
        return new Error('CompilationError');
    }
    compileStatement = (idx: number, endDelimiters: TokenType[] = [TokenType.Semicolon]): ICompResult => {
        const statementStack: IStatement[] = [];
        const operationStack: IToken[] = [];
        const getStatement = (errToken: IToken, errMsg: string = 'TODO') => {
            const result = statementStack.pop();
            if (!result) {
                throw this.setCompilationError(errMsg, errToken);
            }
            return result;
        }
        const wrapOperation = () => {
            let op = operationStack.pop();
            if (!op) {
                return;
            }
            let right = statementStack.pop();
            let left = statementStack.pop();
            if (!left) {
                throw this.setCompilationError('TODO - Missing arg', op);
            }
            let st = isAssignment(op.type) ? new Assignment(op, left, right) : new OperationStatement(op, left, right);
            statementStack.push(st);
            return st;
        }
        const wrapUp = (errToken: IToken) => {
            while (wrapOperation()) {}
            let result = statementStack.pop();
            if (statementStack.length > 1) {
                throw this.setCompilationError('TODO', errToken);
            }
            if (!result) {
                throw this.setCompilationError('TODO', errToken);
            }
            return result;
        }
        const assertStart = () => {} // TODO make sure new line since last statement
        const {tokens} = this;
        if (this.getType(idx) === TokenType.CurlyOpen) {
            return this.compileBlock(idx);
        }
        let i = idx;
        for (; i < tokens.length; i++) {
            const token = tokens[i];
            if (endDelimiters.includes(token.type)) {
                return [wrapUp(token), i+1];
            }
            switch (token.type) {
                case TokenType.Var:
                case TokenType.Let:
                case TokenType.Var:
                    assertStart();
                    this.assertTokentype(++i, TokenType.Identifier);
                    const nextToken = tokens[i];
                    statementStack.push(new VariableDeclaration(token.type, nextToken));
                    continue;
                case TokenType.Function:
                    assertStart();
                    return this.compileFunction(i);
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
                case TokenType.ParenOpen:
                    let [result, nextIdx] = this.compileStatement(i+1, [TokenType.ParenClose]);
                    statementStack.push(result);
                    i = nextIdx;
                    continue;
                case TokenType.Number:
                    statementStack.push(new Number(token));
                    continue;
                case TokenType.Assign:
                case TokenType.AddAssign:
                case TokenType.SubtAssign:
                case TokenType.MultAssign:
                case TokenType.DivAssign:
                case TokenType.Add:
                case TokenType.Subtract:
                case TokenType.Mult:
                case TokenType.Divide:
                    let lastOp = operationStack[operationStack.length - 1];
                    if (lastOp && getPriority(token.type) < getPriority(lastOp.type)) {
                        wrapOperation();
                    }
                    operationStack.push(token);
                    continue;
            }
        }
        throw this.setCompilationError('TODO - shouldnt get here', tokens[i-1]);
    }
    getType = (idx: number): TokenType | undefined => {
        let token = this.tokens[idx];
        return token && token.type;
    }
    assertTokentype = (i: number, type: TokenType) => {
        let token = this.tokens[i];
        if (!token || token.type !== type) {
            throw this.setCompilationError('TODO Expecting type', token);
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
            const isBlockStatement = statement instanceof Block; // TODO - find nice way to check for ifs and loops
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
    compileFunctionCall = (type: TokenType, identifier: IToken, argsStart: number): ICompResult => {
        return [new FunctionCall(), 0]; // TODO
    }
    compileFunction = (idx: number): ICompResult => {
        this.assertTokentype(idx, TokenType.Function);
        const {tokens} = this;
        let identifier = tokens[idx+1];
        let argsOpenIdx = idx + 2;
        if (!identifier && identifier.type !== TokenType.Identifier) {
            identifier = undefined;
            argsOpenIdx = idx + 1;
        }
        this.assertTokentype(argsOpenIdx, TokenType.ParenOpen);
        const args: IStatement[] = [];
        let arg;
        let nextIdx = argsOpenIdx + 1;
        if (this.getType(nextIdx) === TokenType.ParenOpen) {
            nextIdx ++;
        } else {
            while (this.getType(nextIdx - 1) !== TokenType.ParenClose) {
                [arg, nextIdx] = this.compileStatement(nextIdx, [TokenType.Comma, TokenType.ParenClose]);
                args.push(arg);
            }
        }
        let block: Block;
        [block, nextIdx] = this.compileBlock(nextIdx);
        return [new FunctionDef(tokens[idx], args, block, identifier), nextIdx];
    }
}
