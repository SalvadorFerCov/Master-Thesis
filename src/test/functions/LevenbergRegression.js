function levenbergRegressionLib(options, data, sampleFunction) {
    const levenbergMarquardt = require('ml-levenberg-marquardt');

    var regression = levenbergMarquardt(data, sampleFunction, options);

    return regression;
}

module.exports = levenbergRegressionLib;
