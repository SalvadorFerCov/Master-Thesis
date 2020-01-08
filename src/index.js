import React from "react";
import ReactDOM from "react-dom";
import MainManager from "./containers/MainManager";
import { Provider } from 'react-redux';
import { store } from './store/index'

ReactDOM.render(
    < Provider store={store} >
        <MainManager />
    </Provider >,
    document.getElementById("app")
);
