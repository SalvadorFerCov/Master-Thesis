import React, { Component } from 'react';
import Equation from '../classes/Equation';
import Graph from '../classes/Graph';
import Button from '@material-ui/core/Button';
import math from 'mathjs';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Levenberg from '../classes/Levenberg';
import TextField from '@material-ui/core/TextField';
import { learnedModelAction } from '../actions/actions';
import Plot from 'react-plotly.js';
import Matcher from '../classes/Matcher';
import Select from '@material-ui/core/Select';
import { MenuItem, Checkbox } from '@material-ui/core';
import { number } from 'prop-types';
import { callbackify } from 'util';

class Learner extends Component {
    constructor(props) {
        super(props);

        this.state = { xValues: [], yValues: [], cost: [], dataObjects: [], costObjects: [], selection: 0, comb1Check: false, comb2Check: false, comb3Check: false };
        this.observationCount = 0;
        this.observations = [];
        this.similarities = [];
        this.costs = [];
        this.replacementCosts = [];
        this.additionCosts = [];

        this.plotDataObjects = [];
        this.plotCostObjects = [];
        this.plotReplacementObjects = [];
        this.plotAdditionObjects = [];
        this.uniqueSimCombinations = []
        this.allSimCombinations = []
        this.saveModels = true;

        this.uniquePlotDataObjects = [];
        this.uniquePlotCostObjects = [];
        this.uniquePlotReplacementObjects = [];
        this.uniquePlotAdditionObjects = [];

        this.learnedModels = [];
        this.uniqueLearnedModels = [];
        this.learndeModelCounter = 0;
        this.combinationSet = [];
        this.combination;
        this.originalmodelName = "learnedModel";
        this.runNumber = 0;
        this.takenChange;
        this.allchanges;

        this.originalXvalues = [];
        this.originalYvalues = [];
        this.filteredXvalues = [];
        this.filteredYvalues = [];
        this.changeHistory = [];
        this.metrics = [];

        this.equationTrace = [];
        this.historyTrace = [];
        this.similarityThreshold;
        this.timeCost;
        this.propagationCost;
        this.locationCost;

        this.similarityInput = React.createRef();
        this.timecostInput = React.createRef();
        this.propagationCostInput = React.createRef();
        this.locationCostInput = React.createRef();

        this.beginLearning = this.beginLearning.bind(this);
        this.learn = this.learn.bind(this);
        this.fixGraphPositions = this.fixGraphPositions.bind(this);
        this.fixGraphPositionsLearnedModel = this.fixGraphPositionsLearnedModel.bind(this);
        this.printObservedTraces = this.printObservedTraces.bind(this);
        this.exportModel = this.exportModel.bind(this);
        this.changeStyle = this.changeStyle.bind(this);
        this.importModel = this.importModel.bind(this);
        this.clear = this.clear.bind(this);
        this.fileInput = React.createRef();
        this.handleChange = this.handleChange.bind(this);
        this.handleChechBox = this.handleChechBox.bind(this);
        this.exportAllModels = this.exportAllModels.bind(this);
        this.exportGraphs = this.exportGraphs.bind(this);
        this.prepareModelForExportation = this.prepareModelForExportation.bind(this);
        this.onGraphClick = this.onGraphClick.bind(this);
        this.setUniqueState = this.setUniqueState.bind(this);
        this.setOriginalState = this.setOriginalState.bind(this);

        this.learnedModel;
        this.originalModel = null;
    }

    learn() {
        var parentNode = this.learnedModel.cy.getElementById('init');
        var traceSize = this.equationTrace.length;
        var observedEquation;
        var lastUpdatedNode;
        var directSuccessors;
        this.runNumber++;

        for (let i = 0; i < traceSize; i++) {

            this.observationCount += 1;
            this.observations.push(this.observationCount);

            directSuccessors = parentNode.outgoers('node');

            if (directSuccessors.length > 0) {
                observedEquation = this.equationTrace[i];
                var neighborhoodDistances = this.calculateNeighborsEuclideanDistance(directSuccessors, observedEquation);
                lastUpdatedNode = this.incrementalLearning(neighborhoodDistances, parentNode, observedEquation, directSuccessors);
                parentNode = lastUpdatedNode;
            }
            else {
                this.takenChange = "addition cost: " + this.locationCost;
                this.costs.push(this.locationCost);
                this.replacementCosts.push(0);
                observedEquation = this.equationTrace[i];
                lastUpdatedNode = this.addNodeToLearnedModel(observedEquation, parentNode, observedEquation.id, 1);
                parentNode = lastUpdatedNode;
            }

            var learnedNodes = this.learnedModel.cy.nodes().clone();
            var learnedEdges = this.learnedModel.cy.edges().clone();

            if (this.originalModel != null) {
                var matcher = new Matcher();
                var matches = matcher.matchGraphs(this.learnedModel, this.originalModel);


                var graphMetric = matches.pop();
                var similarity = graphMetric.graphSimilarity;
                matches.push(graphMetric)
                this.similarities.push(similarity);

                this.metrics.push(matches);
            }

            if (this.saveModels == true)
                this.learnedModels.push({ nodes: learnedNodes, edges: learnedEdges, combination: this.combination, obsCount: this.observationCount, observation: observedEquation, change: this.takenChange, allChanges: this.allchanges, graphMetric: graphMetric, matches: matches });
        }
    }

    calculateNeighborsEuclideanDistance(directSuccessors, observedEquation) {
        var neighborhoodSize = directSuccessors.length;
        var euclideanDistances = [];

        for (let i = 0; i < neighborhoodSize; i++) {
            var neighbor = directSuccessors[i];
            var neighborFunction = neighbor.data('functionality').fittedFunction;
            var neighborTimeSteps = neighbor.data('functionality').timeSteps;
            var observedFunction = observedEquation.fittedFunction;
            var neighborPoints = this.evaluateFunction(neighborFunction, neighborTimeSteps);
            var observedPoints = this.evaluateFunction(observedFunction, neighborTimeSteps);
            var euclideanDistance = this.getOneDimensionEuclideanDistance(neighbor.id(), neighborPoints, observedPoints);

            euclideanDistances.push(euclideanDistance);
        }

        return euclideanDistances;
    }

