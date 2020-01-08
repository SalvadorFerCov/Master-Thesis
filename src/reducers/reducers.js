const defaultState = {
    bufferSize: 4,
    timeStep: 1,
    xValues: [],
    yValues: []
};

const reducers = (state = defaultState, action) => {
    // console.log('Current Action ');
    // console.log(action);

    switch (action.type) {

        case 'BUFFER-SIZE':
            return {
                ...state,
                bufferSize: action.payload
            };

        case 'TIMESTEP':
            return {
                ...state,
                timeStep: action.payload
            };

        case 'DATA-MAP':
            return {
                ...state,
                dataMap: action.payload
            };

        case 'X-VALUES':
            return {
                ...state,
                xValues: action.payload
            };

        case 'Y-VALUES':
            return {
                ...state,
                yValues: action.payload
            };

        case 'EVALUATION-REPORT':
            return {
                ...state,
                evaluationsReport: action.payload
            };

        case 'REGRESSION-REPORT':
            return {
                ...state,
                regressionsReport: action.payload
            };

        case 'BUFFER-REPORT':
            return {
                ...state,
                bufferReport: action.payload
            };

        case 'FIT':
            return {
                ...state,
                fit: action.payload
            };

        case 'FITTED-EQUATIONS':
            return {
                ...state,
                fittedEquations: action.payload
            };

        case 'LEARNED-MODEL':
            return {
                ...state,
                learnedModel: action.payload
            };

        default:
            return state;
    }
};

export default reducers;