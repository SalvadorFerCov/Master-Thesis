import React, { Component } from 'react';
import math from 'mathjs';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import { bindActionCreators } from 'redux';
import { regressionReportAction, evaluationReportAction, fitAction, fittedEquationsAction, bufferReportAction } from '../actions/actions';
import { connect } from 'react-redux';
import { array } from 'prop-types';
import Levenberg from '../classes/Levenberg';

class Regression extends Component {

    constructor(props) {
        super(props);

        //Internal Methods
        this.initializeBuffer = this.initializeBuffer.bind(this);
        this.bufferSizeAdjustment = this.bufferSizeAdjustment.bind(this);
        this.getClosestTimeValue = this.getClosestTimeValue.bind(this);
        this.getObservedPoints = this.getObservedPoints.bind(this);
        this.evaluateCurrentFittedFunction = this.evaluateCurrentFittedFunction.bind(this);
        this.fit = this.fit.bind(this);
        this.slideBuffer = this.slideBuffer.bind(this);
        this.renderItems = this.renderItems.bind(this);
        this.formatSecondaryText = this.formatSecondaryText.bind(this);
        this.formatPrimaryText = this.formatPrimaryText.bind(this);
        this.simulationNumber;

        //Services
        this.levenberg = new Levenberg('levenberg');

        //Internal Structures
        this.dataTimeValues;
        this.fittedEquations = new Array();
        this.evaluationReport = new Array();
        this.regressionReport = new Array();
        this.bufferReport = { bufferSize: new Array(), regression: new Array(), passed: new Array(), bufferThreshold: new Array(), errorThreshold: new Array() };
        this.dataMap;
        this.arrayOfEquations = [];

        this.standardThreshold = 0.01;
        this.errorThreshold = 0.01;
        this.bufferMinSize = 4;
        this.currentRegressions = new Array();

        this.state = {
            data: "",
            levenberg: "",
            equations: []
        };
    }

    componentDidMount() {
        if (this.props.dataMap != null && this.props.doFittingRoutine == true) {
            this.props.dataMap.forEach((dataMap, index) => {
                this.simulationNumber = index;
                this.dataMap = dataMap;
                this.initializeBuffer(this.fit);
            })

            this.props.fittedEquationsAction(this.arrayOfEquations);
            this.props.evaluationReportAction(this.evaluationReport);
            this.props.regressionReportAction(this.regressionReport);
            // this.props.bufferReportAction(this.bufferReport);
            this.props.fitAction(false);
        }
    }

    initializeBuffer(callback) {
        var bufferKeys = Array.from(this.dataMap.keys());
        // console.log(bufferKeys)
        this.dataTimeValues = bufferKeys;
        var dataMap = this.dataMap;
        var buffer = new Map();
        var bufferSize = this.props.bufferSize;
        var timeStep = Number(this.props.timeStep);
        var time = Number(bufferKeys[0]);
        var flooredValue;
        var lastValue = "";

        for (var i = 0; i < bufferSize; i++) {
            flooredValue = this.getClosestTimeValue(time);
            lastValue = dataMap.get(flooredValue);
            buffer.set(flooredValue, lastValue);
            time += timeStep;
        }

        // for (var i = 0; i < bufferSize; i++) {
        //     flooredValue = this.getClosestTimeValue(time);
        //     if (flooredValue == lastValue) {
        //         var slidingTime = time;
        //         while (flooredValue == lastValue) {
        //             slidingTime += timeStep;
        //             flooredValue = this.getClosestTimeValue(slidingTime);
        //         }
        //         time = flooredValue;
        //     }
        //     lastValue = dataMap.get(flooredValue);
        //     buffer.set(flooredValue, lastValue);
        //     time += timeStep;
        // }

        callback(buffer);
    }

    getClosestTimeValue(newTimeValue) {
        var closestKey = this.dataTimeValues.reduce(function (prev, curr) {
            return (Math.abs(curr - newTimeValue) < Math.abs(prev - newTimeValue) ? curr : prev);
        });

        return closestKey;
    }

