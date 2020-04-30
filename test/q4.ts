import { Exp, Program, PrimOp, isProgram, isBoolExp, isNumExp, isVarRef, isPrimOp, isDefineExp, isProcExp, isIfExp, isAppExp, CExp } from "../imp/L2-ast";
import { Result, makeOk, makeFailure, mapResult, bind, safe3, safe2 } from "../imp/result";
import { rest, first, isEmpty } from '../imp/list';
import { map } from "ramda";

/*
Purpose: Transform PrimOp operator to its JavaScript equivalent
Signature: primOpToJS(op)
Type: [PrimOp -> Result(string)]
Pre-conditions: None
Tests: primOpToJS({tag: "PrimOp", op: "and" }) -> "&&"
*/
const primOpToJS = (op: PrimOp): Result<string> =>
    ["=", "eq?"].includes(op.op) ? makeOk("===") :
    op.op === "and" ? makeOk("&&") :
    op.op === "or" ? makeOk("||") :
    op.op === "not" ? makeOk("!") :
    op.op === "number?" ? makeOk(`((x) => typeof x === "number")`) :
    op.op === "boolean?" ? makeOk(`((x) => typeof x === "boolean")`) :
    makeOk(op.op);

/*
Purpose: Transform PrimOp unary operator and operands of an AppExp to its JavaScript equivalent,
         using the result pattern
Signature: unaryPrimToJs(rator, rands, resultPattern)
Type: [PrimOp * CExp[] * string -> Result(string)]
Pre-conditions: None
Tests: unaryPrimToJs({tag: "PrimOp", op: "not"}, [{tag: "BoolExp"; val: #t }], "!${rand}") -> "!true"
*/
const unaryPrimToJs = (rator: PrimOp, rands: CExp[], resultPattern: string): Result<string> =>
    isEmpty(rands) ? makeFailure(`'${rator.op}' arity mismatch"`) :
    bind(l2ToJS(first(rands)), (rand: string) => makeOk(resultPattern.replace("${rand}", rand)));

/*
Purpose: Transform PrimOp binary operator and operands of an AppExp to its JavaScript equivalent
Signature: binaryPrimToJS(rator, rands)
Type: [PrimOp * CExp[] -> Result(string)]
Pre-conditions: None
Tests: binaryPrimToJS({tag: "PrimOp", op: ">"}, [{tag: "NumExp"; val: 2 }, {tag: "NumExp"; val: 1 }]) -> "2 > 1"
*/
const binaryPrimToJS = (rator: PrimOp, rands: CExp[]): Result<string> =>
    isEmpty(rands) || isEmpty(rest(rands)) ? makeFailure(`${rator.op} arity mismatch`) :
        safe3((rator: string, rand1: string, rand2: string) => makeOk(`${rand1} ${rator} ${rand2}`))
        (l2ToJS(rator), l2ToJS(rands[0]), l2ToJS(rands[1]));

/*
Purpose: Make a string of all the operands seperated by the operator sign
Signature: joinAllRands(rator, rands)
Type: [PrimOp * CExp[] -> Result(string)]
Pre-conditions: None
Tests: joinAllRands({tag: "PrimOp", op: "+"}, [{tag: "NumExp"; val: 2 }, {tag: "NumExp"; val: 3 }, {tag: "NumExp"; val: 5 }])
       -> "2 + 3 + 5"
*/
const joinAllRands = (rator: PrimOp, rands: CExp[]): Result<string> =>
    bind(mapResult((rand: CExp) => l2ToJS(rand), rands), (rands: string[]) => makeOk(rands.join(` ${rator.op} `)));