    getObservationsFromHistoryTrace(closeNode) {
        var nodeId = closeNode.id();
        var filteredHistory = this.historyTrace.filter((trace) => {
            if (trace.closestNeighbor.isNode()) {
                return trace.closestNeighbor.data('functionality').id == nodeId;
            }
        });

        return filteredHistory;
    }

    incrementalLearning(neighborhoodDistances, parentNode, observedEquation, directSuccessors) {
        var closeNeighborsMetric = this.getClosestNeighborsAboveSimilarityThreshold(neighborhoodDistances);
        // console.log(observedEquation)
        if (closeNeighborsMetric != null) {
            // console.log('Close Node')
            return this.addLeastExpensiveChange(closeNeighborsMetric, observedEquation, parentNode);
        }
        else {
            this.takenChange = "addition cost: " + this.locationCost;
            // console.log('Far Node')
            this.costs.push(this.locationCost);
            this.additionCosts.push(this.locationCost);
            this.replacementCosts.push(0);

            var bestFarNodeMetric = this.getLeastFarNodeMetricBelowSimilarityThreshold(neighborhoodDistances);
            if (bestFarNodeMetric != null) {
                var farNodeId = bestFarNodeMetric.nodeId;
                var similarity = bestFarNodeMetric.similarity;

                return this.addNodeToLearnedModel(observedEquation, parentNode, farNodeId, similarity);
            } else {
                console.log('No neighbor found!')
            }
        }
    }

    getClosestParallelNodeDistanceMetric(neighborNode, newEquation, neighborhoodSourceId) {
        var parallelNeighbors = this.learnedModel.cy.getElementById(neighborhoodSourceId).outgoers('node');
        var neighborDistances = this.calculateNeighborsEuclideanDistance(parallelNeighbors, newEquation);
        var allSimilarities = [];
        neighborDistances.forEach((distance) => {
            allSimilarities.push(distance.similarity);
        });

        var bestSimilarity = math.max(...allSimilarities);
        var bestMetric = neighborDistances.filter(distance =>
            distance.similarity == bestSimilarity);

        return bestMetric;

    }

    evaluateNodeMergePropagation(closeNode, mergedEquation) {
        var directSuccessors = closeNode.outgoers('node');
        var propagation = [];
        var similarityImprovement = 0;
        var unseenTimesArray = [];

        var oldDistances = this.calculateNeighborsEuclideanDistance(directSuccessors, closeNode.data('functionality'));
        var newDistances = this.calculateNeighborsEuclideanDistance(directSuccessors, mergedEquation);

        directSuccessors.forEach((successor) => {
            var newSimilarity = newDistances.find(distance => distance.nodeId == successor.id()).similarity;
            var oldSimilarity = oldDistances.find(distance => distance.nodeId == successor.id()).similarity;

            var timeConstraintsComparison = this.compareTimeConstraints(mergedEquation, successor);
            var unseenTimes = null;
            var weight = successor.data('weight');

            if (successor.id() == closeNode.id()) {
                var observedTimesteps = new Set(successor.data('functionality').timeSteps._data);
                var unseenTimesBefore = timeConstraintsComparison.timesBefore;
                var unseenTimesBetween = [...observedTimesteps].filter(time => !timeConstraintsComparison.intersection.has(time));
                var unseenTimesAfter = timeConstraintsComparison.timesAfter;

                unseenTimes = [...unseenTimesBefore, ...unseenTimesBetween, ...unseenTimesAfter];
                unseenTimesArray.push([...unseenTimes]);
            }

            var change = {
                changedEquation: successor.data('functionality'),
                oldSimilarity: oldSimilarity,
                newEquation: mergedEquation,
                newSimilarity: newSimilarity,
                weight: weight,
                improvement: (newSimilarity - oldSimilarity) * weight,
                unseenTimes: unseenTimes
            };

            propagation.push(change);
            similarityImprovement += change.improvement;
        });

        var allSimilarities = [];
        newDistances.forEach((distance) => {
            allSimilarities.push(distance.similarity);
        });

        var bestSimilarity = math.max(...allSimilarities);
        var bestMetric = newDistances.filter(distance =>
            distance.similarity == bestSimilarity);

        return { improvement: similarityImprovement, propagation: propagation, unseenTimes: unseenTimesArray, bestMetric: bestMetric };

    }

    getClosestNeighborsAboveSimilarityThreshold(neighborhoodDistances) {
        var neighborsAboveThreshold = [...neighborhoodDistances].filter((neighbor) => {
            return (neighbor.similarity >= this.similarityThreshold);
        });

        if (neighborsAboveThreshold.length > 0) {
            var allSimilarities = [];
            neighborsAboveThreshold.forEach((distance) => {
                allSimilarities.push(distance.similarity);
            });

            var bestSimilarity = math.max(...allSimilarities);
            var bestSimilarities = neighborsAboveThreshold.filter(distance =>
                distance.similarity == bestSimilarity);

            return bestSimilarities[0];
        }
        else
            return null;
    }

    getLeastFarNodeMetricBelowSimilarityThreshold(neighborhoodDistances) {
        var neighborsBelowThreshold = [...neighborhoodDistances].filter((neighbor) => {
            return (neighbor.similarity <= this.similarityThreshold);
        });

        if (neighborsBelowThreshold.length > 0) {
            var allSimilarities = [];
            neighborsBelowThreshold.forEach((distance) => {
                allSimilarities.push(distance.similarity);
            });

            var bestSimilarity = math.max(...allSimilarities);
            var bestSimilarities = neighborsBelowThreshold.filter(distance =>
                distance.similarity == bestSimilarity);

            return bestSimilarities[0];
        }
        else
            return null;

    }

