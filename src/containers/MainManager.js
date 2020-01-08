import React from 'react';
import AppBar from '@material-ui/core/AppBar';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import DataManager from './DataManager';
import DataFitter from '../components/DataFitter';
import Report from '../components/Report';
import Learner from '../components/Learner';
import GraphMatcher from '../components/GraphMatcher';

function TabManager(props) {
    return (
        <Typography component="div" style={{ padding: 8 * 3 }}>
            {props.children}
        </Typography>
    );
}

class MainManager extends React.Component {
    constructor(props) {
        super(props);
        this.handleChange = this.handleChange.bind(this);
        this.state = {
            value: 0,
        };
    }

    handleChange(event, value) {
        this.setState({ value });
    }

    render() {
        const { value } = this.state;

        return (
            <div>
                <AppBar position="static">
                    <Tabs value={value} onChange={this.handleChange}>
                        <Tab label="Data Manager" />
                        <Tab label="Fitter Manager" />
                        {/* <Tab label="Report" /> */}
                        <Tab label="Learner" />
                        <Tab label="Graph Matcher" />

                    </Tabs>
                </AppBar>

                {value === 0 && <TabManager><DataManager></DataManager></TabManager>}
                {value === 1 && <TabManager><DataFitter ></DataFitter> </TabManager>}
                {/* {value === 2 && <TabManager><Report ></Report> </TabManager>} */}
                {value === 2 && <TabManager><Learner ></Learner> </TabManager>}
                {value === 3 && <TabManager><GraphMatcher ></GraphMatcher> </TabManager>}

            </div>
        );
    }
}

export default MainManager;