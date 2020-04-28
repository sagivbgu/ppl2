import { Exp, Program, PrimOp, AppExp, isProgram, isBoolExp, isNumExp, isVarRef, isPrimOp, isDefineExp, isProcExp, isIfExp, isAppExp, CExp, makePrimOp, makeProcExp, makeAppExp } from "../imp/L2-ast";
import { Result, makeOk, makeFailure, mapResult, bind, safe3, safe2 } from "../imp/result";
import { rest, first, isEmpty, allT } from '../imp/list';
import { map, reduce } from "ramda";


//     <prim-op>  ::= + | - | * | / | < | > | = | not |  and | or | eq?
//                  number? | boolean? ##### L2
// TODO
const parsePrimOp = (op: string): Result<string> =>
    ["+", "-", "*", "/", "<", ">"].includes(op) ? makeOk(op) :
    op === "=" ? makeOk("===") :
    op === "not" ? makeOk("!") :
    op === "and" ? makeOk("&&") :
    op === "or" ? makeOk("||") :
    op === "eq?" ? makeOk("===") : // TODO: Check, maybe need to check nested code
    op === "number?" ? makeOk('typeof variable === "number"') : // TODO
    op === "boolean?" ? makeOk('typeof variable === "boolean"') : // TODO
    makeFailure("Can't parse unexpected PrimOp");

const equalityPrimToJS = (rator: string, rands: CExp[]): Result<string> =>
    isEmpty(rands) ? makeFailure(`${rator[0]} arity mismatch`) : // So that '===' becomes '='
    isEmpty(rest(rands)) ? makeOk("true") :
    // Build the expression 'rand1 < rand2 && rand2 < rand3 && ... && rand(n-1) < randn && randn' and then remove the last '&& randn'
    bind(mapResult((rand: CExp) => l2ToJS(rand), rands),
        (rands: string[]) =>
        {
            const result = reduce((acc: string, elem: string) =>
                acc.concat(` ${rator} ${elem} && ${elem}`), first(rands), rest(rands));
            return makeOk(result.slice(0, result.lastIndexOf("&&")).trim()); // Valid since all rands must be numbers
        });

const primAppToJS = (rator: PrimOp, rands: CExp[]): Result<string> =>
    rator.op === "+" ?
        isEmpty(rands) ? makeOk("0") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) : // TODO: Make sure, can also be `(+${l2ToJS(first(rands))})`
        bind(mapResult((rand: CExp) => l2ToJS(rand), rands), (rands: string[]) => makeOk(rands.join(" + "))) :

    rator.op === "-" ?
        isEmpty(rands) ? makeFailure("'-' arity mismatch") :
        isEmpty(rest(rands)) ? bind(l2ToJS(first(rands)), (rand: string) => makeOk(`-(${rand})`)) :
        // For each rand, if it's a negative number, wrap it in parentheses. Then, join all rands with ' - '.
        bind(mapResult(
                (rand: CExp) => bind(l2ToJS(rand), (rand: string) => rand.startsWith("-") ? makeOk(`(${rand})`) : makeOk(rand)),
                rands),
            (rands: string[]) => makeOk(rands.join(" - "))) :

    rator.op === "*" ?
        isEmpty(rands) ? makeOk("1") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) : // TODO: Make sure, can also be `1 * ${l2ToJS(first(rands))}`
        bind(mapResult((rand: CExp) => l2ToJS(rand), rands), (rands: string[]) => makeOk(rands.join(" * "))) :

    rator.op === "/" ?
        isEmpty(rands) ? makeFailure("'/' arity mismatch") :
        isEmpty(rest(rands)) ? bind(l2ToJS(first(rands)), (rand: string) => makeOk(`1 / ${rand}`)) :
        bind(mapResult((rand: CExp) => l2ToJS(rand), rands),
            (rands: string[]) => makeOk(rands.join(" / "))) :

    ["<", ">"].includes(rator.op) ? equalityPrimToJS(rator.op, rands) :
    rator.op === "=" ? equalityPrimToJS("===", rands) :
 
    rator.op === "not" ?
        isEmpty(rands) || !isEmpty(rest(rands)) ? makeFailure("'not' arity mismatch") :
        bind(l2ToJS(first(rands)), (rand: string) => makeOk(`${rand} === false`)) :
    
    rator.op === "and" ?
        isEmpty(rands) ? makeOk("true") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) :
        // Build the expression 'rand1 === false || rand2 === false || ... || randn === false ? false : randn'
        bind(mapResult((exp: AppExp) => l2ToJS(exp),
                map((rand: CExp) => makeAppExp(makePrimOp("not"), [rand]), rands)),
            (exps: string[]) => makeOk(exps.join(" || ").concat(` ? false : ${first(exps.slice(-1))}`))) :

    rator.op === "or" ?
        isEmpty(rands) ? makeOk("false") :
        isEmpty(rest(rands)) ? l2ToJS(first(rands)) :
        TODO

    // op === "and" ? makeOk("&&") :
    // op === "or" ? makeOk("||") :
    // op === "eq?" ? makeOk("===") : // TODO: Check, maybe need to check nested code
    // op === "number?" ? makeOk('typeof variable === "number"') : // TODO
    // op === "boolean?" ? makeOk('typeof variable === "boolean"') : // TODO

    makeFailure(`Invalid AppExp ${rator} ${rands}`);


const procBodyStringToJs = (body: string[]): string =>
    isEmpty(rest(body)) ?
    first(body) :
    `{${body.slice(0, -1).join("; ")}; return ${first(body.slice(-1))};}`;
//    `{${body.slice(0, -1).concat("return ".concat(first(body.slice(-1)))).join("; ")};}`;


/*
Purpose: @TODO
Signature: @TODO
Type: @TODO
*/
export const l2ToJS = (exp: Exp | Program): Result<string> => 
    isProgram(exp) ? bind(mapResult(l2ToJS, exp.exps), (exps: string[]) => makeOk(exps.join("\n"))) :
    isBoolExp(exp) ? makeOk(exp.val ? "true" : "false") :
    isNumExp(exp) ? makeOk(exp.val.toString()) :
    isVarRef(exp) ? makeOk(exp.var) :
    
    // TODO
    isPrimOp(exp) ? parsePrimOp(exp.op) :
    
    isDefineExp(exp) ? bind(l2ToJS(exp.val), (val: string) => makeOk(`const ${exp.var.var} = ${val};`)) :
    isProcExp(exp) ? bind(mapResult(l2ToJS, exp.body),
                          (body: string[]) =>
                                makeOk(`(${map(v => v.var, exp.args).join(",")}) => ${procBodyStringToJs(body)})`)) :
    
    isIfExp(exp) ? safe3((test: string, then: string, alt: string) => makeOk(`${test} ? ${then} : ${alt};`))
                    (l2ToJS(exp.test), l2ToJS(exp.then), l2ToJS(exp.alt)) :
    
    // TODO
    isAppExp(exp) ? isPrimOp(exp.rator) ?
                                        primAppToJS(exp.rator, exp.rands) :
                                        safe2((rator: string, rands: string[]) => makeOk(`${rator}(${rands.join(",")})`))
                                           (l2ToJS(exp.rator), mapResult(l2ToJS, exp.rands)) :

    makeFailure(`Unknown expression: ${exp}`);