    evaluateFunction(evalFunction, timeSteps) {
        var y;
        var yPoints = [];

        timeSteps.forEach((timeStep) => {
            y = math.eval(evalFunction, { x: timeStep });
            yPoints.push(y);
        });

        return yPoints;
    }

    addObservationToHistoryTrace(closestNeighbor, observedEquation, similarity, nodeId) {
        var observation = { observedEquation: observedEquation, learnedNodeId: nodeId, closestNeighbor: closestNeighbor, similarity: similarity };
        this.historyTrace.push(observation);
    }

    getOneDimensionEuclideanDistance(neighborId, neighborPoints, observedPoints) {
        var sqrtSum = 0;
        var eDistance;
        var similarity;

        neighborPoints.forEach((neighborPoint, index) => {
            sqrtSum += Math.pow(neighborPoint - observedPoints[index], 2);
        });

        eDistance = Math.sqrt(sqrtSum);
        similarity = (1 / (1 + eDistance));

        return { nodeId: neighborId, eDistance: eDistance, similarity: similarity };
    }

    addLeastExpensiveChange(closeNeighborsMetric, observedEquation, parentNode) {
        var nodeId = closeNeighborsMetric.nodeId;
        var closeNode = this.learnedModel.cy.getElementById(nodeId);
        var timeConstraintsComparison = this.compareTimeConstraints(observedEquation, closeNode);
        var costs = [];

        costs.push(this.nodeReplacementCost(timeConstraintsComparison, closeNeighborsMetric));
        costs.push(this.nodeAdditionCost(timeConstraintsComparison, parentNode));

        var costValues = [];

        costs.forEach((costType) => {
            // if (costType.cost != null && costType.changes.length > 0)
            costValues.push(costType.cost);
        });

        //TO-DO check this condition
        if (costValues.length == 0)
            return neighborId;

        var bestCost = math.min(costValues);
        var cheapestChanges;

        cheapestChanges = costs.filter(cost => cost.cost == bestCost);
        this.takenChange = cheapestChanges;
        this.allchanges = costs;

        return this.addChangeToLearnedModel(cheapestChanges[0], parentNode, closeNode, observedEquation);
    }

    nodeReplacementCost(timeConstraintsComparison, closeNeighborsMetric) {
        var observedEquation = timeConstraintsComparison.observedEquation;
        var timeSteps = timeConstraintsComparison.timesUnion;
        var closeNode = timeConstraintsComparison.closeNode;
        var closeEquation = closeNode.data('functionality');
        var costReport = { type: 'Replacement', changes: null, unseenTimes: null, cost: null, addedLocations: 0 };
        var propagations = [];
        var mergedEquation;

        if (closeNeighborsMetric.similarity == 1) {
            mergedEquation = closeEquation;
        }
        else {
            mergedEquation = this.mergeEquations(closeEquation, observedEquation, timeSteps);
        }

        var propagation = this.evaluateNodeMergePropagation(closeNode, mergedEquation);
        var unseenTimes = propagation.unseenTimes.pop();
        var cost = (this.timeCost * unseenTimes.length) + (-propagation.improvement * this.propagationCost);
        this.replacementCosts.push(cost);

        propagations.push(propagation);
        costReport = { type: 'Replacement', changes: propagations, unseenTimes: unseenTimes, cost: cost, addedLocations: 0 };

        return costReport;
    }

    nodeAdditionCost(timeConstraintsComparison, parentNode) {
        var observedEquation = timeConstraintsComparison.observedEquation;
        var closeNode = timeConstraintsComparison.closeNode;
        var closestNeighbor = this.getClosestParallelNodeDistanceMetric(closeNode, observedEquation, parentNode.id());
        var cost = this.locationCost;
        var costReport = { type: 'New Node', cost: cost, closestNeighbor: closestNeighbor };

        this.additionCosts.push(cost);

        return costReport;
    }

    addChangeToLearnedModel(change, parentNode, closeNode, observedEquation) {

        var type = change.type;
        this.costs.push(change.cost);

        var nodeId;

        switch (type) {
            case "New Node":
                nodeId = this.addChangeAsNewNode(change.closestNeighbor, parentNode, closeNode, observedEquation);
                break;

            case "Replacement":
                nodeId = this.addChangeAsNodeReplacement(change.changes[0], parentNode, closeNode, observedEquation);
                break;
        }

        var lastUpdatedNode = this.learnedModel.cy.getElementById(nodeId);

        return lastUpdatedNode;
    }

    addChangeAsNewNode(closeNodeMetric, parentNode, closeNode, observedEquation) {
        var metric = closeNodeMetric.pop();
        var closestNode = metric.nodeId;
        var similarity = metric.similarity;
        var updatedNode = this.addNodeToLearnedModel(observedEquation, parentNode, closestNode, similarity);

        return updatedNode.id();
    }

    addChangeAsNodeReplacement(change, parentNode, closeNode, observedEquation) {
        var propagations = change.propagation;
        var nodeId = closeNode.id();
        var selfEdge = this.learnedModel.cy.getElementById(nodeId + '_' + nodeId);
        var weight = closeNode.data('weight') + 1;

        closeNode.data('weight', weight);
        var propagation = change.propagation.pop();
        var newEquation = propagation.newEquation;
        propagations.push(propagation);

        this.updateSelfEdge(selfEdge, newEquation, weight);

        var bestMetric = change.bestMetric.pop();
        var closestNeighborId = bestMetric.nodeId;
        var similarity = bestMetric.similarity;
        var closestNeighbor = this.learnedModel.cy.getElementById(closestNeighborId);

        this.updateNode(closeNode, newEquation, similarity, closestNeighborId);

        var directSuccessors = propagations.filter(propagation => propagation.changedEquation.id != nodeId)
        this.propagateChanges(directSuccessors);


        this.addObservationToHistoryTrace(closestNeighbor, observedEquation, similarity, nodeId);

        return closeNode.id();
    }