/*
Purpose: Transform PrimOp operator and operands of an AppExp to its JavaScript equivalent
Signature: primAppToJS(rator, rands)
Type: [PrimOp * CExp[] -> Result(string)]
Pre-conditions: None
Tests: as part of l2ToJS tests
*/
const primAppToJS = (rator: PrimOp, rands: CExp[]): Result<string> =>
    rator.op === "+" ?
        isEmpty(rands) ? makeOk("0") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) :
        joinAllRands(rator, rands) :

    rator.op === "*" ?
        isEmpty(rands) ? makeOk("1") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) :
        joinAllRands(rator, rands) :

    rator.op === "-" ?
        isEmpty(rands) ? makeFailure("'-' arity mismatch") :
        isEmpty(rest(rands)) ? bind(l2ToJS(first(rands)), (rand: string) =>
            rand.startsWith("-") ? makeOk(`-(${rand})`) : makeOk(`-${rand}`)) :

        // For each rand, if it's a negative number, wrap it in parentheses. Then, join all rands with ' - '.
        bind(mapResult(
                (rand: CExp) => bind(l2ToJS(rand), (rand: string) => rand.startsWith("-") ? makeOk(`(${rand})`) : makeOk(rand)),
                rands),
            (rands: string[]) => makeOk(rands.join(" - "))) :

    rator.op === "/" ?
        isEmpty(rands) ? makeFailure("'/' arity mismatch") :
        isEmpty(rest(rands)) ? bind(l2ToJS(first(rands)), (rand: string) => makeOk(`1 / ${rand}`)) :
        joinAllRands(rator, rands) :

    ["and", "or", "<", ">", "=", "eq?"].includes(rator.op) ? binaryPrimToJS(rator, rands) :

    rator.op === "not" ? unaryPrimToJs(rator, rands, "!${rand}") :
    rator.op === "number?" ? unaryPrimToJs(rator, rands, 'typeof ${rand} === "number"') :
    rator.op === "boolean?" ? unaryPrimToJs(rator, rands, 'typeof ${rand} === "boolean"') :

    makeFailure(`Invalid AppExp ${rator} ${rands}`);

/*
Purpose: Make a function body from the Javascript statements that consist it
Signature: procBodyStringToJs(body)
Type: [string[] -> string]
Pre-conditions: None
Tests: procBodyStringToJs(["const x = 3", "x"]) -> "{const x = 3; return x;}"
*/
const procBodyStringToJs = (body: string[]): string =>
    isEmpty(rest(body)) ?
    first(body) :
    `{${body.slice(0, -1).join("; ")}; return ${first(body.slice(-1))};}`;

/*
Purpose: Transform a given L2 program to a JavaScript program
Signature: l2ToJS(exp)
Type: [Exp | Program -> Result(string)]
Pre-conditions: None
Tests: as in q4-tests.ts
*/
export const l2ToJS = (exp: Exp | Program): Result<string> => 
    isProgram(exp) ? bind(mapResult(l2ToJS, exp.exps), (exps: string[]) =>
        makeOk(exps.slice(0, -1).concat(`console.log(${first(exps.slice(-1))});`).join(";\n"))) :
    isBoolExp(exp) ? makeOk(exp.val ? "true" : "false") :
    isNumExp(exp) ? makeOk(exp.val.toString()) :
    isVarRef(exp) ? makeOk(exp.var) :
    isPrimOp(exp) ? primOpToJS(exp) :
    isDefineExp(exp) ? bind(l2ToJS(exp.val), (val: string) => makeOk(`const ${exp.var.var} = ${val}`)) :
    isProcExp(exp) ? bind(mapResult(l2ToJS, exp.body),
                          (body: string[]) =>
                                makeOk(`((${map(v => v.var, exp.args).join(",")}) => ${procBodyStringToJs(body)})`)) :
    isIfExp(exp) ? safe3((test: string, then: string, alt: string) => makeOk(`(${test} ? ${then} : ${alt})`))
                    (l2ToJS(exp.test), l2ToJS(exp.then), l2ToJS(exp.alt)) :
    isAppExp(exp) ?
        isPrimOp(exp.rator) ? bind(primAppToJS(exp.rator, exp.rands), (app: string) => makeOk(`(${app})`)) :
                              safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
                                (l2ToJS(exp.rator), mapResult(l2ToJS, exp.rands)) :
    makeFailure(`Unknown expression: ${exp}`);
