import React, { Component } from 'react';
import applyStyles from 'react-css-modules';
import styles from './index.less';
import { autobind } from 'core-decorators';
import RangeSlider from './range-slider/';

export default
@applyStyles(styles)
class IndexPage extends Component {
    @autobind
    didClick() {
        alert('you clicked me!');
    }

    onChange(low, high) {
        console.debug([low, high]);
    }


    render() {
        return (
            <div>
                <RangeSlider onChange={this.onChange}/>
            </div>
        );
    }
}
