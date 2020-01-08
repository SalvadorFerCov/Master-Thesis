export const bufferSizeAction = (size) => (
    {
        type: 'BUFFER-SIZE',
        payload: size
    }
);

export const timeStepAction = (value) => (
    {
        type: 'TIMESTEP',
        payload: value
    }
);

export const dataMapAction = (data) => (
    {
        type: 'DATA-MAP',
        payload: data
    }
);

export const xValuesAction = (xValues) => (
    {
        type: 'X-VALUES',
        payload: xValues
    }
);

export const yValuesAction = (yValues) => (
    {
        type: 'Y-VALUES',
        payload: yValues
    }
);

export const evaluationReportAction = (evaluationReport) => (
    {
        type: 'EVALUATION-REPORT',
        payload: evaluationReport
    }
);

export const regressionReportAction = (regressionsReport) => (
    {
        type: 'REGRESSION-REPORT',
        payload: regressionsReport
    }
);

export const bufferReportAction = (bufferReport) => (
    {
        type: 'BUFFER-REPORT',
        payload: bufferReport
    }
);

export const fitAction = (performFitting) => (
    {
        type: 'FIT',
        payload: performFitting
    }
);

export const fittedEquationsAction = (equations) => (
    {
        type: 'FITTED-EQUATIONS',
        payload: equations
    }
);

export const learnedModelAction = (learnedModel) => (
    {
        type: 'LEARNED-MODEL',
        payload: learnedModel
    }
);

export const originalModelAction = (originalModel) => (
    {
        type: 'ORIGINAL-MODEL',
        payload: originalModel
    }
);