    //TO-DO Currently Disabled
    bufferSizeAdjustment(originalBuffer) {
        var passingRegressionErrors = new Array();
        var failingRegressionErrors = new Array();
        var storedFailedRegressionErrors = new Array();
        var storedFailedRegressions = new Array();
        var error;
        var reducedBuffer = new Map(originalBuffer);

        if (reducedBuffer.size == this.bufferMinSize)
            return { regression: null, buffer: reducedBuffer, bufferThreshold: this.standardThreshold * this.bufferMinSize }

        while (reducedBuffer.size > this.bufferMinSize) {
            var currentBufferSize = reducedBuffer.size;
            var bufferThreshold = currentBufferSize * this.standardThreshold;
            let observedPoints = this.getObservedPoints(reducedBuffer);

            if (observedPoints != null) {
                this.levenberg.regression(observedPoints);
            }

            this.currentRegressions.forEach(regression => {
                error = regression.result.parameterError;
                if (error <= bufferThreshold)
                    passingRegressionErrors.push(error);
                else
                    failingRegressionErrors.push(error)
            });

            var passingRegression = this.getRegressionWithLeastError(passingRegressionErrors, this.currentRegressions);
            var failingRegression = this.getRegressionWithLeastError(failingRegressionErrors, this.currentRegressions);

            if (passingRegression != null) {
                this.bufferReport.bufferSize.push(currentBufferSize);
                this.bufferReport.regression.push(passingRegression);
                this.bufferReport.passed.push(true);
                this.bufferReport.bufferThreshold.push(bufferThreshold);
                this.bufferReport.errorThreshold.push(this.standardThreshold);

                return { regression: passingRegression, buffer: reducedBuffer, bufferThreshold: bufferThreshold }
            }

            if (failingRegression != null) {
                this.bufferReport.bufferSize.push(currentBufferSize);
                this.bufferReport.regression.push(failingRegression);
                this.bufferReport.passed.push(false);
                this.bufferReport.bufferThreshold.push(bufferThreshold);
                this.bufferReport.errorThreshold.push(this.standardThreshold);

                storedFailedRegressionErrors.push(failingRegression.result.parameterError);
                storedFailedRegressions.push(failingRegression);

            }

            const currentKeys = [...reducedBuffer.keys()]
            const keysToBeDeleted = currentKeys.filter((value, index) => {
                if (index > ((currentBufferSize - 1) / 2))
                    return value;
            });

            keysToBeDeleted.forEach((value) => {
                reducedBuffer.delete(value);
            })
        }

        if (storedFailedRegressions != null) {
            var bestFailedRegression = this.getRegressionWithLeastError(storedFailedRegressionErrors, storedFailedRegressions);
            return { regression: bestFailedRegression, buffer: reducedBuffer, bufferThreshold: bufferThreshold }
        }
    }

    getObservedPoints(buffer) {
        var xObservedValues = new Array();
        var yObservedValues = new Array();

        for (let [time, value] of buffer) {
            xObservedValues.push(time);
            yObservedValues.push(value);
        }

        let observedPoints = {
            x: xObservedValues,
            y: yObservedValues
        };

        if (xObservedValues.length > 2)
            return observedPoints;
        else
            return null;

    }

    getRegressionWithLeastError(errorArray, regressionArray) {
        var minError = Math.min(...errorArray);

        var bestRegression = regressionArray.find((regression) => {
            return regression.result.parameterError == minError;
        });

        return bestRegression;
    }

