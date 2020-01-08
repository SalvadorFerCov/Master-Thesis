import cytoscape from 'cytoscape';
import { posix } from 'path';
import math from 'mathjs';
import { node } from 'prop-types';
import Metric from '../classes/Metric';

import dagre from 'cytoscape-dagre';
cytoscape.use(dagre);

class Graph {
    constructor(name) {
        this.name = name;
        this.cy = cytoscape({
            container: document.getElementById(this.name),
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': 'black',
                        'label': 'data(label)',
                        'text-halign': 'center',
                        'text-valign': 'bottom',
                        'text-wrap': 'wrap'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'label': 'data(label)',
                        'target-arrow-shape': 'vee',
                        'mid-target-arrow-shape': 'vee',
                        'text-margin-y': -20,
                        'text-wrap': 'wrap'
                    }
                }
            ],
            wheelSensitivity: 0.1
        });
    }

    addNode(equation, posX, posY) {
        var label = equation.id + '[' + equation.startTime + ',' + equation.endTime + ']';
        this.cy.add({
            group: 'nodes',
            data: { id: equation.id, functionality: equation, label: label, similarNodeId: null, similarity: null, weight: 1 },
            position: { x: posX, y: posY }
        });

        return equation.id;
    }

    addOutgoingEdge(sourceNodeId, targetNodeId, upperBound) {
        // var guard = 't >= ' + upperBound;
        var guard = "";
        this.cy.add({
            group: 'edges', data: {
                id: sourceNodeId + '_' + targetNodeId, source: sourceNodeId, target: targetNodeId,
                guard: guard, label: guard, matched: false
            }
        })
    }

    addSelfEdge(sourceNodeId, label) {
        this.cy.add({
            group: 'edges', data: {
                id: sourceNodeId + '_' + sourceNodeId, source: sourceNodeId, target: sourceNodeId, weight: 1
                , label: label, matched: false
            }
        })
    }

    depthFirstSearch() {
        console.log('DFS');
        this.cy.elements().depthFirstSearch({
            roots: '#init',
            visit: function (v, e, u, i, depth) {
                console.log('visit ' + v.id());
                if (e != null)
                    console.log(e.data());
            },
            directed: true
        });
    }

    breadthFirstSearch() {
        var nodeList = [];
        var edgeList = [];

        this.cy.elements().breadthFirstSearch({
            roots: '#init',
            visit: function (currentNode, currentEdge, previousNode, index, depth) {
                // console.log('visit ' + currentNode.id());
                if (currentNode.id() != 'init')
                    nodeList.push({ node: currentNode, depth: depth, predecessor: previousNode });
                if (currentEdge != null && !currentEdge.isLoop())
                    edgeList.push({ edge: currentEdge, depth: depth });
            },
            directed: true
        });

        return { nodes: nodeList, edges: edgeList };
    }

    breadthFirstSearchPropagation(nodeId, mergedEquation) {
        var metric = new Metric();
        var propagation = [];
        var mergedFunction = mergedEquation.fittedFunction;
        var mergedTimes = mergedEquation.timeSteps;
        var mergedPoints = metric.evaluateFunction(mergedFunction, mergedTimes);
        var similarityImprovement = 0;
        // console.log('Propagating ' + nodeId)
        this.cy.elements().breadthFirstSearch({
            roots: '#' + nodeId,
            visit: function (currentNode, currentEdge, previousNode, index, depth) {
                console.log('visiting nodes of depth ' + depth)
                if (previousNode != null)
                    console.log(previousNode.id());
                console.log(currentNode.id())
                if (depth == 0) {
                    // var currentNode = this.learnedModel.cy.getElementById(successor.learnedNodeId);
                    var nodePoints = metric.evaluateFunction(currentNode.data('functionality').fittedFunction, mergedTimes);
                    var euclideanDistance = metric.getOneDimensionEuclideanDistance(currentNode.id(), nodePoints, mergedPoints);
                }
                else {
                    // var previousFunction = previousNode.data('functionality').fittedFunction;
                    // var timeSteps = previousNode.data('functionality').timeSteps;
                    // var nodePoints = metric.evaluateFunction(previousFunction, timeSteps);
                    // var euclideanDistance = metric.getOneDimensionEuclideanDistance(currentNode.id(), nodePoints, mergedPoints);
                }
                var newSimilarity = euclideanDistance.similarity;
                var oldSimilarity = currentNode.data('similarity');
                var change = {
                    changedEquation: currentNode.data('functionality'),
                    oldSimilarity: oldSimilarity,
                    newEquation: mergedEquation,
                    newSimilarity: newSimilarity,
                    improvement: newSimilarity - oldSimilarity
                };

                propagation.push(change);

                similarityImprovement += (newSimilarity - oldSimilarity);

                if (newSimilarity <= oldSimilarity)
                    currentNode.style('background-color', 'blue');
                else
                    currentNode.style('background-color', 'red');

            },
            directed: true
        });

        return { improvement: similarityImprovement, propagation: propagation, bestChange: null };
    }
}

export default Graph;