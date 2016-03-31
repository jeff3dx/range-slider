import React, { Component } from 'react';
import applyStyles from 'react-css-modules';
import styles from './index.less';
import { autobind } from 'core-decorators';
import RangeSelector from './range-selector';

export default
@applyStyles(styles)
class IndexPage extends Component {
    @autobind
    didClick() {
        alert('you clicked me!');
    }

    onChange(range) {
        console.debug(range.toString());
    }

    render() {
        return (
            <div>
                <RangeSelector range={[150, -250]} onChange={this.onChange}/>
            </div>
        );
    }
}