    propagateChanges(propagations) {
        propagations.forEach((propagation) => {
            var node = this.learnedModel.cy.getElementById(propagation.changedEquation.id);

            if (node.isNode()) {
                var newSimilarity = propagation.newSimilarity;
                var nodeFunctionality = node.data('functionality');
                var similarNodeId = node.data('similarNodeId');

                this.updateNode(node, nodeFunctionality, newSimilarity, similarNodeId);
            }
        });
    }

    mergeEquations(neighborEquation, observedEquation, timeSteps) {
        var xObservedValues = new Array();
        var yObservedValues = new Array();
        var observedEquationCopy = this.createEquationCopy(observedEquation.id, observedEquation);
        var observedEvaluatedPoints = this.evaluateFunction(observedEquationCopy.fittedFunction, timeSteps);
        var neighborNewEvaluatedPoints = this.evaluateFunction(neighborEquation.fittedFunction, timeSteps);

        observedEvaluatedPoints.forEach((point, index) => {
            xObservedValues.push(timeSteps._data[index]);
            yObservedValues.push((point + neighborNewEvaluatedPoints[index]) / 2);
        })

        let observedPoints = {
            x: xObservedValues,
            y: yObservedValues
        };

        var levenberg = new Levenberg('levenberg');
        var regression = levenberg.regression(observedPoints);
        var evalFunction = regression.evalFunction;

        observedEquationCopy.fittedFunction = evalFunction;
        var timeStepArray = [...timeSteps._data];

        observedEquationCopy.startTime = timeStepArray[0];
        observedEquationCopy.endTime = timeStepArray[timeStepArray.length - 1];

        return observedEquationCopy;

    }

    updateNode(neighborNode, observedEquation, newSimilarity, closestNeighborId) {
        var lowerBound = observedEquation.startTime;
        var upperBound = observedEquation.endTime;

        neighborNode.data('functionality', observedEquation);
        neighborNode.data('similarNodeId', closestNeighborId);
        neighborNode.data('similarity', newSimilarity);

        if (closestNeighborId != neighborNode.id()) {
            neighborNode.data('label', neighborNode.id() + '[' + lowerBound + ',' + upperBound + ']' +
                '\n' + 'similarNode: ' + closestNeighborId +
                '\n' + 'similarity:' + newSimilarity);
        }

        return neighborNode.id();
    }

    updateOutgoingEdges(outgoingEdges, newEquation) {
        var newId = newEquation.id;
        var upperBound = newEquation.endTime;
        var guard = 't>=' + upperBound;
        outgoingEdges.forEach(outgoingEdge => {
            var source = outgoingEdge.data('source');
            outgoingEdge.data('id', source + '_' + newId);
            outgoingEdge.data('target', newId);
            outgoingEdge.data('guard', guard);
            outgoingEdge.data('label', guard);
        });

    }

    updateSelfEdge(selfEdge, observedEquation, weight) {
        var newId = observedEquation.id + '_' + observedEquation.id;

        selfEdge.data('id', newId);
        selfEdge.data('source', observedEquation.id);
        selfEdge.data('target', observedEquation.id);
        selfEdge.data('label', observedEquation.fittedFunction + ' \n weight:' + weight);
        selfEdge.style('label', observedEquation.fittedFunction + ' \n weight:' + weight);
    }

    addNodeToLearnedModel(observedEquation, parentNode, closestNeighborId, similarity) {
        var uniqueId = observedEquation.id;
        var observedEquationCopy = this.createEquationCopy(uniqueId, observedEquation);
        var graphElement = this.learnedModel.cy.getElementById(uniqueId);

        while (graphElement.isNode()) {
            observedEquationCopy.id += '\'';
            graphElement = this.learnedModel.cy.getElementById(observedEquationCopy.id);
            uniqueId = observedEquationCopy.id;
        }

        var newNodeId = this.learnedModel.addNode(observedEquationCopy, 0, 0);

        this.learnedModel.addSelfEdge(newNodeId, observedEquationCopy.fittedFunction);

        if (parentNode.id() == 'init')
            this.learnedModel.addOutgoingEdge(parentNode.id(), newNodeId, 0);
        else
            this.learnedModel.addOutgoingEdge(parentNode.id(), newNodeId, observedEquationCopy.startTime);

        var addedNode = this.learnedModel.cy.getElementById(uniqueId);
        var lowerBound = observedEquationCopy.startTime;
        var upperBound = observedEquationCopy.endTime;

        addedNode.data('similarNodeId', closestNeighborId);
        addedNode.data('similarity', similarity);
        addedNode.data('label', uniqueId + '[' + lowerBound + ',' + upperBound + ']' + '\n'
            + 'similarNode: ' + closestNeighborId + '\n' + 'similarity:' + similarity);


        var closestNeighbor = this.learnedModel.cy.getElementById(closestNeighborId);
        this.addObservationToHistoryTrace(closestNeighbor, observedEquation, similarity, addedNode.id());

        return addedNode;
    }

    createEquationCopy(newEquationId, observedEquation) {
        var eqId = newEquationId;
        var fittedFunction = observedEquation.fittedFunction;
        var startTime = observedEquation.startTime;
        var endTime = observedEquation.endTime;
        var timeSteps = observedEquation.timeSteps;
        var observedEquationCopy = new Equation(eqId, fittedFunction, startTime, endTime, timeSteps);

        return observedEquationCopy;
    }

