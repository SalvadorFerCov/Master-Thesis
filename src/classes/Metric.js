import math from 'mathjs';

class Metric {
    constructor() {
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

export default Metric;