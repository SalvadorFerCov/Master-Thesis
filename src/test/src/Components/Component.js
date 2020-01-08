import React from 'react';
import Regression from '../../../components/Regression';
import renderer from 'react-test-renderer';
import { shallow } from 'enzyme';
import { configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({ adapter: new Adapter() });

test.skip('Regression component test', () => {
    const component = renderer.create(
        <Regression></Regression>,
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();

    // console.log(tree);

    const regression = shallow(<Regression></Regression>);
    // console.log(regression);

    const instance = regression.instance();
    // console.log(instance);

    expect(regression.state('data')).toBe('');
});