    compareTimeConstraints(observedEquation, closeNode) {
        var closeNodeEquation = closeNode.data().functionality;
        var closeNodeTimeSteps = new Set(closeNodeEquation.timeSteps._data);
        var observedTimesteps = new Set(observedEquation.timeSteps._data);
        var comparison = {
            observedEquation: observedEquation, closeNode: closeNode,
            timesBefore: null, timesInRange: null, timesAfter: null, timesUnion: null
        };

        let timesInRange = new Set([...observedTimesteps].filter(time => time >= closeNodeEquation.startTime && time <= closeNodeEquation.endTime));
        let timesAfter = new Set([...observedTimesteps].filter(time => time > closeNodeEquation.endTime));
        let timesBefore = new Set([...observedTimesteps].filter(time => time < closeNodeEquation.startTime));
        let timesIntersection = new Set([...closeNodeTimeSteps].filter(time => observedTimesteps.has(time)));
        let timesBefore_InRange = new Set([...timesBefore, ...timesInRange]);
        let timesUnion = new Set([...timesBefore_InRange, ...timesAfter]);

        var timesArray = Array.from([...timesUnion]);
        var firstValue = timesArray[0];
        var lastValue = timesArray[timesArray.length - 1];
        let timeUnionRange = math.range(firstValue, lastValue, 1, true);

        comparison.timesBefore = timesBefore;
        comparison.timesInRange = timesInRange;
        comparison.timesAfter = timesAfter;
        comparison.timesUnion = timeUnionRange;
        comparison.intersection = timesIntersection;

        // console.log('time comparison');
        // console.log(comparison);

        return comparison;
    }

    fixGraphPositions() {
        if (this.learnedModel != null) {
            var layout = this.learnedModel.cy.layout({
                name: 'breadthfirst',
                directed: true,
                roots: '#init'
            });
            layout.run();
        }

        if (this.originalModel != null) {
            var layout = this.originalModel.cy.layout({
                name: 'breadthfirst',
                directed: true,
                roots: '#init'
            });

            layout.run();
        }
    }

    fixGraphPositionsLearnedModel(index) {
        var learnedModel = this.learnedModels[index];

        if (learnedModel != null) {
            console.log(learnedModel)
            var nodes = learnedModel.nodes;
            var edges = learnedModel.edges;

            this.learnedModel.cy.nodes().remove();
            this.learnedModel.cy.add(nodes);
            this.learnedModel.cy.add(edges);

            var layout = this.learnedModel.cy.layout({
                name: 'breadthfirst',
                directed: true,
                roots: '#init'
            });

            layout.run();
        }
    }

    printObservedTraces() {
        console.log(this.historyTrace);
    }

    importModel() {
        const selectedFile = document.getElementById('input').files[0];
        var reader = new FileReader();
        var json;

        var splitName = selectedFile.name.toString().split('.');
        this.originalmodelName = splitName[0].toString();
        // console.log(this.originalmodelName);

        reader.onload = function (evt) {
            json = JSON.parse(evt.target.result);
        };

        if (selectedFile != null)
            reader.readAsText(selectedFile);

        reader.onloadend = () => {
            // console.log('finished')
            this.originalModel = new Graph('OM');
            this.originalModel.cy.json(json);

            var allOriginalEdges = this.originalModel.cy.edges();
            allOriginalEdges.forEach(edge => edge.data('matched', false));
            this.fixGraphPositions();
        }
    }

    exportModel() {
        var jsonLearnedModel = this.learnedModel.cy.json();
        this.saveText(JSON.stringify(jsonLearnedModel), this.originalmodelName + ".json");

        var jpgLearnedModel = this.learnedModel.cy.jpeg();
        this.savePicture(jpgLearnedModel, this.originalmodelName + ".jpg");

        // var jsonLearnedModel = this.learnedModel.cy.json();
        // this.saveText(JSON.stringify(jsonLearnedModel), this.originalmodelName + ".json");

        // var jpgLearnedModel = this.learnedModel.cy.jpeg();
        // this.savePicture(jpgLearnedModel, this.originalmodelName + ".jpg");

        this.props.learnedModelAction(jsonLearnedModel);
    }

    exportAllModels() {
        this.learnedModels.forEach(model => {
            var nodes = model.nodes;
            var edges = model.edges;
            var combination = model.combination.toString() + ' obs_' + model.obsCount;

            this.learnedModel.cy.nodes().remove();
            this.learnedModel.cy.add(nodes);
            this.learnedModel.cy.add(edges);
            this.fixGraphPositions();

            var jsonLearnedModel = this.learnedModel.cy.json();
            this.saveText(JSON.stringify(jsonLearnedModel), this.originalmodelName + "_" + combination + ".json");

            var jpgLearnedModel = this.learnedModel.cy.jpeg();
            this.savePicture(jpgLearnedModel, this.originalmodelName + "_" + combination + ".jpg");
        })
    }

    prepareModelForExportation(nodes, edges, combination) {
        this.learnedModel.cy.nodes().remove();
        this.learnedModel.cy.add(nodes);
        this.learnedModel.cy.add(edges);

        var jsonLearnedModel = this.learnedModel.cy.json();
        var jpgLearnedModel = this.learnedModel.cy.jpeg();

        this.saveText(JSON.stringify(jsonLearnedModel), this.originalmodelName + "_" + combination + ".json");
        this.savePicture(jpgLearnedModel, this.originalmodelName + "_" + combination + ".jpg");

        console.log('prepared model')

    }

    exportGraphs() {
        var similarityGraph = this.state.dataObjects;
        var allCostsGraph = this.state.costObjects;
        var replacementCostsGraph = this.state.replacementCosts;
        var additionCostsGraph = this.state.additionCosts;

        this.saveText(JSON.stringify(similarityGraph), this.originalmodelName + "_similarityGraph.json");
        this.saveText(JSON.stringify(allCostsGraph), this.originalmodelName + "_costsGraph.json");
        this.saveText(JSON.stringify(replacementCostsGraph), this.originalmodelName + "_replacementCostGraph.json");
        this.saveText(JSON.stringify(additionCostsGraph), this.originalmodelName + "_additionCostGraph.json");

        var uniqueSimilarityGraph = this.uniquePlotDataObjects;
        var uniqueAllCostsGraph = this.uniquePlotCostObjects;
        var uniqueReplacementCostsGraph = this.uniquePlotReplacementObjects;
        var uniqueAdditionCostsGraph = this.uniquePlotAdditionObjects;

        this.saveText(JSON.stringify(uniqueSimilarityGraph), this.originalmodelName + "_similarityGraph_reduced.json");
        this.saveText(JSON.stringify(uniqueAllCostsGraph), this.originalmodelName + "_costsGraph_reduced.json");
        this.saveText(JSON.stringify(uniqueReplacementCostsGraph), this.originalmodelName + "_replacementCostGraph_reduced.json");
        this.saveText(JSON.stringify(uniqueAdditionCostsGraph), this.originalmodelName + "_additionCostGraph_reduced.json");

    }

