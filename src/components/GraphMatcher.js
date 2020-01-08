import React, { Component } from 'react';
import Equation from '../classes/Equation';
import Graph from '../classes/Graph';
import Button from '@material-ui/core/Button';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import math from 'mathjs';

class GraphMatcher extends Component {
    constructor(props) {
        super(props);

        this.originalModel;
        this.learnedModel;
        this.matchedModel;

        this.importModel = this.importModel.bind(this);
        this.importLearnedModel = this.importLearnedModel.bind(this);
        this.fixGraphPositions = this.fixGraphPositions.bind(this);
        this.matchGraphs = this.matchGraphs.bind(this);

        this.matchedNodes = [];
    }


    componentDidMount() {
        var init = new Equation("init", "init", 0, 0, 0);

        if (this.originalModel == null) {
            this.originalModel = new Graph('OM');
            this.originalModel.addNode(init, 40, 100);
        }

        if (this.props.learnedModel != null) {
            this.learnedModel = new Graph('LM');
            this.learnedModel.cy.json(this.props.learnedModel)
        } else {
            this.learnedModel = new Graph('LM');
            this.learnedModel.addNode(init, 40, 100);
        }

        this.matchedModel = new Graph('MM');
        this.matchedModel.addNode(init, 40, 100);
    }

    importModel() {
        const selectedFile = document.getElementById('input').files[0];
        var reader = new FileReader();
        var json;

        reader.onload = function (evt) {
            json = JSON.parse(evt.target.result);
        };

        if (selectedFile != null)
            reader.readAsText(selectedFile);

        reader.onloadend = () => {
            this.originalModel = new Graph('OM');
            this.originalModel.cy.json(json)
            this.fixGraphPositions();
        }

    }

    importLearnedModel() {
        const selectedFile = document.getElementById('input').files[0];
        var reader = new FileReader();
        var json;

        reader.onload = function (evt) {
            json = JSON.parse(evt.target.result);
        };

        if (selectedFile != null)
            reader.readAsText(selectedFile);

        reader.onloadend = () => {
            // console.log('finished')
            this.learnedModel = new Graph('LM');
            this.learnedModel.cy.json(json)
            this.fixGraphPositions();
        }

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
            var layout2 = this.originalModel.cy.layout({
                name: 'breadthfirst',
                directed: true,
                roots: '#init'
            });

            layout2.run();
        }

