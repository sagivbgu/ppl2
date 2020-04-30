import { ForExp, AppExp, Exp, CExp, isCExp, Program, makeAppExp, makeProcExp, makeNumExp, 
         isForExp, isProgram, makeProgram, isDefineExp, isAppExp, isIfExp, isProcExp, 
         makeIfExp, makeDefineExp} from "./L21-ast";
import { Result, makeOk, bind, mapResult, makeFailure, safe2 } from "../imp/result";
import { map, range } from 'ramda';

/*
Signature: for2app(exp)
Type: [ForExp -> AppExp]
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
export const for2app = (exp: ForExp): AppExp => {
    const procBody = map((x: number): AppExp => 
                        makeAppExp(makeProcExp([exp.var], [exp.body]), [makeNumExp(x)]),
                        range(exp.start.val, exp.end.val + 1)); // the body of the proc is AppExps each applies
                                                                // a ProcExp with the same body of the ForExp 
                                                                // on each number in the array [start, ... , end]

    return makeAppExp(makeProcExp([], procBody) // Finally, create an AppExp applying this ProcExp
                      ,[]);                     // the AppExp has no operands
}

/*
Signature: L21ToL2(exp)
Type: [Exp | Program -> Result(Exp | Program)]
Purpose: Convert an L21 AST to the equivalent L2 AST (without ForExp)
Pre-conditions: None
Tests: (L21 ((lambda (x) (* x x)) (+ 5 4)) (if (> y 6) 8 (for i 1 3 (* i i)))) ===
       (L21 ((lambda (x) (* x x)) (+ 5 4)) (if (> y 6) 8 ((lambda () ((lambda (i) (* i i)) 1) 
                                                                     ((lambda (i) (* i i)) 2) 
                                                                     ((lambda (i) (* i i)) 3)) )))
*/
export const L21ToL2 = (exp: Exp | Program): Result<Exp | Program> =>
    isProgram(exp) ? bind(mapResult(convertExp, exp.exps),
                        (exps: Exp[]) => makeOk(makeProgram(exps))) :
    convertExp(exp);

/*
Signature: convertExp(exp)
Type: [Exp -> Result(Exp)]
Purpose: Convert an Exp in L21 to the equivalent Exp in L2
Pre-conditions: None
Tests: the same as L21ToL2
*/
const convertExp = (exp: Exp) : Result<Exp> =>
    isDefineExp(exp) ? bind(convertCExp(exp.val),
                            (value: CExp) => makeOk(makeDefineExp(exp.var, value))) :
    isCExp(exp) ? convertCExp(exp) : 
    makeFailure("Unknown Situation");

/*
Signature: convertCExp(exp)
Type: [CExp -> Result(CExp)]
Purpose: Convert a CExp in L21 to the equivalent CExp in L2
Pre-conditions: None
Tests: the same as L21ToL2
*/
const convertCExp = (exp: CExp) : Result<CExp> =>
    isIfExp(exp) ? bind(mapResult(convertCExp, [exp.test, exp.then, exp.alt]),
                        (exps: CExp[]) => makeOk(makeIfExp(exps[0], exps[1], exps[2]))) : 
    isAppExp(exp) ? safe2((rator: CExp, rands: CExp[]) => makeOk(makeAppExp(rator, rands)))
                        (convertCExp(exp.rator), mapResult(convertCExp, exp.rands)) :
    isProcExp(exp) ? bind(mapResult(convertCExp, exp.body),
                        (exps: CExp[]) => makeOk(makeProcExp(exp.args, exps))) :
    isForExp(exp) ? convertCExp(for2app(exp)) : // this will convert all the ForExps in the program
    makeOk(exp); // All AtomicExps are fine