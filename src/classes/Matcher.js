import math from 'mathjs';

class Matcher {
    constructor() {
        this.learnedModel;
        this.originalModel;
        this.matchedNodes = [];
        this.matchedEdges = [];
        this.lostTimes = [];
    }

    matchGraphs(learnedModel, originalModel) {
        this.learnedModel = learnedModel;
        this.originalModel = originalModel;

        var learnedNodes = this.learnedModel.breadthFirstSearch().nodes;
        var originalNodes = this.originalModel.breadthFirstSearch().nodes;
        var originalEdges = this.originalModel.breadthFirstSearch().edges;

        learnedNodes.forEach((learnedNode) => {
            var depth = learnedNode.depth;
            var sameDepthNodes = originalNodes.filter(node => node.depth == depth);
            var sameDepthEdges = originalEdges.filter(edge => edge.depth == depth);

            if (sameDepthNodes.length > 0) {
                this.matchNodes(learnedNode.node, sameDepthNodes, sameDepthEdges, learnedNode.predecessor);
            }
        });

        var originalNodeList = this.originalModel.cy.nodes().filter(node => node.id() != 'init');
        var learnedModelNodeList = this.learnedModel.cy.nodes().filter(node => node.id() != 'init');
        var numberOfOriginalNodes = originalNodeList.length;
        var numberOfLearnedNodes = learnedModelNodeList.length;
        var nodesToMatch = math.max([numberOfOriginalNodes, numberOfLearnedNodes]);
        var learnedSimilarity = 0;
        var maximumLearnedSimilarity = 0;
        var count = 0;
        var uniqueMatches = [];

        this.matchedNodes.forEach(node => {
            learnedSimilarity += node.similarity
            var matchedNodeId = node.matchedNode.id();
            if (count <= numberOfOriginalNodes && !uniqueMatches.includes(matchedNodeId)) {
                maximumLearnedSimilarity += node.similarity;
                uniqueMatches.push(matchedNodeId)
            }

            count++;
        })

        var graphNodesSimilarity = maximumLearnedSimilarity / nodesToMatch;
        this.matchedNodes.push({ graphSimilarity: graphNodesSimilarity, matchedEdges: this.matchedEdges, lostTimes: this.lostTimes })

        return this.matchedNodes;
    }

    matchNodes(learnedNode, sameDepthNodes, sameDepthEdges, predecessor) {
        var learnedEquation = learnedNode.data('functionality');
        var distances = this.calculateNeighborsEuclideanDistance(sameDepthNodes, learnedEquation);
        var allSimilarities = [];

        distances.forEach((distance) => {
            allSimilarities.push(distance.similarity);
        });

        var bestSimilarity = math.max(...allSimilarities);
        var bestSimilarities = distances.filter(distance => distance.similarity == bestSimilarity);
        var bestMatch = bestSimilarities[0];
        var matchedNode = this.originalModel.cy.getElementById(bestMatch.nodeId);

        var matchedObservation = matchedNode.data('functionality');
        var constraints = this.compareTimeConstraints(learnedEquation, matchedNode);
        var timesBefore = constraints.timesBefore;
        var timesafter = constraints.timesAfter;

        if (timesBefore.size > 0)
            this.lostTimes.push(timesBefore)

        if (timesafter.size > 0)
            this.lostTimes.push(timesafter)

        var matchedEdge = this.matchEdges(matchedNode, learnedNode, sameDepthEdges, predecessor);
        this.matchedNodes.push({ matchedNode: matchedNode, learnedNode: learnedNode, similarity: bestMatch.similarity, matchedEdge: matchedEdge });

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

    matchEdges(matchedNode, learnedNode, sameDepthEdges, predecessor) {
        var matchedEdge = predecessor.id() + '_' + matchedNode.id();
        var originalEdge = this.originalModel.cy.getElementById(matchedEdge);
        // console.log('originalEdge')
        // console.log(originalEdge)
        var edgeAlreadyMatched = originalEdge.data('matched');

        // console.log('EDGE DATA')
        // console.log(originalEdge.data())
        if (edgeAlreadyMatched == false) {
            originalEdge.data('matched', true)
            // console.log('Matched Edge')
            // console.log(originalEdge.data());
            this.matchedEdges.push({ originalEdge: originalEdge, learnedNode: learnedNode, matchedNode: matchedNode });
            return true;
        } else {
            // console.log('DID NOt Matched Edge')
            // console.log(originalEdge.data());
            return false;

        }

    }

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

}

export default Matcher;