    saveText(text, filename) {
        var a = document.createElement('a');
        a.setAttribute('href', 'data:text/plain;charset=utf-u,' + encodeURIComponent(text));
        a.setAttribute('download', filename);
        a.click()
    }

    savePicture(picture, filename) {
        var a = document.createElement('a');
        a.setAttribute('href', picture);
        a.setAttribute('download', filename);
        a.click()
    }

    changeStyle() {
        this.learnedModel.cy.style().selector('edge').style('line-color', 'red').update();
        this.learnedModel.cy.style().selector('node').style('background-color', 'blue').update();
    }

    prepareTrace(traceEquations) {

        traceEquations.forEach((trace) => {
            var eq = new Equation(trace.id, trace.regression.evalFunction, trace.lowerBound, trace.upperBound, math.range(trace.lowerBound, trace.upperBound, 1, true));
            this.equationTrace.push(eq);
        });

        this.learn();
        this.equationTrace = [];
    }

    beginLearning() {
        this.learnedModels = [];
        this.similarityThreshold = Number(this.similarityInput.current.value);
        this.timeCost = Number(this.timecostInput.current.value);
        this.propagationCost = Number(this.propagationCostInput.current.value);
        this.locationCost = Number(this.locationCostInput.current.value);

        if (this.props.equations != null) {
            var numberOfCombination = this.combinationSet.length;

            if (numberOfCombination > 0) {
                this.saveModels = false;
                console.time("learning Time");
                this.combinationSet.forEach(combination => {
                    console.log(combination);
                    this.combination = combination;
                    numberOfCombination -= 1;
                    console.log(numberOfCombination + ' to go')
                    this.similarityThreshold = combination[0];
                    this.timeCost = combination[1];
                    this.propagationCost = combination[2];
                    this.locationCost = combination[3];

                    this.props.equations.forEach(equationTrace => {
                        this.prepareTrace(equationTrace);
                    });

                    var similarity = this.similarities.pop();
                    this.similarities.push(similarity);
                    this.allSimCombinations.push({
                        Combination: this.combination, Similarity_Threshold: this.similarityThreshold,
                        Time_Cost: this.timeCost, Functionality_Cost: this.propagationCost, Location_Cost: this.locationCost,
                        Graph_Similarity: similarity
                    });


                    var observations = Array.from([...this.observations]);
                    var similarities = Array.from([...this.similarities]);
                    var costs = Array.from([...this.costs]);
                    var replacements = Array.from([...this.replacementCosts]);
                    var additions = Array.from([...this.additionCosts]);

                    var plotDataObject = {
                        x: observations,
                        y: similarities,
                        type: 'scatter',
                        mode: 'lines+points',
                        marker: { color: 'red' },
                        name: this.combination.toString()
                    };

                    var plotCostObject = {
                        x: observations,
                        y: costs,
                        type: 'scatter',
                        mode: 'lines+points',
                        marker: { color: 'red' },
                        name: this.combination.toString()
                    };

                    var plotReplacementCostObject = {
                        x: observations,
                        y: replacements,
                        type: 'scatter',
                        mode: 'lines+points',
                        marker: { color: 'red' },
                        name: this.combination.toString()
                    };

                    var plotAdditionCostObject = {
                        x: observations,
                        y: additions,
                        type: 'scatter',
                        mode: 'lines+points',
                        marker: { color: 'red' },
                        name: this.combination.toString()
                    };

                    this.plotDataObjects.push(plotDataObject);
                    this.plotCostObjects.push(plotCostObject);
                    this.plotReplacementObjects.push(plotReplacementCostObject);
                    this.plotAdditionObjects.push(plotAdditionCostObject);

                    this.setState({ dataObjects: this.plotDataObjects, costObjects: this.plotCostObjects, replacementCosts: this.plotReplacementObjects, additionCosts: this.plotAdditionObjects });
                    // this.clear();
                    this.clearState();

                });
            }
            else {
                this.saveModels = true;
                console.time("learning Time");
                var combination = "[" + this.similarityThreshold + "," + this.timeCost + "," + this.propagationCost + "," + this.locationCost + "]";
                console.log(combination)
                this.combination = combination;
                this.props.equations.forEach(equationTrace => {
                    this.prepareTrace(equationTrace);
                });

                var observations = Array.from([...this.observations]);
                var similarities = Array.from([...this.similarities]);
                var costs = Array.from([...this.costs]);
                var replacements = Array.from([...this.replacementCosts]);
                var additions = Array.from([...this.additionCosts]);

                var plotDataObject = {
                    x: observations,
                    y: similarities,
                    type: 'scatter',
                    mode: 'lines+points',
                    marker: { color: 'red' },
                    name: this.combination.toString()
                };

                var plotCostObject = {
                    x: observations,
                    y: costs,
                    type: 'scatter',
                    mode: 'lines+points',
                    marker: { color: 'red' },
                    name: this.combination.toString()
                };

                var plotReplacementCostObject = {
                    x: observations,
                    y: replacements,
                    type: 'scatter',
                    mode: 'lines+points',
                    marker: { color: 'red' },
                    name: this.combination.toString()
                };

                var plotAdditionCostObject = {
                    x: observations,
                    y: additions,
                    type: 'scatter',
                    mode: 'lines+points',
                    marker: { color: 'red' },
                    name: this.combination.toString() + ' obs:' + this.observationCount
                };

                this.plotDataObjects.push(plotDataObject);
                this.plotCostObjects.push(plotCostObject);
                this.plotReplacementObjects.push(plotReplacementCostObject);
                this.plotAdditionObjects.push(plotAdditionCostObject);


                // this.clear();
                this.setState({ dataObjects: this.plotDataObjects, costObjects: this.plotCostObjects, replacementCosts: this.plotReplacementObjects, additionCosts: this.plotAdditionObjects });
                console.timeEnd("learning Time");
            }

            this.allSimCombinations.forEach(combination => {
                console.log(JSON.stringify(combination));
            })

            this.allSimCombinations.forEach(combination => {
                // console.log(JSON.stringify(combination));
                var latexTable = combination.Similarity_Threshold + " & " + combination.Time_Cost + " & " + combination.Functionality_Cost + " & " + combination.Location_Cost + " & " + combination.Graph_Similarity + " \\\\ \n \\hline"
                // console.log(latexTable);
            })

            this.setState({ xValues: this.observations, yValues: this.similarities, cost: this.costs, replacementCost: this.replacementCosts, additionCost: this.additionCosts });
            this.fixGraphPositionsLearnedModel(this.learnedModels.length - 1);
            console.log(this.state)

        } else {
            alert('No traces');
        }

        this.fixGraphPositions();
    }

