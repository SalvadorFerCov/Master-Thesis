# Master-Thesis
Implementation for the paper: Incremental Measurement of Model Similarities in Probabilistic Timed Automata Learning
https://www.sts.tuhh.de/pw-and-m-theses/2019/salvador19.pdf

This tool is used to analyze, learn and visualize results from UPPAAL (http://www.uppaal.org/) model simulations. 

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. 

### Prerequisites

You need to have the following environmental setup

```
NodeJS and NPM
```

### Installing

Run the following command to install all of the needed dependencies 

```
npm install 
```

Once the dependencies have been installed, execute the following command to run the program in development mode

```
npm run start
```

## Running the tests

The tests can be run by using the following command

```
npm run test
```

## Building the project

The project can be built by running the following command
```
npm run build
```

The bundle is located in the dist folder

## How to use

- Choose a simulation run file (txt) exported from an UPPAAL model simulator. Simulation files can be found in the experiments folder, and UPPAAL model examples can be found in the uppaal models folder. 
- Click fit, to fit the curve of the data of the simulation
- Navigate to the FITTER MANAGER tab to see the fitted equations
- Navigate to the LEARNER tab to learn the model based on its simulations
- Choose the desired learning parameters and click the learn button. One can import the original model from which the simulation were taken, to match and learn two models simultaneously. Graph must be on JSON format for the library to parse it, examples   can be found on the json graphs folder. 
- Navigate to the GRAPH MATCHER tab to match two graphs against each other 
- More details regarding this tool can be found on the research paper mentioned above

## Built With
* [ReactJS](https://reactjs.org/) - JavaScript Framework
* [Redux](https://redux.js.org/) - State Container 
* [Cytoscape](https://js.cytoscape.org/) - Graph Theory Library
* [ml-levenberg-marquardt](https://github.com/mljs/levenberg-marquardt) - Curve Fitting Library
* [Jest](https://jestjs.io/) - Testing

## Author

* **Salvador Fernandez Covarrubias** - *Master Thesis*
