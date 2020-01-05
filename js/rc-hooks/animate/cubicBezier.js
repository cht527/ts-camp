"use strict";
/*
 * @Author: your name
 * @Date: 2019-09-28 00:23:56
 * @LastEditTime: 2019-12-11 14:56:36
 * @LastEditors: your name
 * @Description: In User Settings Edit
 * @FilePath: /ts-learning/rc-hooks/animate/cubicBezier.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ZERO_LIMIT = 1e-6;
// 三阶公式: B(t) = P0*(1-t)^3 + 3P1*t*(1-t)^2 + 3P2*t^2*(1-t) + P3*t^3
function cubicBezier(x1, y1, x2, y2) {
    // Calculate the polynomial coefficients,
    // implicit first and last control points are (0,0) and (1,1).
    let ax = 3 * x1 - 3 * x2 + 1;
    let bx = 3 * x2 - 6 * x1;
    let cx = 3 * x1;
    let ay = 3 * y1 - 3 * y2 + 1;
    let by = 3 * y2 - 6 * y1;
    let cy = 3 * y1;
    function sampleCurveDerivativeX(time) {
        // `ax t^3 + bx t^2 + cx t' expanded using Horner 's rule.
        return (3 * ax * time + 2 * bx) * time + cx;
    }
    function sampleCurveX(time) {
        return ((ax * time + bx) * time + cx) * time;
    }
    function sampleCurveY(time) {
        return ((ay * time + by) * time + cy) * time;
    }
    // Given an x value, find a parametric value it came from.
    function solveCurveX(x) {
        let t2 = x;
        let derivative;
        let x2;
        // https://trac.webkit.org/browser/trunk/Source/WebCore/platform/animation
        // First try a few iterations of Newton's method -- normally very fast.
        // http://en.wikipedia.org/wiki/Newton's_method
        for (let i = 0; i < 8; i++) {
            // f(t)-x=0
            x2 = sampleCurveX(t2) - x;
            if (Math.abs(x2) < ZERO_LIMIT) {
                return t2;
            }
            derivative = sampleCurveDerivativeX(t2);
            // == 0, failure
            if (Math.abs(derivative) < ZERO_LIMIT) {
                break;
            }
            t2 -= x2 / derivative;
        }
        // Fall back to the bisection method for reliability.
        // bisection
        // http://en.wikipedia.org/wiki/Bisection_method
        let t1 = 1;
        let t0 = 0;
        t2 = x;
        while (t1 > t0) {
            x2 = sampleCurveX(t2) - x;
            if (Math.abs(x2) < ZERO_LIMIT) {
                return t2;
            }
            if (x2 > 0) {
                t1 = t2;
            }
            else {
                t0 = t2;
            }
            t2 = (t1 + t0) / 2;
        }
        // Failure
        return t2;
    }
    return function (x) {
        return sampleCurveY(solveCurveX(x));
    };
}
exports.cubicBezier = cubicBezier;
exports.linear = cubicBezier(0, 0, 1, 1);
exports.ease = cubicBezier(.25, .1, .25, 1);
exports.easeIn = cubicBezier(.42, 0, 1, 1);
exports.easeOut = cubicBezier(0, 0, .58, 1);
exports.easeInOut = cubicBezier(.42, 0, .58, 1);
