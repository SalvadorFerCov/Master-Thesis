import math from 'mathjs';

const levenbergMarquardt = require('ml-levenberg-marquardt');
const functionParser = math.parser();

class Levenberg {

    constructor(name) {
        this.name = name;
        this.errorThreshold = 0.01;
    }

    regression(data) {
        var regressions = new Array();
        var regressionErrors = new Array();

        const options = {
            damping: 0.0000001,
            maxIterations: 100,
            errorTolerance: 10e-3,
            minValues: [1, 1]
        };

        // console.log('observed data')
        // console.log(data);

        var linearRegression = this.levenbergLinearRegression(data, options);
        if (linearRegression.result.parameterError <= this.errorThreshold)
            return linearRegression;
        else {
            // console.log('regressions under error threshold');
            // console.log(linearRegression);
            return null;
        }


        // regressions.push(this.levenbergLinearRegression(data, options));
        // regressions.push(this.levenbergQuadraticRegression(data, options));
        // regressions.push(this.levenbergCubicRegression(data, options));
        // regressions.push(this.levenbergSinusoidalRegression(data, options));
        // regressions.push(this.levenbergExponentialSinusoidalRegression(data, options));
        // regressions.push(this.levenbergExponentialRegression(data, options));

        // // Reference for buffer size adjustment
        // var error;

        // regressions.forEach(regression => {
        //     error = regression.result.parameterError;
        //     if (!isNaN(error))
        //         regressionErrors.push(error);
        // });

        // var bestRegression = this.getRegressionWithLeastError(regressionErrors, regressions);

        // console.log(regressions)
        // console.log(bestRegression)

        // return bestRegression;
    }

    getRegressionWithLeastError(errorArray, regressionArray) {
        var minError = Math.min(...errorArray);

        var bestRegression = regressionArray.find((regression) => {
            return regression.result.parameterError == minError;
        });

        // console.log(bestRegression);

        return bestRegression;
    }

    linearFunction([a, b]) {
        return (x) => a * x + b;
    }

    levenbergLinearRegression(data, options) {
        options.initialValues = [1, 1];
        options.minValues = [0, 0];
        var regression = levenbergMarquardt(data, this.linearFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + 'x +' + coefficients[1];
        var linearRegressionJson = { type: 'LINEAR', function: "f(x) = ax + b", evalFunction: evalFunction, result: regression };
        return linearRegressionJson;
    }

    quadraticFunction([a, b, c]) {
        return (x) => a * Math.pow(x, 2) + b * x + c;
    }

    levenbergQuadraticRegression(data, options) {
        options.initialValues = [1, 1, 1];
        var regression = levenbergMarquardt(data, this.quadraticFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + 'x^2 +' + coefficients[1] + 'x +' + coefficients[2];

        var quadraticRegressionJson = { type: 'QUADRATIC', function: "f(x) = ax^2 + bx + c", evalFunction: evalFunction, result: regression };
        return quadraticRegressionJson;
    }

    cubicFunction([a, b, c, d]) {
        return (x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d;
    }

    levenbergCubicRegression(data, options) {
        options.initialValues = [1, 1, 1, 1];
        var regression = levenbergMarquardt(data, this.cubicFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + 'x^3 +' + coefficients[1] + 'x^2 +' + coefficients[2] + 'x +' + coefficients[3];

        var cubiRegressionJson = { type: 'CUBIC', function: "f(x) = ax^3 + bx^2 + cx + d", evalFunction: evalFunction, result: regression };
        return cubiRegressionJson;
    }

    sineFunction([a, b, c]) {
        return (x) => a * Math.sin(b * x + c);
    }

    estimateSinusoidalParameters(dataPoints) {
        var peakValues = new Array();
        var peakTimes = new Array();
        var previousValue;
        var currentValue;
        var nextValue;
        var maxValue = Number.MIN_VALUE;
        var minValue = Number.MAX_VALUE;

        for (var i = 1; i < dataPoints.y.length - 1; i++) {
            previousValue = Number(dataPoints.y[i - 1]);
            currentValue = Number(dataPoints.y[i]);
            nextValue = Number(dataPoints.y[i + 1]);
            maxValue = Math.max(maxValue, currentValue);
            minValue = Math.min(minValue, currentValue);

            if ((currentValue > previousValue) && (currentValue >= nextValue) && (Math.round(currentValue) != 0)) {
                peakValues.push(currentValue);
                peakTimes.push(dataPoints.x[i]);
            }
        }

        // console.log('VALUES AND TIMES');
        // console.log(peakValues, peakTimes);

        var timeDistAvg = 0;
        var acumDistance = 0;
        var distance;

        for (var i = 1; i < peakTimes.length; i++) {
            previousValue = peakTimes[i - 1];
            currentValue = peakTimes[i];
            distance = currentValue - previousValue;
            acumDistance += distance;
        }

        // console.log(acumDistance);
        timeDistAvg = acumDistance / (peakTimes.length - 1);

        // console.log('TIMES AVG');
        // console.log(timeDistAvg)

        var amp = (maxValue - minValue) / 2;
        var omega = 2 * Math.PI * (1 / timeDistAvg);
        var firstPeakTime = peakTimes[0];
        var firstPeakPhase = ((firstPeakTime * omega) % (2 * Math.PI)) - 0.5 * Math.PI;
        var shift = firstPeakPhase;

        return { amp: amp, omega: omega, shift: shift }

    }

    levenbergSinusoidalRegression(data, options) {
        options.initialValues = [1, 1, 1];
        var sineParameters = this.estimateSinusoidalParameters(data);
        // console.log(sineParameters);
        options.initialValues = [sineParameters.amp, sineParameters.omega, sineParameters.shift];
        var regression = levenbergMarquardt(data, this.sineFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + '* sin(' + coefficients[1] + 'x + ' + coefficients[2] + ')';
        var sineRegressionJson = { type: 'SINUSOIDAL', function: "f(x) = a * sin(b*x+c)", evalFunction: evalFunction, result: regression };
        return sineRegressionJson;
    }

    exponentialSineFunction([a, b, c, d]) {
        return (x) => a * Math.pow(Math.sin(b * x + c), Math.round(d));
    }

    levenbergExponentialSinusoidalRegression(data, options) {
        options.initialValues = [1, 1, 1, 5];
        var sineParameters = this.estimateSinusoidalParameters(data);
        // console.log(sineParameters);
        options.initialValues = [sineParameters.amp, sineParameters.omega, sineParameters.shift, 5];
        var regression = levenbergMarquardt(data, this.exponentialSineFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + '* sin(' + coefficients[1] + 'x + ' + coefficients[2] + ')^' + coefficients[3];
        var exponentialSineRegressionJson = { type: 'EXPONENTIAL SINUSOIDAL', function: "f(x) = a * (sin(b*x+c))^5", evalFunction: evalFunction, result: regression };
        return exponentialSineRegressionJson;
    }

    exponentialFunction([a, b]) {
        return (x) => a * Math.pow(b, x);
    }

    levenbergExponentialRegression(data, options) {
        options.initialValues = [5, 1];
        var regression = levenbergMarquardt(data, this.exponentialFunction, options);
        var coefficients = regression.parameterValues;
        var evalFunction = 'x = ' + coefficients[0] + ' * (' + coefficients[1] + '^x)';
        var exponentialRegressionJson = { type: 'EXPONENTIAL', function: "f(x) = a * (b^x)", evalFunction: evalFunction, result: regression };
        return exponentialRegressionJson;
    }
}

export default Levenberg;