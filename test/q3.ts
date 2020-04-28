import { ForExp, AppExp, Exp, CExp, isCExp, Program, makeAppExp, makeProcExp, makeNumExp, 
         isForExp, isProgram, makeProgram, isDefineExp, isAppExp, isIfExp, isProcExp, 
         makeIfExp, makeDefineExp,
        makeForExp,  makeVarDecl, makePrimOp, makeVarRef} from "./L21-ast";
import { Result, makeOk, bind, mapResult, makeFailure, safe2 } from "../imp/result";
import { append, map } from 'ramda';

/*
 Signature: createNumsArray(start, end)
 Type: [number * number] => number[]
 Purpose: Create an array of integers starting from "start" until "end" (included)
 Pre-conditions: end >= start
 Tests: createNumsArray(1, 3) === [1, 2, 3]
*/
const createNumsArray = (start: number, end: number): number[] =>
    start === end ? [start] : append(end, createNumsArray(start, end - 1));

/*
Signature: for2app(exp)
Type: (exp: ForExp) => AppExp
Purpose: convert an AST of ForExp to the equivalent AST of AppExp
Pre-conditions: None
Tests:  for2app(makeForExp(
            makeVarDecl("i"),
            makeNumExp(1),
            makeNumExp(3),
            makeAppExp(makePrimOp("*"), [makeVarRef("i"), makeVarRef("i")])));
    
    deep equal to

        makeAppExp(makeProcExp([],[
            makeAppExp(makeProcExp(
                [makeVarDecl("i")], 
                [makeAppExp(makePrimOp("*"), [makeVarRef("i"), makeVarRef("i")])]), 
                [makeNumExp(1)]),
            makeAppExp(makeProcExp(
                [makeVarDecl("i")], 
                [makeAppExp(makePrimOp("*"), [makeVarRef("i"), makeVarRef("i")])]), 
                [makeNumExp(2)]),    
            makeAppExp(makeProcExp(
                [makeVarDecl("i")], 
                [makeAppExp(makePrimOp("*"), [makeVarRef("i"), makeVarRef("i")])]), 
                [makeNumExp(3)]),
                ]),[]);
*/
export const for2app = (exp: ForExp): AppExp =>
    makeAppExp(         // create an AppExp
        makeProcExp([],     // The operator is a procedure with no parameters
            map(                // The body of the procedure is an array
                (x: number): AppExp => // each element is an AppExp
                makeAppExp(makeProcExp([exp.var], [exp.body]), [makeNumExp(x)]), // That applies the body of the for
                createNumsArray(exp.start.val, exp.end.val)))                    // on each number from start to end
        ,[]);          // The application has no operands

/*
Signature: for2app(exp)
Type: [Exp | Program] => Result<Exp | Program>
Purpose: Convert and L21 AST to the equivalent L2 AST
Pre-conditions: None
Tests: @TODO
*/
export const L21ToL2 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult(convertExp, exp.exps),
                        (exps: Exp[]) => makeOk(makeProgram(exps))) :
    convertExp(exp);

/*
Signature: convertExpsArray(exps)
Type: [Exp[]] => Result<Exp[]>
Purpose: Convert each ForExp in the array to AppExp
Pre-conditions: None
Tests: @TODO
*/
const convertExp = (exp: Exp) : Result<Exp> =>
    isDefineExp(exp) ? bind(convertCExp(exp.val),
                            (value: CExp) => makeOk(makeDefineExp(exp.var, value))) :
    isCExp(exp) ? convertCExp(exp) : 
    makeFailure("Unknown Situation");
    
    /*
    makeOk(makeIfExp(test: convertExp(exp.test).value, 
                                    then: convertExp(exp.then),
                                    alt: convertExp(alt.then)))
    isProcExp(exp) ? convertExpsArray(exp.body) :
    isForExp(exp) ? convertExp(exp.body) :
    makeOk(exp); // stop of the recursion
c
*/
    
const convertCExp = (exp: CExp) : Result<CExp> =>
    isIfExp(exp) ? bind(mapResult(convertCExp, [exp.test, exp.then, exp.alt]),
                        (exps: CExp[]) => makeOk(makeIfExp(exps[0], exps[1], exps[2]))) : 
    isAppExp(exp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
                        (convertCExp(exp.rator), mapResult(convertCExp, exp.rands)) :
    isProcExp(exp) ? bind(mapResult(convertCExp, exp.body),
                        (exps: CExp[]) => makeOk(makeProcExp(exp.args, exps))) :
    isForExp(exp) ? convertCExp(for2app(exp)) : // this will convert all the ForExps in the program
    makeOk(exp);