    setUniqueState() {
        this.setState({ dataObjects: this.uniquePlotDataObjects, costObjects: this.uniquePlotCostObjects, replacementCosts: this.uniquePlotReplacementObjects, additionCosts: this.uniquePlotAdditionObjects });
        console.log(this.state)
    }

    setOriginalState() {
        this.setState({ dataObjects: this.plotDataObjects, costObjects: this.plotCostObjects, replacementCosts: this.plotReplacementObjects, additionCosts: this.plotAdditionObjects });
        console.log(this.state)
    }

    componentDidMount() {
        var init = new Equation("init", "init", 0, 0, 0);
        this.learnedModel = new Graph('LM');
        this.learnedModel.addNode(init, 40, 100);
        this.learnedModel.cy.on('tap', 'node', (evt) => {
            var node = evt.target;
            var foundMetric = false;
            var metricValue;

            this.metrics.forEach(metrics => {
                metrics.forEach(metric => {
                    // console.log(metric)
                    if (metric.learnedNode != null && metric.learnedNode.id() == node.id()) {
                        metricValue = metric;
                        foundMetric = true;
                        return;
                    }
                });
                if (foundMetric == true)
                    return;
            })

            console.log(metricValue)
        });

        this.learnedModel.cy.on('tap', 'edge', (evt) => {
            var node = evt.target;
            console.log(node.data());
        });

        this.learnedModel.cy.on('cxttap  ', 'node ', (evt) => {
            var node = evt.target;
            let newfunction = prompt("Enter new Functionality");

            try {
                var result = math.eval(newfunction, { x: 0 });
            }
            catch (error) {
                console.log('wrong equation format');
                return;
            }

            let newStartTime = prompt("Enter new Start Time");
            let newEndTime = prompt("Enter new End Time");
            let timeStep = prompt("Enter new Time Step");

            if (result != null) {

                var equation = new Equation(node.data('id'), newfunction, newStartTime, newEndTime, new Set(math.range(newStartTime, newEndTime, timeStep, true)._data));
                node.data('functionality', equation);
                node.data('label', node.id() + '[' + newStartTime + ',' + newEndTime + ']');

                var selfEdge = this.learnedModel.cy.getElementById(equation.id + '_' + equation.id);
                selfEdge.data('functionality', newfunction);
                selfEdge.data('label', newfunction);
            }

        });
    }

    clear() {
        this.learnedModel.cy.nodes().filter(node => node.id() != 'init').remove();
        this.observations = [];
        this.observationCount = 0;
        this.similarities = [];
        this.costs = [];
        this.replacementCosts = [];
        this.additionCosts = [];
        this.learnedModels = [];

        this.setState({
            xValues: this.observations, yValues: this.similarities, cost: this.costs, replacementCost: this.replacementCosts, additionCost: this.additionCosts,
            dataObjects: [], costObjects: [], replacementCosts: [], additionCosts: []
        });

    }

    clearState() {
        this.learnedModel.cy.nodes().filter(node => node.id() != 'init').remove();
        this.observations = [];
        this.observationCount = 0;
        this.similarities = [];
        this.costs = [];
        this.replacementCosts = [];
        this.additionCosts = [];

        this.setState({ xValues: this.observations, yValues: this.similarities, cost: this.costs, replacementCost: this.replacementCosts, additionCost: this.additionCosts });


    }
    handleChange(event) {
        var index = event.target.value;
        this.fixGraphPositionsLearnedModel(index);
        this.setState({ selection: index });
    }

    handleChechBox(event) {
        var combination = event.target.value;
        // console.log(combination)
        var Combinatorics = require('js-combinatorics');
        var costCombinations;

        // console.log(costCombinations);

        switch (combination) {
            case 'comb1':
                this.setState({ comb1Check: true, comb2Check: false, comb3Check: false });
                var baseN = Combinatorics.baseN([0.1, 1], 4);
                // var baseN = Combinatorics.baseN([0.01, 1], 4);
                costCombinations = baseN.toArray();
                break;

            case 'comb2':
                this.setState({ comb1Check: false, comb2Check: true, comb3Check: false });
                // var baseN = Combinatorics.baseN([0.1, 0.5, 0.9], 4);
                var baseN = Combinatorics.baseN([0.1, 0.5, 1], 4);
                costCombinations = baseN.toArray();
                break;

            case 'comb3':
                this.setState({ comb1Check: false, comb2Check: false, comb3Check: true });
                // var baseN = Combinatorics.baseN([0, 0.25, 0.5, 0.75, 1], 4);
                var baseN = Combinatorics.baseN([1, 0.5, 0.1, 0.01], 4);
                costCombinations = baseN.toArray();
                break;

        }
        console.log(costCombinations);
        this.combinationSet = costCombinations;
    }

