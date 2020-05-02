import { expect } from 'chai';
import { parseL21, parseL21Exp, Exp, Program } from './L21-ast';
import { L21ToL2 } from './q3';
import { unparseL21 } from './L21-unparse';
import { Result, bind, isFailure, makeOk } from '../imp/result';
import { parse as p } from "../imp/parser";

const L21toL2Result = (x: string): Result<Exp | Program> =>
    bind(bind(p(x), parseL21Exp), L21ToL2);

describe('Q3 Tests', () => {
    it('fails when body is empty', () => {
        expect(L21toL2Result(`(for i 1 2 ())`)).to.satisfy(isFailure);
    });

    it('fails when there is no body', () => {
        expect(L21toL2Result(`(for i 1 2 )`)).to.satisfy(isFailure);
    });

    it('fails when start is larger than end', () => {
        expect(L21toL2Result(`(for i 4 2 (* i i))`)).to.satisfy(isFailure);
    });

    it('fails when given an AppExp for "end"', () => {
        expect(L21toL2Result(`(for i 1 (+ 2 2) (* i i))`)).to.satisfy(isFailure);
    });

    it('fails when given a NumExp instead of a VarDecl loop variable', () => {
        expect(L21toL2Result(`(for 3 1 2 (* i i))`)).to.satisfy(isFailure);
    });

    it('fails when there is more than one body expression', () => {
        expect(L21toL2Result(`(for i 1 2 (+ i i) (* i i))`)).to.satisfy(isFailure);
    });

    it('test 0 - one iteration', () => {
        expect(bind(bind(bind(p(`(for i 1 1 (* i i))`), parseL21Exp), L21ToL2), unparseL21)).to.deep.equal(makeOk(`((lambda () ((lambda (i) (* i i)) 1)) )`));
    });

    it('test 1 - three iterations', () => {
        expect(bind(bind(bind(p(`(for i 1 3 (* i i))`), parseL21Exp), L21ToL2), unparseL21)).to.deep.equal(makeOk(`((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )`));
    });

    it('test 2 - for in the body of a ProcExp', () => {
        expect(bind(bind(parseL21(`(L21 ((lambda (x) (* x x)) (+ 5 4)) (if (> y 6) 8 (for i 1 3 (* i i))))`), L21ToL2), unparseL21)).to.deep.equal(makeOk(`(L21 ((lambda (x) (* x x)) (+ 5 4)) (if (> y 6) 8 ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )))`));
    });

    it('test 3', () => {
        expect(bind(bind(parseL21(`(L21 ((lambda (x) (for i 1 3 (* i i))) 4) (if (> y 6) 8 (for i 1 3 (* i i))))`), L21ToL2), unparseL21))
        .to.deep.equal(makeOk(`(L21 ((lambda (x) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) 4) (if (> y 6) 8 ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )))`));
    });

    it('test 4', () => {
        expect(bind(bind(parseL21(`(L21 ((lambda (x) (* x x)) (for i 1 3 (* i i))) (if (> y 6) 8 (for i 1 3 (for i 1 3 (* i i)))))`), L21ToL2), unparseL21))
        .to.deep.equal(makeOk(`(L21 ((lambda (x) (* x x)) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) (if (> y 6) 8 ((lambda () ((lambda (i) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) 1) ((lambda (i) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) 2) ((lambda (i) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) 3)) )))`));
    });

    it('test 5', () => {
        expect(bind(bind(parseL21(`(L21 (define f (for i 1 3 (* i i))) (f))`), L21ToL2), unparseL21))
        .to.deep.equal(makeOk(`(L21 (define f ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) )) (f ))`));
    });

    it('test 6', () => {
        expect(bind(bind(parseL21(`(L21 (define f ((lambda (x) (if (> x 2) (for i 1 3 (* i i)) 3)) (for i 1 3 (* i i)))) (f))`), L21ToL2), unparseL21))
        .to.deep.equal(makeOk(`(L21 (define f ((lambda (x) (if (> x 2) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) ) 3)) ((lambda () ((lambda (i) (* i i)) 1) ((lambda (i) (* i i)) 2) ((lambda (i) (* i i)) 3)) ))) (f ))`));
    });
});

