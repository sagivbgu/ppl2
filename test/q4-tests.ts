import { expect } from 'chai';
import { parseL2, parseL2Exp } from '../imp/L2-ast';
import { l2ToJS } from './q4';
import { bind, Result, makeOk, isFailure } from '../imp/result';
import { parse as p } from "../imp/parser";

const l2toJSResult = (x: string): Result<string> =>
    bind(bind(p(x), parseL2Exp), l2ToJS);

describe('Q4 Tests', () => {
    it('parses primitive ops', () => {
        expect(l2toJSResult(`(+ 3 5 7)`)).to.deep.equal(makeOk(`(3 + 5 + 7)`));
        expect(l2toJSResult(`(= 3 (+ 1 2))`)).to.deep.equal(makeOk(`(3 === (1 + 2))`));
    });
    
    it('parses primitive ops (extra cases)', () => {   
        expect(l2toJSResult(`(eq? 3 (* 1 2 3))`)).to.deep.equal(makeOk(`(3 === (1 * 2 * 3))`));
        expect(l2toJSResult(`(+ (+ ) (* ))`)).to.deep.equal(makeOk(`((0) + (1))`));
        expect(l2toJSResult(`(- -3 5 -7)`)).to.deep.equal(makeOk(`((-3) - 5 - (-7))`));
        expect(l2toJSResult(`(- 3 -5 7)`)).to.deep.equal(makeOk(`(3 - (-5) - 7)`));
    });

    it('parses arithmetic primitive ops', () => {
        expect(l2toJSResult(`(+ 3)`)).to.deep.equal(makeOk(`(3)`));
        expect(l2toJSResult(`(- 3)`)).to.deep.equal(makeOk(`(-3)`));
        expect(l2toJSResult(`(- -3)`)).to.deep.equal(makeOk(`(-(-3))`));
        expect(l2toJSResult(`(* 3)`)).to.deep.equal(makeOk(`(3)`));
        expect(l2toJSResult(`(/ 3)`)).to.deep.equal(makeOk(`(1 / 3)`));

        expect(l2toJSResult(`(- )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(/ )`)).to.satisfy(isFailure);
    });

    it('parses predicate primitive ops', () => {
        expect(l2toJSResult(`(and )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(and #t)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(and #f)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(and #f #t)`)).to.deep.equal(makeOk(`(false && true)`));
        expect(l2toJSResult(`(and (> 1 2) #t)`)).to.deep.equal(makeOk(`((1 > 2) && true)`));
        expect(l2toJSResult(`(and #f #t #t)`)).to.deep.equal(makeOk(`(false && true)`));

        expect(l2toJSResult(`(or )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(or #f)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(or #t)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(or (< 1 2) #t)`)).to.deep.equal(makeOk(`((1 < 2) || true)`));
        expect(l2toJSResult(`(or #f #t)`)).to.deep.equal(makeOk(`(false || true)`));
        expect(l2toJSResult(`(or #f #t #f)`)).to.deep.equal(makeOk(`(false || true)`));
    });

    it('parses equality primitive ops', () => {
        expect(l2toJSResult(`(< )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(< 1)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(< 1 2)`)).to.deep.equal(makeOk(`(1 < 2)`));
        expect(l2toJSResult(`(< 1 2 3)`)).to.deep.equal(makeOk(`(1 < 2)`));
        expect(l2toJSResult(`(> )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(> 1)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(> 1 2)`)).to.deep.equal(makeOk(`(1 > 2)`));
        expect(l2toJSResult(`(> 1 2 3)`)).to.deep.equal(makeOk(`(1 > 2)`));
        expect(l2toJSResult(`(= )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(= 1)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(= 1 2)`)).to.deep.equal(makeOk(`(1 === 2)`));
        expect(l2toJSResult(`(= 1 2 3)`)).to.deep.equal(makeOk(`(1 === 2)`));
        expect(l2toJSResult(`(eq? )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(eq? 1)`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(eq? 1 2)`)).to.deep.equal(makeOk(`(1 === 2)`));
        expect(l2toJSResult(`(eq? 1 2 3)`)).to.deep.equal(makeOk(`(1 === 2)`));
    });

    it('parses "not" primitive ops', () => {
        expect(l2toJSResult(`(not )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(not #t)`)).to.deep.equal(makeOk(`(!true)`));
        expect(l2toJSResult(`(not (lambda (x) (= 1 x)))`)).to.deep.equal(makeOk(`(!((x) => (1 === x)))`));
        expect(l2toJSResult(`(not #t #f )`)).to.deep.equal(makeOk(`(!true)`));
    });

    it('parses "number?" primitive ops', () => {
        expect(l2toJSResult(`(number? )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(number? -1)`)).to.deep.equal(makeOk(`(typeof -1 === "number")`));
        expect(l2toJSResult(`(number? #f)`)).to.deep.equal(makeOk(`(typeof false === "number")`));
        expect(l2toJSResult(`(number? 1 2)`)).to.deep.equal(makeOk(`(typeof 1 === "number")`));
    });

    it('parses "boolean?" primitive ops', () => {
        expect(l2toJSResult(`(boolean? )`)).to.satisfy(isFailure);
        expect(l2toJSResult(`(boolean? -1)`)).to.deep.equal(makeOk(`(typeof -1 === "boolean")`));
        expect(l2toJSResult(`(boolean? #f)`)).to.deep.equal(makeOk(`(typeof false === "boolean")`));
        expect(l2toJSResult(`(boolean? 1 2)`)).to.deep.equal(makeOk(`(typeof 1 === "boolean")`));
    });

    it('parses primitive ops without application', () => {
        expect(l2toJSResult(`+`)).to.deep.equal(makeOk(`+`));
        expect(l2toJSResult(`-`)).to.deep.equal(makeOk(`-`));
        expect(l2toJSResult(`*`)).to.deep.equal(makeOk(`*`));
        expect(l2toJSResult(`/`)).to.deep.equal(makeOk(`/`));
        expect(l2toJSResult(`and`)).to.deep.equal(makeOk(`&&`));
        expect(l2toJSResult(`or`)).to.deep.equal(makeOk(`||`));
        expect(l2toJSResult(`<`)).to.deep.equal(makeOk(`<`));
        expect(l2toJSResult(`>`)).to.deep.equal(makeOk(`>`));
        expect(l2toJSResult(`=`)).to.deep.equal(makeOk(`===`));
        expect(l2toJSResult(`eq?`)).to.deep.equal(makeOk(`===`));
        expect(l2toJSResult(`not`)).to.deep.equal(makeOk(`!`));
        expect(l2toJSResult(`number?`)).to.deep.equal(makeOk(`((x) => typeof x === "number")`));
        expect(l2toJSResult(`boolean?`)).to.deep.equal(makeOk(`((x) => typeof x === "boolean")`));
    });

    it('parses "if" expressions', () => {
        expect(l2toJSResult(`(if (> x 3) 4 5)`)).to.deep.equal(makeOk(`((x > 3) ? 4 : 5)`));
    });

    it('parses "lambda" expressions', () => {
        expect(l2toJSResult(`(lambda (x y) (* x y))`)).to.deep.equal(makeOk(`((x,y) => (x * y))`));
        expect(l2toJSResult(`((lambda (x y) (* x y)) 3 4)`)).to.deep.equal(makeOk(`((x,y) => (x * y))(3,4)`));
        
        expect(l2toJSResult(`(lambda () (* 1 2))`)).to.deep.equal(makeOk(`(() => (1 * 2))`));
        expect(l2toJSResult(`((lambda () (* 1 2)))`)).to.deep.equal(makeOk(`(() => (1 * 2))()`));
        expect(l2toJSResult(`((lambda (x y z) (* x y z)) 3 4 5)`)).to.deep.equal(makeOk(`((x,y,z) => (x * y * z))(3,4,5)`));
    });
    
    it("defines constants", () => {
        expect(l2toJSResult(`(define pi 3.14)`)).to.deep.equal(makeOk(`const pi = 3.14`));
    });

    it("defines functions", () => {
        expect(l2toJSResult(`(define f (lambda (x y) (* x y)))`)).to.deep.equal(makeOk(`const f = ((x,y) => (x * y))`));
    });

    it("applies user-defined functions", () => {
        expect(l2toJSResult(`(f )`)).to.deep.equal(makeOk(`f()`));
        expect(l2toJSResult(`(f 3)`)).to.deep.equal(makeOk(`f(3)`));
        expect(l2toJSResult(`(f 3 4)`)).to.deep.equal(makeOk(`f(3,4)`));
        expect(l2toJSResult(`(f 3 4 5)`)).to.deep.equal(makeOk(`f(3,4,5)`));
    });

    it("parses functions with multiple body expressions", () => {
        expect(l2toJSResult(`(define g (lambda (x y) (+ x 2) (- y 3) (* x y)))`)).to.deep.equal(makeOk(`const g = ((x,y) => {(x + 2); (y - 3); return (x * y);})`));
    });

    it('parses programs', () => {
        expect(bind(parseL2(`(L2 (define b (> 3 4)) (define x 5) (define f (lambda (y) (+ x y))) (define g (lambda (y) (* x y))) (if (not b) (f 3) (g 4)) ((lambda (x) (* x x)) 7))`), l2ToJS)).to.deep.equal(makeOk(`const b = (3 > 4);\nconst x = 5;\nconst f = ((y) => (x + y));\nconst g = ((y) => (x * y));\n((!b) ? f(3) : g(4));\nconsole.log(((x) => (x * x))(7));`));
        expect(bind(parseL2(`(L2 #t)`), l2ToJS)).to.deep.equal(makeOk(`console.log(true);`));
        expect(bind(parseL2(`(L2 (+ 1 2))`), l2ToJS)).to.deep.equal(makeOk(`console.log((1 + 2));`));
        expect(bind(parseL2(`(L2 (define x 9) (+ 1 2))`), l2ToJS)).to.deep.equal(makeOk(`const x = 9;\nconsole.log((1 + 2));`));
    });

    it('parses primitives', () => {
        expect(l2toJSResult(`2`)).to.deep.equal(makeOk(`2`));
        expect(l2toJSResult(`-2`)).to.deep.equal(makeOk(`-2`));
        expect(l2toJSResult(`#t`)).to.deep.equal(makeOk(`true`));
        expect(l2toJSResult(`#f`)).to.deep.equal(makeOk(`false`));
        expect(l2toJSResult(`v`)).to.deep.equal(makeOk(`v`)); // varRef
        expect(l2toJSResult(`variable1`)).to.deep.equal(makeOk(`variable1`)); // varRef
    });
});