    onGraphClick(clickedData) {
        var pts = '';
        var combinations = [];

        for (var i = 0; i < clickedData.points.length; i++) {
            var x = clickedData.points[i].x;
            var y = clickedData.points[i].y
            var plotData = clickedData.points[i].data;
            var combination = plotData.name;
            pts = 'x = ' + x + '\ny = ' +
                y.toPrecision(4) + '\n\n';

            combinations.push(combination)
        }
        alert('Closest point clicked:\n\n' + pts);
    }

    render() {
        let cyStyle = {
            height: '450px',
            // width: '2000px',
            width: '100%',
            margin: '20px 0px',
            backgroundColor: "lightgray "
        };

        let buttonStyle = {
            margin: '0px 0px -65px 5px',
        };

        return (
            <div>
                <h1>Learning Inputs</h1>
                <TextField
                    id="similarity"
                    label="Similarity Threshold"
                    type="number"
                    defaultValue="0.5"
                    inputProps={{ min: "0.1", step: "0.05", max: "1" }}
                    inputRef={this.similarityInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    margin="normal"
                    variant="outlined"
                />
                <TextField
                    id="timeCost"
                    label="Time Cost"
                    type="number"
                    defaultValue="0.1"
                    inputProps={{ min: "0.1", step: "0.05", max: "1" }}
                    inputRef={this.timecostInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    margin="normal"
                    variant="outlined"
                />
                <TextField
                    id="propagationCost"
                    label="Functionality Cost"
                    type="number"
                    defaultValue="0.1"
                    inputProps={{ min: "0.1", step: "0.05", max: "1" }}
                    inputRef={this.propagationCostInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    margin="normal"
                    variant="outlined"
                />
                <TextField
                    id="locationCost"
                    label="Location Cost"
                    type="number"
                    defaultValue="0.5"
                    inputProps={{ min: "0.1", step: "0.05", max: "1" }}
                    inputRef={this.locationCostInput}
                    InputLabelProps={{
                        shrink: true,
                    }}
                    margin="normal"
                    variant="outlined"
                />

                <label>
                    <Checkbox
                        checked={this.state.comb1Check}
                        onChange={this.handleChechBox}
                        value="comb1"
                        color="primary"
                    />
                    [0.1, 1]
                    {/* [0.01,1] */}
                </label>


                <label>
                    <Checkbox
                        checked={this.state.comb2Check}
                        onChange={this.handleChechBox}
                        value="comb2"
                        color="primary"
                    />

                    {/* [0, 0.5, 1] */}
                    {/* [0.01, 0.5, 1] */}
                    [0.1, 0.5, 1]
                </label>

                <label>
                    <Checkbox
                        checked={this.state.comb3Check}
                        onChange={this.handleChechBox}
                        value="comb3"
                        color="primary"
                    />
                    [1, 0.5, 0.1, 0.01]
                </label>

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.beginLearning}>
                    Learn
                </Button>

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.fixGraphPositions}>
                    Organize
                </Button>

                {/* <Button style={buttonStyle} variant="contained" color="primary" onClick={this.printObservedTraces}>
                    History
                </Button> */}

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.exportModel}>
                    Export Learned Model
                </Button>

                {/* <Button style={buttonStyle} variant="contained" color="primary" onClick={this.exportAllModels}>
                    Export All Models
                </Button> */}

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.exportGraphs}>
                    Export Graphs
                </Button>

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.clear}>
                    Clear
                </Button>

                {/* <Button style={buttonStyle} variant="contained" color="primary" onClick={this.setUniqueState}>
                    Unique State
                </Button>

                <Button style={buttonStyle} variant="contained" color="primary" onClick={this.setOriginalState}>
                    Reset State
                </Button> */}

                <br></br>
                <h2>Learned Model</h2>
                <div style={cyStyle} id="LM" />

                Learned Models
                <Select
                    value={this.state.selection}
                    onChange={this.handleChange}
                    inputProps={{
                        name: 'models',
                        id: 'learned-models',
                    }}
                >
                    {
                        this.learnedModels.map((el, i) => (<MenuItem key={i.toString()} value={i}> {el.combination + ' obs ' + el.obsCount} </MenuItem>))
                    }

                </Select>

                {/* Unique Models
                <Select
                    value={this.state.selection}
                    onChange={this.handleChange}
                    inputProps={{
                        name: 'models',
                        id: 'learned-models',
                    }}
                >
                    {
                        this.uniqueLearnedModels.map((el, i) => (<MenuItem value={i}> {el.combination + ' obs ' + el.obsCount} </MenuItem>))
                    }

                </Select> */}

                <input type="file" id="input" accept=".json" />

                <Button variant="contained" color="primary" onClick={this.importModel}>
                    Import Original Model
                </Button>

                <h2>Original Model</h2>
                <div style={cyStyle} id="OM" />

                <Plot id="similarityGraph"
                    data={this.state.dataObjects}
                    layout={{ width: 1000, height: 1000, title: 'Graph Nodes Similarity' }}
                    onClick={(data) => this.onGraphClick(data)}
                />

                <Plot
                    data={this.state.costObjects}
                    layout={{ width: 1000, height: 1000, title: ' Taken Costs' }}
                />

                <Plot
                    data={this.state.replacementCosts}
                    layout={{ width: 1000, height: 1000, title: 'Replacement Costs' }}
                />

                <Plot
                    data={this.state.additionCosts}
                    layout={{ width: 1000, height: 1000, title: 'Addition Costs' }}
                />

                {/* <Button variant="contained" color="primary" onClick={this.changeStyle}>
                    Change Style
                </Button> */}

            </div >
        );
    };
}

const mapStateToProps = (state) => {
    console.log('Learner State');
    console.log(state);

    return {
        equations: state.state.fittedEquations,
        timeStep: state.state.timeStep
    };
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({ learnedModelAction }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Learner);