    fit(buffer) {
        var fittedEquations = new Array();
        var equation;
        var fittedFunction;
        var previousEquationEvaluation;
        var equationId = 0;
        var shiftedBuffer;
        var adjustedBuffer;
        // console.log("buffer")
        // console.log(buffer)

        //use for first buffer adjustment only
        // adjustedBuffer = this.bufferSizeAdjustment(buffer);
        // this.errorThreshold = adjustedBuffer.bufferThreshold;
        // buffer = adjustedBuffer.buffer;

        // console.time("fitting Time");
        while (buffer != null) {
            previousEquationEvaluation = this.evaluateCurrentFittedFunction(fittedEquations, buffer);

            if (previousEquationEvaluation.fits == true) {
                // console.log('Previous equation fits');
                // console.log(previousEquationEvaluation)
                equation = this.updatePreviousEquation(fittedEquations.pop(), buffer, previousEquationEvaluation.error);
                fittedEquations.push(equation);
                this.fittedEquations.push(equation);
            } else {
                // adjustedBuffer = this.bufferSizeAdjustment(buffer);
                // buffer = adjustedBuffer.buffer;

                // console.log('Previous equation does not fit');
                // shiftedBuffer = this.shiftBufferToOrigin(buffer);

                // send buffer or shifted buffer to be analized
                // let observedPoints = this.getObservedPoints(shiftedBuffer);

                let observedPoints = this.getObservedPoints(buffer);

                if (observedPoints != null) {
                    equationId++;
                    // fittedFunction = this.levenbergRegression(observedPoints);
                    fittedFunction = this.levenberg.regression(observedPoints);
                    // this.regressionReport.push(fittedFunction);

                    if (fittedFunction != null) {
                        equation = this.createEquation(buffer, equationId, fittedFunction, fittedEquations, observedPoints);
                        fittedEquations.push(equation);
                        this.fittedEquations.push(equation);
                        //TO-DO remove evaluation of new equation as it only helps for the report
                        previousEquationEvaluation = this.evaluateCurrentFittedFunction(fittedEquations, buffer);
                        fittedEquations[fittedEquations.length - 1].evaluationError = previousEquationEvaluation.error;
                    }
                }
            }

            buffer = this.slideBuffer(buffer);
            // console.log("slided buffer")
            // console.log(buffer);
        }

        this.arrayOfEquations.push(fittedEquations);
    }

    evaluateCurrentFittedFunction(fittedEquations, buffer) {
        var length = fittedEquations.length;
        var lastFittedFunction;
        var error = math.Infinity;
        var result;
        var report = { function: "", expectedValue: new Array(), evaluatedValue: new Array(), currentError: new Array(), overAllError: "" };

        if (length > 0) {
            lastFittedFunction = fittedEquations[length - 1].regression.evalFunction;
            report.function = lastFittedFunction;

            var newFittedfunction = lastFittedFunction;
            var evaluation = 0;
            var expectedValue = 0;
            var localError = 0;
            error = 0;

            for (let [time, value] of buffer) {
                evaluation = Number(math.eval(newFittedfunction, { x: time }));
                expectedValue = Number(value);
                localError = math.abs((evaluation) - (expectedValue));

                if (localError >= error)
                    error = localError;

                //Evaluation Report
                report.expectedValue.push({ time: time, value: value });
                report.evaluatedValue.push({ time: time, value: evaluation });
                report.currentError.push({ time: time, value: localError });
            }

            //Evaluation Report
            report.overAllError = error;

            //Report History
            // this.evaluationReport.push(report);
            this.evaluationReport.push({ report: report, simulationNumber: this.simulationNumber });
        }

        if (error < this.errorThreshold) {
            result = { fits: true, error: error };
            return result;
        }
        else {
            result = { fits: false, error: error };
            return result;
        }
    }

    shiftBufferToOrigin(valuesToBeShifted) {
        var bufferKeys = this.dataTimeValues;
        var buffer = new Map();
        var timeStep = Number(this.props.timeStep);
        var xValue = Number(bufferKeys[0]);
        var timesOfValues = Array.from(valuesToBeShifted.keys());
        var firstValue = valuesToBeShifted.get(timesOfValues[0])

        var firstKey = timesOfValues[0];
        if (firstKey == 0) {
            firstValue = 0;
        }

        valuesToBeShifted.forEach(value => {
            buffer.set(xValue, value);
            xValue += timeStep;
        });

        return buffer;
    }

