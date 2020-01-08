import React, { Component } from 'react';
import DataPlotter from '../components/DataPlotter';
import TextField from '@material-ui/core/TextField';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { bufferSizeAction, timeStepAction, dataAction, dataMapAction, xValuesAction, yValuesAction, fitAction, originalModelAction } from '../actions/actions';
import { array } from 'prop-types';

class DataManager extends Component {
    constructor(props) {
        super(props);

        //DOM References
        this.fileInput = React.createRef();
        this.bufferSizeInput = React.createRef();
        this.timeStepInput = React.createRef();

        //Internal Methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.appendData = this.appendData.bind(this);
        this.updateProps = this.updateProps.bind(this);
        this.clearPlot = this.clearPlot.bind(this);
        this.exportModel = this.exportModel.bind(this);

        //Internal Structures
        this.dataMap = new Map();
        this.xArray = new Array();
        this.yArray = new Array();
        this.observationArray = new Array();
        this.simulationsMapArray = [];
    }

    handleSubmit(event) {
        var bufferSize = this.bufferSizeInput.current.value;
        var timeStep = this.timeStepInput.current.value;

        this.props.bufferSizeAction(bufferSize);
        this.props.timeStepAction(timeStep);

        event.preventDefault();
        this.props.fitAction(true);

        var files = this.fileInput.current.files;
        var reader = new FileReader();

        if (files != null) {
            if (files[0] != null)
                reader.readAsText(files[0]);
        }

        reader.onload = (evt) => {
            var simulationText = evt.target.result;
            var rows = simulationText.split('\n');
            var data;
            var observation;

            for (var row = 0; row < rows.length; row++) {
                data = rows[row];

                if (data.includes('#')) {
                    // console.log('simulation: ' + data)
                }
                else {
                    observation = data.split(" ");
                    this.appendData(observation);
                }
            }

        };

        reader.onloadend = () => {
            this.updateProps();
        }

    }

    appendData(observation) {
        var time, value;
        if (observation.length == 2) {
            time = observation[0];
            value = observation[1];
            this.dataMap.set(time, value);
            this.observationArray.push({ time: time, value: value });
        }
        else {
            // console.log('Wrong format of data');
            // console.log(observation);
        }
    }

    updateProps() {

        var simulationArrayIndexes = [];
        var simulationArray = [];

        this.observationArray.forEach((observation, index) => {
            if (observation.time == '0.0')
                simulationArrayIndexes.push(index);
        });

        for (var i = 1; i < simulationArrayIndexes.length; i++) {
            var startIndex = simulationArrayIndexes[i - 1];
            var endIndex = simulationArrayIndexes[i];
            var observations = this.observationArray.filter((observation, index) => { return index >= startIndex && index <= endIndex })
            simulationArray.push(observations);
        }

        var observations = this.observationArray.filter((observation, index) => { return index >= simulationArrayIndexes[simulationArrayIndexes.length - 1] })
        simulationArray.push(observations);

        var relevantSimulations = simulationArray.filter(observation => observation.length > 2)
        this.simulationsMapArray = [];

        relevantSimulations.forEach(simulation => {
            var map = new Map();

            simulation.forEach(entry => {
                map.set(Number(entry.time), Number(entry.value));
            });

            this.simulationsMapArray.push(map);
        });

        this.simulationsMapArray.forEach(map => {
            map.forEach((value, key) => {
                this.xArray.push(key);
                this.yArray.push(value);
            });

        });

        this.props.dataMapAction(this.simulationsMapArray);
        this.props.xValuesAction(this.xArray);
        this.props.yValuesAction(this.yArray);

        this.dataMap.clear();
        this.xArray = new Array();
        this.yArray = new Array();
    }

    clearPlot() {
        this.xArray = [];
        this.yArray = [];
        this.simulationsMapArray = [];
        this.dataMap.clear();


        this.props.dataMapAction(this.simulationsMapArray);
        this.props.xValuesAction(this.xArray);
        this.props.yValuesAction(this.yArray);
    }

    exportModel() {
        var jsonOriginalModel = this.learnedModel.cy.json();
        this.props.originalModelAction(jsonOriginalModel);
    }

    render() {
        return (<form onSubmit={this.handleSubmit}>
            <h1>Input Data</h1>
            <TextField
                id="buffer"
                label="Buffer Size"
                type="number"
                defaultValue="4"
                inputProps={{ min: "4", step: "1" }}
                inputRef={this.bufferSizeInput}
                InputLabelProps={{
                    shrink: true,
                }}
                margin="normal"
                variant="outlined"
            />
            <TextField
                id="timeStep"
                label="Time Step"
                type="number"
                defaultValue="1"
                inputProps={{ min: "1", step: "1" }}
                inputRef={this.timeStepInput}
                InputLabelProps={{
                    shrink: true,
                }}
                margin="normal"
                variant="outlined"
            />
            <br />
            <br />
            <label>
                <input type="file" ref={this.fileInput} accept=".txt" />
                <button type="submit">Fit</button>
            </label>
            <button onClick={this.clearPlot} >Clear Plot</button>
            <br />
            <DataPlotter x={this.props.xValues} y={this.props.yValues}></DataPlotter>

        </form>);
    }
}

const mapStateToProps = (state) => {
    // console.log('Data Manager State');
    // console.log(state);

    return {
        bufferSize: state.state.bufferSize,
        timeStep: state.state.timeStep,
        xValues: state.state.xValues,
        yValues: state.state.yValues
    };
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        bufferSizeAction, timeStepAction, dataAction, dataMapAction,
        xValuesAction, yValuesAction, fitAction, originalModelAction
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(DataManager);