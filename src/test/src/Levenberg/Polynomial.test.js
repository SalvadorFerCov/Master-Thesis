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

function linearFunction([a, b]) {
    return (x) => a * x + b;
}

test('polynomial regression test', () => {
    var options = initilizeRegressionParameters(0.001, 100, [1, 1]);
    var data = initilizeRegressionData(100, linearFunction, [1, 1]);
    var result = levenbergLibraryTest(options, data, linearFunction);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    expect(result).toBeDefined();
    expect(coefficients).toBeDefined();
    expect(error).toBeDefined();
});