    createEquation(buffer, equationId, fittedFunction, fittedEquations, observedPoints) {
        var bufferKeys = Array.from(buffer.keys());
        // console.log(bufferKeys)
        var length = fittedEquations.length;
        var lastFittedEquation = fittedEquations[length - 1];
        var lowerBound;

        if (lastFittedEquation != null)
            lowerBound = lastFittedEquation.upperBound;
        else
            lowerBound = bufferKeys[0];

        var upperBound = bufferKeys[bufferKeys.length - 1];
        var id = "EQ" + equationId;
        // var timeSteps = new Set(math.range(0, upperBound, 1, true)._data);
        var equationJson = { id: id, lowerBound: lowerBound, upperBound: upperBound, regression: fittedFunction, timeSteps: observedPoints.x };
        return equationJson;
    }

    updatePreviousEquation(lastEquation, buffer, error) {
        var bufferKeys = Array.from(buffer.keys());
        var lastKey = Number(bufferKeys[bufferKeys.length - 1]);

        lastEquation.upperBound = lastKey;
        lastEquation.evaluationError = error;
        //TO-DO
        lastEquation.timeSteps.push(lastKey);
        // lastEquation.timeSteps.add(lastKey);

        // console.log('UPDATE EQ')
        // console.log(lastEquation)

        return lastEquation;
    }

    slideBuffer(buffer) {
        var dataMap = this.dataMap;
        var timeStep = Number(this.props.timeStep);
        var bufferTimes = Array.from(buffer.keys());
        var firstTime = bufferTimes[0];
        var lastTime = Number(bufferTimes[bufferTimes.length - 1]);

        buffer.delete(firstTime);

        var newTime = lastTime + timeStep;

        if (newTime > this.dataTimeValues[this.dataTimeValues.length - 1])
            return null;
        else {
            newTime = this.getClosestTimeValue(newTime);
            if (newTime == lastTime) {
                var slidingTime = newTime;
                while (newTime == lastTime) {
                    slidingTime += timeStep;
                    newTime = this.getClosestTimeValue(slidingTime);
                }
            }

            var newValue = dataMap.get(newTime);

            buffer.set(newTime, newValue);

            return buffer;
        }

    }

    renderItems() {
        if (this.props.equations != null) {
            return this.props.equations.map((equationList, index) => {

                return <div key={index.toString()}> Simulation Run {index}
                    {equationList.map((equation, index) =>
                        <ListItem key={index.toString()} button divider>
                            <ListItemText key={equation.id.toString()} primary={this.formatPrimaryText(equation)}
                                secondary={this.formatSecondaryText(equation.regression)} />
                        </ListItem>
                    )}
                </div>
            });

        }
    }

    formatPrimaryText(equation) {
        var id = equation.id;
        var fittedFunction = equation.regression.function;
        var lowerBound = equation.lowerBound;
        var upperBound = equation.upperBound;
        var evaluationError = equation.evaluationError;
        var functionType = equation.regression.type;

        return id + ': ' + fittedFunction + ', Type: ' + functionType + ', Start-Time: ' + lowerBound + ', End-Time: ' + upperBound;
    }

    formatSecondaryText(regression) {
        var error = regression.result.parameterError;
        var evalFunction = regression.evalFunction;

        // return 'Regression error: ' + error + ' Evaluated Function: ' + evalFunction;
        return 'Evaluated Function: ' + evalFunction + ' Regression error: ' + error;
    }

    render() {
        return <div>
            <h1>Fitted Functions</h1>
            <List component="nav">
                {this.renderItems()}
            </List>
        </div >
    }
}
const mapStateToProps = (state) => {
    // console.log('Regression State');
    // console.log(state);

    return {
        doFittingRoutine: state.state.fit,
        equations: state.state.fittedEquations
    };
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({ evaluationReportAction, regressionReportAction, fitAction, fittedEquationsAction, bufferReportAction }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Regression);
