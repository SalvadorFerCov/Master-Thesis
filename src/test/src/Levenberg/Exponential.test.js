const levenbergLibraryTest = require('../../functions/LevenbergRegression');

function initilizeRegressionParameters(damping, maxIterations, initialValues) {
    return {
        damping: damping,
        maxIterations: maxIterations,
        initialValues: initialValues,
        errorTolerance: 10e-3
    };
}

function initilizeRegressionData(dataLength, sampleFunction, initialValues) {
    var len = dataLength;
    var desiredFunction = sampleFunction(initialValues);
    var data = {
        x: new Array(len),
        y: new Array(len)
    };

    for (var i = 0; i < len; i++) {
        data.x[i] = i;
        data.y[i] = desiredFunction(i);
    }

    // console.log(data);
    return data;
}

function exponentialFunction([a, b]) {
    return (x) => a * Math.pow(b, x);
}

test('exponential regression test', () => {
    var options = initilizeRegressionParameters(0.0000001, 100, [1, 1.015]);
    var data = initilizeRegressionData(100, exponentialFunction, [5, 1.015]);
    var result = levenbergLibraryTest(options, data, exponentialFunction);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    // console.log(data.y);
    // console.log(result);

    expect(result).toBeDefined();
    expect(coefficients).toBeDefined();
    expect(error).toBeDefined();
});


