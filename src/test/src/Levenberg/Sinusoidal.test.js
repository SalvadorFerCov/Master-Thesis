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

function sineFunction([a, b, c]) {
    return (x) => a * Math.sin(b * x + c);
}

test('sine regression test', () => {
    var options = initilizeRegressionParameters(0.0000001, 100, [1, 1, 1]);
    var data = initilizeRegressionData(1000, sineFunction, [1, 1.1, 1]);
    var result = levenbergLibraryTest(options, data, sineFunction);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    // console.log(data.y)
    // console.log(result);

    expect(result).toBeDefined();
    expect(coefficients).toBeDefined();
    expect(error).toBeDefined();
});

function sineFunction([a, b, c]) {
    return (x) => a * Math.sin(b * x + c);
}

test('sine regression wrong guess test', () => {
    var options = initilizeRegressionParameters(0.0000001, 100, [1, 1, 1]);
    var data = initilizeRegressionData(100, sineFunction, [100, 1, 1]);
    var result = levenbergLibraryTest(options, data, sineFunction);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    // console.log(result);

    expect(error).toBeLessThanOrEqual(1);
});

test('negative sine regression test', () => {
    var counter = 0;
    var increase = Math.PI * 2 / 100;
    var x, y;
    var xArray = new Array();
    var yArray = new Array();

    for (var i = 0; i <= 1; i += 0.01) {
        x = i;
        // y = Math.abs(Math.sin(counter));
        y = Math.sin(counter);
        counter += increase;
        // console.log(y);
        xArray.push(x);
        yArray.push(y);
    }

    let levenbergData = {
        x: xArray,
        y: yArray
    };

    // console.log(levenbergData.y);

    var options = initilizeRegressionParameters(0.1, 100, [1, 1, 1]);
    // var data = initilizeRegressionData(100, sineFunction, [1, 1, 1]);
    var result = levenbergLibraryTest(options, levenbergData, sineFunction);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    // console.log(result);

    expect(error).toBeLessThanOrEqual(1);

    // console.log('SINE GENERATOR');
    // console.log(levenbergData);

});

function exponentialSineFunction([a, b, c, d]) {
    return (x) => a * Math.pow(Math.sin((b * x) + c), Math.round(d));
}

test('exponential sine regression test', () => {
    var options = initilizeRegressionParameters(0.0000001, 100, [1, 1, 1, 1]);
    var data = initilizeRegressionData(125, exponentialSineFunction, [1, 2, 1, 1]);
    var result = levenbergLibraryTest(options, data, exponentialSineFunction);

    // console.log(data.y)
    // console.log(result);

    var coefficients = result.parameterValues;
    var error = result.parameterError;

    expect(result).toBeDefined();
    expect(coefficients).toBeDefined();
    expect(error).toBeDefined();
});


