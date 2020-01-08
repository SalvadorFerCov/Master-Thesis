import React, { Component } from 'react';
import Plot from 'react-plotly.js';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { bufferSizeAction, timeStepAction, dataAction, dataMapAction, xValuesAction, yValuesAction, fitAction } from '../actions/actions';

class DataPlotter extends Component {

    constructor(props) {
        super(props);
    }

    render() {
        return (
            <Plot
                data={[
                    {
                        x: this.props.xValues,
                        y: this.props.yValues,
                        type: 'scatter',
                        mode: 'markers',
                        marker: { color: 'red' }
                    }
                ]}
                layout={{ width: 500, height: 500, title: 'Data Plotted' }}
            />
        );
    }
}

const mapStateToProps = (state) => {
    // console.log('Plotter State');
    // console.log(state);

    return {
        bufferSize: state.state.bufferSize,
        timeStep: state.state.timeStep,
        xValues: state.state.xValues,
        yValues: state.state.yValues,
        dataMap: state.state.dataMap
    };
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({
        bufferSizeAction, timeStepAction, dataAction, dataMapAction,
        xValuesAction, yValuesAction, fitAction
    }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(DataPlotter);