        if (this.matchedModel != null) {
            var layout3 = this.matchedModel.cy.layout({
                name: 'breadthfirst',
                directed: true,
            });

            layout3.run();
        }

    }

    matchGraphs() {
        var learnedNodes = this.learnedModel.breadthFirstSearch().nodes;
        var learnedEdges = this.learnedModel.breadthFirstSearch().edges;

        var originalNodes = this.originalModel.breadthFirstSearch().nodes;
        var originalEdges = this.originalModel.breadthFirstSearch().edges;

        var allOriginalEdges = this.originalModel.cy.edges();
        allOriginalEdges.forEach(edge => edge.data('matched', false));

        learnedNodes.forEach((learnedNode) => {
            var depth = learnedNode.depth;
            var sameDepthNodes = originalNodes.filter(node => node.depth == depth);
            var sameDepthEdges = originalEdges.filter(edge => edge.depth == depth);

            if (sameDepthNodes.length > 0) {
                this.matchNodes(learnedNode, sameDepthNodes, sameDepthEdges);
            }
        });

        // console.log(originalEdges);
        console.log('matched nodes')
        console.log(this.matchedNodes)

        this.fixGraphPositions();
    }

    matchNodes(learnedNode, sameDepthNodes, sameDepthEdges) {
        var predecessor = learnedNode.predecessor;
        var node = learnedNode.node;
        var observedEquation = node.data('functionality');
        var distances = this.calculateNeighborsEuclideanDistance(sameDepthNodes, observedEquation);
        var allSimilarities = [];

        distances.forEach((distance) => {
            allSimilarities.push(distance.similarity);
        });

        var bestSimilarity = math.max(...allSimilarities);
        var bestSimilarities = distances.filter(distance => distance.similarity == bestSimilarity);
        var bestMatch = bestSimilarities[0];
        var matchedNode = this.originalModel.cy.getElementById(bestMatch.nodeId);

        console.log(bestMatch);

        this.matchedNodes.push({ matchedNode: matchedNode, learnedNode: node, similarity: bestMatch.similarity });
        this.matchEdges(matchedNode, node, sameDepthEdges, predecessor);

    }

    matchEdges(matchedNode, learnedNode, sameDepthEdges, predecessor) {
        var matchedNodeEdges = matchedNode.incomers('edge').filter(edge => !edge.isLoop());
        var learnedNodeEdges = learnedNode.incomers('edge').filter(edge => !edge.isLoop());

        var eq = matchedNode.data('functionality');
        // var originalId = matchedNode.id();
        var graphElement = this.matchedModel.cy.getElementById(eq.id);

        while (graphElement.isNode()) {
            eq.id += '\'';
            graphElement = this.matchedModel.cy.getElementById(eq.id);
        }

        var addedNodeId = this.matchedModel.addNode(eq, 0, 0);
        this.matchedModel.addSelfEdge(addedNodeId, eq.fittedFunction);
        this.matchedModel.addOutgoingEdge(predecessor.id(), addedNodeId, eq.endTime);

        var addedNode = this.matchedModel.cy.getElementById(eq.id);
        addedNode.data('learnedModelId', matchedNode.id());

        var matchedEdge = predecessor.id() + '_' + matchedNode.id();

        var originalEdge = this.originalModel.cy.getElementById(matchedEdge);
        var edgeMatched = originalEdge.data('matched');
        console.log('EDGE DATA')
        console.log(originalEdge.data())

        if (edgeMatched == false) {
            var matchedEdge = this.matchedModel.cy.getElementById(predecessor.id() + '_' + addedNodeId);
            matchedEdge.style('line-color', 'green');
            matchedEdge.style('background-color', 'green');

            originalEdge.data('matched', true)
            console.log('Matched Edge')
            console.log(originalEdge.data());
        } else {
            var matchedEdge = this.matchedModel.cy.getElementById(predecessor.id() + '_' + addedNodeId);
            matchedEdge.style('line-color', 'red');
            matchedEdge.style('background-color', 'red');
        }

    }

    // matchEdges(matchedNode, learnedNode, sameDepthEdges, predecessor) {
    //     var matchedNodeEdges = matchedNode.incomers('edge').filter(edge => !edge.isLoop());
    //     var learnedNodeEdges = learnedNode.incomers('edge').filter(edge => !edge.isLoop());
    //     var labeledLearnedEdges = [];

    //     learnedNodeEdges.forEach(learnedEdge => {
    //         var sourceId = learnedEdge.source().id();
    //         var targetId = learnedEdge.target().id();

    //         if (sourceId == learnedNode.id())
    //             sourceId = matchedNode.id();

    //         if (targetId == learnedNode.id())
    //             targetId = matchedNode.id();

    //         labeledLearnedEdges.push({ sourceId: sourceId, targetId: targetId })
    //     });

    //     var foundEdges = [];
    //     var notFoundEdges = [];

    //     labeledLearnedEdges.forEach(labelledEdge => {
    //         var matched = matchedNodeEdges.some(function (edge) {
    //             var sourceId = edge.source().id();
    //             var targetId = edge.target().id();

    //             return sourceId == labelledEdge.sourceId && targetId == labelledEdge.targetId;
    //         });

    //         if (matched)
    //             foundEdges.push(labelledEdge);
    //         else
    //             notFoundEdges.push(labelledEdge);
    //     })



    //     console.log('found edges')
    //     console.log(foundEdges);

    //     console.log('not found edges')
    //     console.log(notFoundEdges);

    //     sameDepthEdges.forEach(sameDepthEdge => {
    //         sameDepthEdge.edge.data('matched', false);
    //     });

    //     // console.log('sameDepthEdges');
    //     // console.log(sameDepthEdges);

    //     var eq = matchedNode.data('functionality');
    //     var originalId = matchedNode.id();
    //     var graphElement = this.matchedModel.cy.getElementById(eq.id);

    //     while (graphElement.isNode()) {
    //         eq.id += '\'';
    //         graphElement = this.matchedModel.cy.getElementById(eq.id);
    //     }

    //     var addedNodeId = this.matchedModel.addNode(eq, 0, 0);
    //     this.matchedModel.addSelfEdge(addedNodeId, eq.fittedFunction);

    //     foundEdges.forEach(foundEdge => {
    //         var sourceId = foundEdge.sourceId;
    //         var targetId = foundEdge.targetId;

    //         if (sourceId == originalId)
    //             sourceId = addedNodeId;

    //         if (targetId == originalId)
    //             targetId = addedNodeId;

    //         var upperBound;

    //         if (sourceId == 'init')
    //             upperBound = 0;
    //         else
    //             upperBound = eq.startTime;

    //         var matchedEdge = false;

    //         sameDepthEdges.forEach(sameDepthEdge => {
    //             var edge = sameDepthEdge.edge;
    //             if (edge.source().id() == sourceId && edge.target().id() == targetId && edge.data('matched') == false) {
    //                 matchedEdge = true;
    //                 edge.data('matched', true);
    //             }
    //         })

    //         this.matchedModel.addOutgoingEdge(sourceId, targetId, upperBound);

    //         var addedEdge = this.matchedModel.cy.getElementById(sourceId + '_' + targetId);
    //         var addedNode = this.matchedModel.cy.getElementById(addedNodeId);

    //         var label = addedNode.data('label');
    //         label += '\n lm: ' + learnedNode.id();
    //         label += '\n om: ' + matchedNode.id();
    //         addedNode.data('label', label);

    //         if (matchedEdge == true) {
    //             addedEdge.style('line-color', 'green');
    //             addedNode.style('background-color', 'green');
    //         } else {
    //             addedEdge.style('line-color', 'red');
    //             addedNode.style('background-color', 'red');
    //         }
    //         //TO-DO remove added edges

    //     })

    // }

    calculateNeighborsEuclideanDistance(sameDepthNodes, observedEquation) {
        var neighborhoodSize = sameDepthNodes.length;
        var euclideanDistances = [];

        for (let i = 0; i < neighborhoodSize; i++) {
            var node = sameDepthNodes[i].node;
            var neighborFunction = node.data('functionality').fittedFunction;
            var neighborTimeSteps = node.data('functionality').timeSteps;
            var observedFunction = observedEquation.fittedFunction;
            var neighborPoints = this.evaluateFunction(neighborFunction, neighborTimeSteps);
            var observedPoints = this.evaluateFunction(observedFunction, neighborTimeSteps);
            var euclideanDistance = this.getOneDimensionEuclideanDistance(node.id(), neighborPoints, observedPoints);

            euclideanDistances.push(euclideanDistance);
        }

        return euclideanDistances;
    }

    evaluateFunction(evalFunction, timeSteps) {
        var y;
        var yPoints = [];

        // console.log(timeSteps);

        timeSteps.data.forEach((timeStep) => {
            y = math.eval(evalFunction, { x: timeStep });
            yPoints.push(y);
        });

        return yPoints;
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

    render() {
        let cyStyle = {
            height: '450px',
            // width: '2000px',
            width: '100%',
            margin: '20px 0px',
            backgroundColor: "lightgray "
        };


        return (
            <div>
                <h1>Original Model</h1>

                <br></br>

                <input type="file" id="input" accept=".json" />

                <Button variant="contained" color="primary" onClick={this.importModel}>
                    Import Model
                </Button>

                <Button variant="contained" color="primary" onClick={this.importLearnedModel}>
                    Import Learned Model
                </Button>

                <Button variant="contained" color="primary" onClick={this.fixGraphPositions}>
                    Organize
                </Button>

                <Button variant="contained" color="primary" onClick={this.matchGraphs}>
                    Match
                </Button>

                <div style={cyStyle} id="OM" />

                <br></br>

                <h1>Learned Model</h1>

                <br></br>

                <div style={cyStyle} id="LM" />

                <h1>Matched Model</h1>

                <br></br>

                <div style={cyStyle} id="MM" />

            </div >
        );
    };
}

const mapStateToProps = (state) => {
    // console.log('Comparator State');
    // console.log(state);

    return {
        learnedModel: state.state.learnedModel
    };
}

const mapDispatchToProps = (dispatch) => {
    return bindActionCreators({}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(GraphMatcher);

