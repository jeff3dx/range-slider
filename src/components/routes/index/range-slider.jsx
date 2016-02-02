import React, { Component, PropTypes } from 'react';
import applyStyles from 'react-css-modules';
import styles from './range-slider.less';
import { autobind } from 'core-decorators';
import d3 from 'd3';

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
function generateTestData() {
    let result = [];
    for (let i = 0; i < 100; i++) {
        result.push({
            value: random(1, 1000)
        });
    }
    return result;
}


const RC = 4;  // svg rounded corners


/**
 * Range selector
 * @param {array} data
 * @param {function} onChange returns {low, high}
 * @param {string} valueProp Property name containing the range value
 * @param {number} [width=800]
 * @param {number} [height=60]
 * @param {number} [padLeft=40]
 * @param {number} [padRight=40]
 * @param {number} [trackHeight=25]
 * @param {number} [round=0] round output values to this many places
 *
 * Width and height can be dynamic by wrapping in the utils/Resizer component
 *
 * @example
 * <Resizer>
 *     <RangeSelector data={myArray} valueProp={'x'} onChange={myHandler}/>
 * </Resizer>
 */
export default
@applyStyles(styles)
class RangeSlider extends Component {
    static propTypes = {
        data: PropTypes.arrayOf(PropTypes.shape({})),
        height: PropTypes.number,
        onChange: PropTypes.func,
        padLeft: PropTypes.number,
        padRight: PropTypes.number,
        trackHeight: PropTypes.number,
        width: PropTypes.number,
        valueProp: PropTypes.string,
        round: PropTypes.boolean
    }


    static defaultProps = {
        data: generateTestData(),
        height: 65,
        tickHeight: 25,
        padLeft: 40,
        padRight: 40,
        round: 0,
        trackHeight: 25,
        width: 800,
        valueProp: 'value',
    }


    bar = null;
    currentHighRange = 0;    // pixels
    currentLowRange = 0;     // pixels
    handleLeft = null;
    handleRight = null;
    track = null;
    valueLeft = null;
    valueRight = null;


    componentDidMount() {
        this.currentLowRange = 0;
        this.currentHighRange = this.size.trackWidth;
        this.setupD3();
        this.updatePositions(this.currentLowRange, this.currentHighRange);
    }


    componentWillUpdate() {
        this._size = null;
        this._handleSize = null;
        this._scale = null;
    }


    // Dragging is handled by D3 and does not trigger an update, but new data
    // or a resize will trigger an update and redraw at the new size
    componentDidUpdate() {
        this.setupD3();
        this.updatePositions(this.currentLowRange, this.currentHighRange);
    }


    _scale = null;
    get scale() {
        if (!this._scale) {
            const ext = d3.extent(this.props.data, d => d[this.props.valueProp]);
            this._scale = d3.scale.linear()
                .domain(ext)
                .rangeRound([0, this.size.trackWidth]);
        }
        return this._scale;
    }


    _size = null;
    get size() {
        if (!this._size) {
            const barY = 2;
            const handleHeight = this.props.height - this.props.trackHeight;
            const trackY = this.props.height - this.props.trackHeight;
            const barHeight = this.props.trackHeight - barY;
            const trackWidth = this.props.width - this.props.padLeft - this.props.padRight;
            this._size = {
                barHeight,
                barY,
                handleHeight,
                trackY,
                trackWidth,
            };
        }
        return this._size;
    }


    _handleSize = null;
    get handleSize() {
        if (!this._handleSize) {
            const width = 40;
            const arrowHeight = 10;
            const arrowWidth = 20;
            const handleHeight = this.props.height - this.props.trackHeight;
            const boxHeight = handleHeight - arrowHeight;
            const mid = width / 2;
            const arrowMid = arrowWidth / 2;
            const textY = (boxHeight / 2) + 5;
            this._handleSize = {
                arrowHeight,
                arrowMid,
                boxHeight,
                handleHeight,
                mid,
                textY,
                width
            };
        }
        return this._handleSize;
    }


    round(n) {
        return Math.round(n, this.round);
    }


