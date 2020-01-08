import React, { Component } from 'react';
import Regression from './Regression';
import { connect } from 'react-redux';

class DataFitter extends Component {

    constructor(props) {
        super(props);
    }

    render() {
        return <div>
            <h1>Chosen Parameters</h1>

            Buffer Size = {this.props.bufferSize} Time Step = {this.props.timeStep}

            <Regression dataMap={this.props.dataMap} bufferSize={this.props.bufferSize}
                timeStep={this.props.timeStep} ></Regression>
        </div>
    }
}

const mapStateToProps = (state) => {
    // console.log('Data Fitter State');
    // console.log(state);

    return {
        bufferSize: state.state.bufferSize,
        timeStep: state.state.timeStep,
        data: state.state.data,
        dataMap: state.state.dataMap
    };
}

export default connect(mapStateToProps)(DataFitter);