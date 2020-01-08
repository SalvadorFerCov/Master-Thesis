import React, { Component } from 'react';
import { connect } from 'react-redux';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

class Report extends Component {

    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
        this.renderBufferAdjustments = this.renderBufferAdjustments.bind(this);
        this.renderEvaluations = this.renderEvaluations.bind(this);
        this.renderRegressions = this.renderRegressions.bind(this);

        this.state = {
            value: 0
        };
    }

    handleChange(event, value) {
        this.setState({ value });
    };

    formatEvaluationPrimaryText(evaluation) {
        var evaluatedFunction = evaluation.function;
        var accumulatedError = evaluation.overAllError;
        var length = evaluation.evaluatedValue.length;
        var startTime = evaluation.evaluatedValue[0].time;
        var endTime = evaluation.evaluatedValue[length - 1].time;

        return <div>
            <b> Function </b> {evaluatedFunction} <b> Accumulated Error </b> {accumulatedError} <b> Time Range </b> ({startTime} - {endTime})
        </div>
    }

    formatEvaluationSecondaryText(evaluation) {
        return evaluation.expectedValue.map((value, index) => {
            return <div key={index.toString()}>
                <br></br>
                <b> Real Value </b> {JSON.stringify(evaluation.expectedValue[index])} <br></br>
                <b> Evaluated Value </b> {JSON.stringify(evaluation.evaluatedValue[index])} <br></br>
                <b> Error </b> {JSON.stringify(evaluation.currentError[index])} <br></br>
                <br></br>
            </div>
        });
    }

    renderEvaluations() {
        if (this.props.evaluations != null) {
            return this.props.evaluations.map((evaluation, index) => {
                return <div key={index.toString()}>
                    <h3> Evaluaton {index} (Simulation {evaluation.simulationNumber})</h3>
                    {this.formatEvaluationPrimaryText(evaluation.report)}
                    {this.formatEvaluationSecondaryText(evaluation.report)}
                </div>
            });
        }
    }

    renderRegressions() {
        if (this.props.regressions != null) {
            return this.props.regressions.map((regressionArray, index) => {
                return <div key={index.toString()}>
                    <br></br>
                    <h3>Regression {index}</h3>
                    {regressionArray.allRegressions.map(regression => {
                        return this.formatRegressionsText(regression);
                    })}
                    <h3>Best Regression</h3>
                    {this.formatRegressionsText(regressionArray.bestRegression)}

                </div>
            });
        }
    }

    formatBufferAdjustmentsText(bufferInfo, index) {
        return <div>
            <b> Buffer Size </b> {bufferInfo.bufferSize[index]} <br></br>
            <b> Buffer Threshold  </b> {bufferInfo.bufferThreshold[index]} <br></br>
            <b> Evaluation Threshold </b> {bufferInfo.errorThreshold[index]} <br></br>
            <b> Function </b> {bufferInfo.regression[index].function} <br></br>
            <b> Function Error </b> {bufferInfo.regression[index].result.parameterError} <br></br>
            <b> Passed Criteria</b> {bufferInfo.passed[index].toString()} <br></br>

            <br></br>
        </div>
    }

    renderBufferAdjustments() {
        if (this.props.bufferAdjustments != null) {
            return this.props.bufferAdjustments.bufferSize.map((bufferSize, index) => {
                return <div key={index.toString()}>
                    <h3>Buffer Adjustment {index}</h3>
                    {this.formatBufferAdjustmentsText(this.props.bufferAdjustments, index)}
                </div>
            });
        }
    }

    formatRegressionsText(regression) {
        var fittedFunction = regression.function;
        var functionType = regression.type;
        var functionError = regression.result.parameterError;

        return <div>
            <b> Function </b> {fittedFunction} <b> Type </b> {functionType} <b> Error </b> {functionError}
        </div>
    }


    render() {
        return (
            <div>
                < Paper square >
                    <Tabs
                        value={this.state.value}
                        indicatorColor="primary"
                        textColor="primary"
                        onChange={this.handleChange}
                    >
                        <Tab label="Evaluations" />
                        {/* <Tab label="Regressions" /> */}
                        {/* <Tab label="Buffer Size Adjustment" /> */}

                    </Tabs>
                </Paper >

                {this.state.value === 0 && this.renderEvaluations()}
                {/* {this.state.value === 1 && this.renderRegressions()} */}
                {/* {this.state.value === 2 && this.renderBufferAdjustments()} */}

            </div>
        );

    }
}

const mapStateToProps = (state) => {
    // console.log('Data Report State');
    // console.log(state);

    return {
        evaluations: state.state.evaluationsReport,
        regressions: state.state.regressionsReport,
        bufferAdjustments: state.state.bufferReport
    };
}

export default connect(mapStateToProps)(Report);