    /**
     * Defines the D3 drag behavior object, sets up drag x values,
     * and attaches drag behavior to each SVG element
     */
    setupD3() {
        const self = this;

        const drag = d3.behavior.drag()
            .origin(d => d)
            .on('drag', d => {
                const delta = d3.event.sourceEvent.movementX;
                dragHandler(d.type, delta);
            });

        this.track = d3.selectAll('.track');
        this.bar = d3.selectAll('.bar')
            .data([{ x: 0, y: 0, type: 'bar' }]);

        this.handleLeft = d3.selectAll('.handle.left')
            .data([{ x: self.currentLowRange, y: 0, type: 'handle-left' }]);

        this.handleRight = d3.selectAll('.handle.right')
            .data([{ x: self.currentHighRange, y: 0, type: 'handle-right' }]);

        this.valueLeft = d3.selectAll('.handle.left text');
        this.valueRight = d3.selectAll('.handle.right text');

        this.bar.call(drag);
        this.handleLeft.call(drag);
        this.handleRight.call(drag);

        // on a track click jump middle of bar to click position
        this.track.on('click', (d, i) => {
            const rangeMid = self.currentLowRange + ((self.currentHighRange - self.currentLowRange) / 2) + this.props.padLeft;
            const delta = d3.event.x - rangeMid;
            dragHandler('bar', delta);
        });

        /**
         * Drag event handler. Called by D3 drag behavior. Applies constraint logic
         * based on which element was dragged then updates positions of the other elements
         */
        function dragHandler(type, delta) {
            const min = 0;
            const max = self.size.trackWidth;
            const rangeSize = self.currentHighRange - self.currentLowRange;
            let nextLow = self.currentLowRange;
            let nextHigh = self.currentHighRange;

            // movement contraint logic
            if (type === 'bar') {
                nextLow = self.currentLowRange + delta;
                nextHigh = self.currentHighRange + delta;
                if (delta < 0 && nextLow < min) {
                    nextLow = min;
                    nextHigh = Math.min(max, nextLow + rangeSize);
                } else if (delta >= min && nextHigh > max) {
                    nextHigh = max;
                    nextLow = Math.max(0, nextHigh - rangeSize);
                }
            } else if (type === 'handle-left') {
                nextLow = self.currentLowRange + delta;
                if (delta < 0 && nextLow < min) {
                    nextLow = min;
                } else if (delta >= 0 && nextLow > (nextHigh - 1)) {
                    nextLow = Math.max(0, nextHigh - 1);
                }
            } else if (type === 'handle-right') {
                nextHigh = self.currentHighRange + delta;
                if (delta < 0 && nextHigh < nextLow + 1) {
                    nextHigh = Math.min(max, nextLow + 1);
                } else if (delta >= 0 && nextHigh > max) {
                    nextHigh = max;
                }
            }
            self.updatePositions(nextLow, nextHigh);
        }
    }


    @autobind
    updatePositions(low, high) {
        this.bar.data().x = low;
        this.bar.attr('transform', `translate(${low},${this.size.barY})`);
        this.bar.selectAll('rect').attr('width', high - low);

        this.handleLeft.data().x = low;
        this.handleLeft.attr('transform', `translate(${low},0)`);
        this.valueLeft.text(this.round(this.scale.invert(low)));

        this.handleRight.data().x = high;
        this.handleRight.attr('transform', `translate(${high},0)`);
        this.valueRight.text(this.round(this.scale.invert(high)));

        // fire the change event if they changed
        if (low !== this.currentLowRange || high !== this.currentHighRange) {
            this.currentLowRange = low;
            this.currentHighRange = high;
            this.props.onChange(this.round(this.scale.invert(low)), this.round(this.scale.invert(high)));
        }
    }


    @autobind
    renderGradients() {
        return (
            <defs>
                <linearGradient id="grad-handle-box" x1="0" y1="0" x2="0" y2="120%">
                    <stop offset="0%" style={{ stopColor: '#687180', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-handle-arrow" x1="0" y1="-500%" x2="0" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#687180', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-track" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#232A32', stopOpacity: 1 }} />
                    <stop offset="5%" style={{ stopColor: '#434952', stopOpacity: 1 }} />
                    <stop offset="20%" style={{ stopColor: '#707880', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#888DA0', stopOpacity: 1 }} />
                </linearGradient>
                <linearGradient id="grad-bar" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#43688A', stopOpacity: 1 }} />
                    <stop offset="10%" style={{ stopColor: '#639ACC', stopOpacity: 1 }} />
                    <stop offset="95%" style={{ stopColor: '#659DD1', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#5F93C4', stopOpacity: 1 }} />
                </linearGradient>
            </defs>
        );
    }


    @autobind
    arrowPath() {
        return [
            `m ${0 - this.handleSize.arrowMid},0`,
            `L ${this.handleSize.arrowMid},0`,
            `L 0,${this.handleSize.arrowHeight}`,
            'z'
        ].join(' ');
    }


    @autobind
    renderHandle(side, value) {
        return (
            <g className={`handle ${side}`} transform={`translate(${value},0)`}>
                <g transform={`translate(${0 - this.handleSize.mid},0)`}>
                    <rect width={this.handleSize.width} height={this.handleSize.boxHeight} rx={RC} ry={RC} fill="url(#grad-handle-box)" />
                </g>
                <g transform={`translate(0,${this.handleSize.boxHeight})`}>
                    <path d={this.arrowPath()} fill="url(#grad-handle-arrow)"/>
                </g>
                <text x={0} y={this.handleSize.textY} style={{ textAnchor: 'middle' }}>{value}</text>
            </g>
        );
    }


    render() {
        return (
            <svg className="range-slider" width={this.props.width} height={this.props.height}>
                {this.renderGradients()}
                <g className="slider-area" transform={`translate(${this.props.padLeft},0)`}>
                    <g className="track" transform={`translate(0,${this.size.trackY})`}>
                        <rect width={this.size.trackWidth} height={this.props.trackHeight} fill="url(#grad-track)" rx={RC} ry={RC} />
                        <g className="bar" transform={`translate(${this.currentLowRange},${this.size.barY})`}>
                            <rect width={this.currentHighRange - this.currentLowRange} height={this.size.barHeight} fill="url(#grad-bar)" rx={RC} ry={RC} />
                        </g>
                        <text className="tick" x={5} y={this.props.trackHeight - 7} style={{ textAnchor: 'start' }}>{this.scale.domain()[0]}</text>
                        <text className="tick" x={this.size.trackWidth - 5} y={this.props.trackHeight - 7} style={{ textAnchor: 'end' }}>{this.scale.domain()[1]}</text>
                    </g>
                    {this.renderHandle('left', this.currentLowRange)}
                    {this.renderHandle('right', this.currentHighRange)}
                </g>
            </svg>
        );
    }
};
