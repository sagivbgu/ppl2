import { ForExp, AppExp, Exp, Program, makeAppExp, makeProcExp, makeNumExp, isForExp, isExp, isProgram, makeProgram } from "./L21-ast";
import { Result, makeOk, bind, mapResult, makeFailure } from "../imp/result";
import { append, map } from 'ramda';

/*
 Signature: createNumsArray(start, end)
 Type: [number * number] => number[]
 Purpose: Create an array of integers starting from start until end (included)
 Pre-conditions: end >= start
 Tests: createNumsArray(1, 3) === [1, 2, 3]
*/
const createNumsArray = (start: number, end: number): number[] =>
    start === end ? [start] : append(end, createNumsArray(start, end - 1));

/*
Signature: for2app(exp)
Type: [ForExp] => AppExp
Purpose: convert an AST of ForExp to the equivalent AST of AppExp
Pre-conditions: None
Tests: @TODO
*/
export const for2app = (exp: ForExp): AppExp =>
    makeAppExp(         // create an AppExp
        makeProcExp(        // The operator is a procedure
            [],                 // with no parameters
            map(                // The body of the procedure is an array
                (x: number): AppExp => // each element is an AppExp
                makeAppExp(makeProcExp([exp.var], [exp.body]), [makeNumExp(x)]), // That applies the body of the for
                createNumsArray(exp.start.val, exp.end.val)))                    // on each number from start to end
        ,[]);               // The application has no operands

/*
Signature: for2app(exp)
Type: [Exp | Program] => Result<Exp | Program>
Purpose: Convert and L21 AST to the equivalent L2 AST
Pre-conditions: None
Tests: @TODO
*/
export const L21ToL2 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult((e: Exp): Result<Exp> => 
                                    isForExp(e) ? makeOk(for2app(e)) : makeOk(e)
                                    ,exp.exps)
                          ,(exps: Exp[]) => makeOk(makeProgram(exps))) :
    isForExp(exp) ? makeOk(for2app(exp)) :
    makeOk(exp);